import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { createAuditLog } from '../lib/audit';
import { clearCachePattern } from '../lib/cache';
import { Parser } from 'json2csv';
import path from 'path';

const router = express.Router();

// Multer setup for file upload (Memory for bulk import)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Disk storage for permanent payment proofs
const proofStorage = multer.diskStorage({
  destination: 'uploads/member-proofs/',
  filename: (req, file, cb) => {
    cb(null, `proof-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const uploadProof = multer({ storage: proofStorage });

// Export Members as CSV
router.get('/export/csv', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      select: {
        membershipNumber: true,
        nameAsAadhaar: true,
        category: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const fields = [
      { label: 'Member ID', value: 'membershipNumber' },
      { label: 'Member Name', value: 'nameAsAadhaar' },
      { label: 'Membership Tier', value: 'category' },
      { label: 'Account Status', value: 'status' },
      { label: 'Enrolled On', value: 'createdAt' }
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(members);

    res.header('Content-Type', 'text/csv');
    res.attachment(`stellaar-members-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error: any) {
    console.error('Member export error:', error);
    res.status(500).json({ message: 'Failed to generate member export protocol' });
  }
});

// Bulk Import Members via Excel
router.post('/bulk-import', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    const results = {
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const row of data) {
      try {
        const serialNumber = String(row['SERIAL NUMBER'] || row['SerialNumber'] || '').trim();
        const fullName = String(row['Full name'] || row['FullName'] || '').trim();
        const mobileNo = String(row['Mobile no'] || row['MobileNo'] || '').trim();
        const email = String(row['email'] || row['Email'] || '').trim();
        const dob = row['DOB'];
        const tier = String(row['MEMBERSHIP TIER'] || row['Tier'] || 'GOLD').trim();
        const address = String(row['Address'] || '').trim();
        const aadhaarNo = String(row['AADHAAR NO'] || row['AadhaarNo'] || '').trim();

        if (!serialNumber || !fullName) {
          results.skipped++;
          results.errors.push(`Row missing Serial Number or Full Name: ${JSON.stringify(row)}`);
          continue;
        }

        // Check for duplicate serial number
        const existingMember = await prisma.member.findUnique({
          where: { membershipNumber: serialNumber }
        });

        if (existingMember) {
          results.skipped++;
          results.errors.push(`Serial Number ${serialNumber} already exists. Skipping.`);
          continue;
        }

        // Check for other unique constraints
        const existingOther = await prisma.member.findFirst({
          where: {
            OR: [
              { mobileNumber: mobileNo },
              { aadhaarNumber: aadhaarNo },
              ...(email ? [{ email }] : [])
            ]
          }
        });

        if (existingOther) {
          results.skipped++;
          results.errors.push(`Member with Mobile/Aadhaar/Email already exists for ${fullName}. Skipping.`);
          continue;
        }

        const today = new Date();
        const expiry = new Date();
        expiry.setFullYear(today.getFullYear() + 1);

        const amcNotRequired = tier.toUpperCase() === 'BLUE';

        await prisma.member.create({
          data: {
            membershipNumber: serialNumber,
            category: tier,
            tenure: '1_YEAR',
            nameAsAadhaar: fullName,
            fatherHusbandName: 'Not Provided',
            gender: 'Not Provided',
            dob: dob ? new Date(dob) : new Date('1990-01-01'),
            maritalStatus: 'Not Provided',
            occupation: 'Not Provided',
            aadhaarNumber: aadhaarNo || `TEMP-${serialNumber}`,
            mobileNumber: mobileNo || `TEMP-${serialNumber}`,
            email: email || null,
            residentialAddress: address || 'Not Provided',
            city: 'Not Provided',
            state: 'Not Provided',
            pincode: '000000',
            nationality: 'INDIAN',
            bloodGroup: 'Not Provided',
            emergencyContactName: 'Not Provided',
            emergencyContactNumber: '0000000000',
            offerPrice: 0,
            membershipFee: 0,
            registrationFee: 0,
            discountAmount: 0,
            netAmount: 0,
            gstAmount: 0,
            totalAmount: 0,
            paymentMode: 'OFFLINE',
            startDate: today,
            expiryDate: expiry,
            status: 'APPROVED',
            amcApplicable: !amcNotRequired,
            amcStatus: amcNotRequired ? 'PAID' : 'UNPAID',
            accessStatus: 'ENABLED',
          }
        });

        results.imported++;
      } catch (err: any) {
        results.skipped++;
        results.errors.push(`Error processing row: ${err.message}`);
      }
    }

    if (results.imported > 0) {
      await createAuditLog({
        action: 'BULK_IMPORT',
        entityType: 'MEMBER',
        description: `Imported ${results.imported} members from Excel sheet.`,
        newData: { importedCount: results.imported, skippedCount: results.skipped },
        user: {
          userId: (req as any).user.userId,
          name: (req as any).user.name,
          role: (req as any).user.role
        }
      });
    }

    clearCachePattern('report_');

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Register new member
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'RECEPTIONIST'), uploadProof.single('proof'), async (req, res) => {
  try {
    const inputData = req.body.data ? (typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data) : req.body;
    const { familyMembers, ...memberData } = inputData;

    // Link uploaded proof if exists
    if (req.file) {
      memberData.paymentProofUrl = `/uploads/member-proofs/${req.file.filename}`;
    }

    // Auto-generate membership number if not provided
    if (!memberData.membershipNumber) {
      const count = await prisma.member.count();
      memberData.membershipNumber = `STEL-${1000 + count + 1}-1`;
    } else if (!memberData.membershipNumber.endsWith('-1')) {
      // Ensure it ends with -1 if it's the main user
      memberData.membershipNumber = `${memberData.membershipNumber}-1`;
    }

    // Hash password if provided
    if (memberData.password) {
      memberData.password = await bcrypt.hash(memberData.password, 10);
    } else {
      // Phase 3 Refinement: Provision initial digital identity with default security node
      memberData.password = await bcrypt.hash('TheStellaarMember', 10);
    }

    // Convert date strings to Date objects
    if (memberData.dob) memberData.dob = new Date(memberData.dob);
    if (memberData.startDate) memberData.startDate = new Date(memberData.startDate);
    if (memberData.expiryDate) memberData.expiryDate = new Date(memberData.expiryDate);

    // Ensure numeric fields are numbers
    const numericFields = [
      'offerPrice', 'membershipFee', 'registrationFee', 
      'discountAmount', 'netAmount', 'gstAmount', 'totalAmount'
    ];
    numericFields.forEach(field => {
      if (memberData[field] !== undefined) {
        memberData[field] = Number(memberData[field]);
      }
    });

    // Tier-Specific Business Rules (Phase 2 Refinement)
    const currentYear = String(new Date().getFullYear());
    
    if (memberData.category === 'DAY_VISITOR') {
      memberData.tenure = '1_DAY';
      memberData.amcApplicable = false;
      memberData.amcStatus = 'PAID';
      memberData.amcYear = currentYear;
      
      const exp = new Date(memberData.startDate || new Date());
      exp.setHours(exp.getHours() + 24);
      memberData.expiryDate = exp;
    } else if (memberData.category === 'BLUE') {
      memberData.tenure = '1_YEAR';
      memberData.amcApplicable = false;
      memberData.amcStatus = 'PAID'; 
      memberData.amcYear = currentYear;
      
      const exp = new Date(memberData.startDate || new Date());
      exp.setFullYear(exp.getFullYear() + 1);
      memberData.expiryDate = exp;
    } else if (memberData.category === 'SILVER') {
      memberData.tenure = '3_YEAR'; // 2 AMCs = 3 Years
      memberData.amcApplicable = true;
      memberData.amcStatus = 'PAID'; // First year is included in registration
      memberData.amcYear = currentYear;
      
      const exp = new Date(memberData.startDate || new Date());
      exp.setFullYear(exp.getFullYear() + 3);
      memberData.expiryDate = exp;
      
      if (!memberData.amcAmount) memberData.amcAmount = 2500; // Default Silver AMC
    } else if (memberData.category === 'GOLD') {
      memberData.tenure = '5_YEAR'; // 4 AMCs = 5 Years
      memberData.amcApplicable = true;
      memberData.amcStatus = 'PAID'; // First year is included in registration
      memberData.amcYear = currentYear;
      
      const exp = new Date(memberData.startDate || new Date());
      exp.setFullYear(exp.getFullYear() + 5);
      memberData.expiryDate = exp;
      
      if (!memberData.amcAmount) memberData.amcAmount = 5000; // Default Gold AMC
    }

    // Phase 4: Identity Conflict Pre-emption
    const identityConflict = await prisma.member.findFirst({
      where: {
        OR: [
          { aadhaarNumber: memberData.aadhaarNumber },
          { mobileNumber: memberData.mobileNumber },
          { email: memberData.email }
        ]
      }
    });

    if (identityConflict) {
      let node = 'Identity Node';
      if (identityConflict.aadhaarNumber === memberData.aadhaarNumber) node = 'Aadhaar Identification';
      else if (identityConflict.mobileNumber === memberData.mobileNumber) node = 'Primary Mobile';
      else if (identityConflict.email === memberData.email) node = 'Email Address';
      
      return res.status(400).json({ 
        message: `CONFLICT: ${node} already exists in the registry.`,
        node 
      });
    }

    // Enforce Family Member Limit (Max 3 family members, 4 people total)
    if (familyMembers && familyMembers.length > 3) {
      return res.status(400).json({ message: 'LIMIT_REACHED: Only up to 3 family members can be added (4 members in total).' });
    }

    const member = await prisma.member.create({
      data: {
        ...memberData,
        familyMembers: {
          create: (familyMembers || []).map((fm: any) => ({
            ...fm,
            dob: new Date(fm.dob)
          })),
        },
      },
      include: {
        familyMembers: true,
      },
    });

    // Log member creation
    await createAuditLog({
      action: 'MEMBER_REGISTERED',
      entityType: 'MEMBER',
      entityId: member.membershipNumber,
      description: `New member ${member.nameAsAadhaar} enrolled under ${member.category} tier.`,
      user: {
        userId: (req as any).user.userId,
        name: (req as any).user.name,
        role: (req as any).user.role
      }
    });

    clearCachePattern('report_');

    res.status(201).json(member);
  } catch (error: any) {
    console.error('Member creation error:', error);
    res.status(400).json({ message: error.message || 'Failed to create member' });
  }
});

// List members
router.get('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'HOUSEKEEPING_SUPERVISOR', 'RECEPTIONIST'), async (req, res) => {
  try {
    const { status, search } = req.query;
    const where: any = {};
    
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { nameAsAadhaar: { contains: String(search), mode: 'insensitive' } },
        { membershipNumber: { contains: String(search) } },
        { mobileNumber: { contains: String(search) } },
      ];
    }

    const members = await prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { familyMembers: true } } }
    });
    res.json(members);
  } catch (error) {
    console.error('Member search/list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current member profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user.userId;
    // @ts-ignore
    const role = req.user.role;
    // @ts-ignore
    const affiliateId = req.user.affiliateId;

    if (role !== 'MEMBER') {
      return res.status(403).json({ message: 'Only members can access this profile' });
    }

    const member = await prisma.member.findUnique({
      where: { id: userId },
      include: { familyMembers: true },
    });
    
    if (!member) return res.status(404).json({ message: 'Member profile not found' });

    if (affiliateId) {
      const affiliate = await prisma.familyMember.findUnique({
        where: { id: Number(affiliateId) }
      });
      return res.json({
        ...member,
        affiliateProfile: affiliate
      });
    }

    res.json(member);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get member detail
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const memberId = Number(req.params.id);

    // RLS Check
    if (role === 'MEMBER' && memberId !== userId) {
      return res.status(403).json({ message: 'Access denied to this identity node' });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { familyMembers: true },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update current member's own profile (Personal Nodes)
router.patch('/me/profile', authenticateToken, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user.userId;
    // @ts-ignore
    const role = req.user.role;

    if (role !== 'MEMBER') {
      return res.status(403).json({ message: 'Only members can update their own profile' });
    }

    // Allowed fields for self-update (Personal Nodes)
    const {
      fatherHusbandName, gender, dob, bloodGroup,
      occupation, companyName, designation,
      residentialAddress, city, state, pincode, nationality,
      emergencyContactName, emergencyContactNumber
    } = req.body;

    const updateData: any = {};
    if (fatherHusbandName) updateData.fatherHusbandName = fatherHusbandName;
    if (gender) updateData.gender = gender;
    if (dob) updateData.dob = new Date(dob);
    if (bloodGroup) updateData.bloodGroup = bloodGroup;
    if (occupation) updateData.occupation = occupation;
    if (companyName) updateData.companyName = companyName;
    if (designation) updateData.designation = designation;
    if (residentialAddress) updateData.residentialAddress = residentialAddress;
    if (city) updateData.city = city;
    if (state) updateData.state = state;
    if (pincode) updateData.pincode = pincode;
    if (nationality) updateData.nationality = nationality;
    if (emergencyContactName) updateData.emergencyContactName = emergencyContactName;
    if (emergencyContactNumber) updateData.emergencyContactNumber = emergencyContactNumber;

    const member = await prisma.member.update({
      where: { id: userId },
      data: updateData
    });

    await createAuditLog({
      action: 'SELF_UPDATE_PROFILE',
      entityType: 'MEMBER',
      entityId: member.membershipNumber,
      description: `Member ${member.nameAsAadhaar} updated their personal profile nodes.`,
      user: {
        userId: userId,
        name: member.nameAsAadhaar,
        role: 'MEMBER'
      }
    });

    res.json(member);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to update profile' });
  }
});

// Member: Request to add a family member
router.post('/me/family-request', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const memberId = req.user?.userId;
    const role = req.user?.role;

    if (role !== 'MEMBER' || !memberId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, relation, dob, gender, email, mobileNumber } = req.body;

    // Check existing count (including pending requests)
    const existingFamily = await prisma.familyMember.findMany({
      where: { memberId }
    });

    if (existingFamily.length >= 3) {
      return res.status(400).json({ message: 'LIMIT_REACHED: You have reached the maximum allowed family members (3).' });
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const baseId = member.membershipNumber.replace('-1', '');
    const suffix = existingFamily.length + 2; // Start from -2
    const membershipNumber = `${baseId}-${suffix}`;

    const familyMember = await prisma.familyMember.create({
      data: {
        memberId,
        membershipNumber,
        name,
        relation,
        dob: new Date(dob),
        gender,
        email,
        mobileNumber,
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'Family member request submitted successfully. Awaiting staff approval.', familyMember });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to submit request' });
  }
});

// Admin: Get all pending unenrollment requests
router.get('/unenroll-requests/pending', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'HOUSEKEEPING_SUPERVISOR'), async (req, res) => {
  try {
    const requests = await prisma.unenrollmentRequest.findMany({
      where: { status: 'PENDING' },
      include: { member: { select: { nameAsAadhaar: true, membershipNumber: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Admin: Get all pending family member requests
router.get('/family-requests/pending', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'HOUSEKEEPING_SUPERVISOR'), async (req, res) => {
  try {
    const requests = await prisma.familyMember.findMany({
      where: { status: 'PENDING' },
      include: { member: { select: { nameAsAadhaar: true, membershipNumber: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: Approve or Reject family member request
router.patch('/family-requests/:id/process', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'HOUSEKEEPING_SUPERVISOR'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const familyMember = await prisma.familyMember.findUnique({
      where: { id },
      include: { member: true }
    });

    if (!familyMember) return res.status(404).json({ message: 'Request not found' });

    let updatedData: any = { status };

    // If approved, set a default password
    if (status === 'APPROVED') {
      const bcrypt = require('bcryptjs');
      const defaultPassword = `TheStellaarAffiliate_${familyMember.id}`;
      updatedData.password = await bcrypt.hash(defaultPassword, 10);
    }

    const updated = await prisma.familyMember.update({
      where: { id },
      data: updatedData
    });

    res.json({ message: `Request ${status.toLowerCase()} successfully`, updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to process request' });
  }
});

// Add family member (Staff Only)
router.post('/:id/family', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'RECEPTIONIST'), async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const familyMemberData = req.body;

    // Check existing count
    const existingFamily = await prisma.familyMember.findMany({
      where: { memberId }
    });

    if (existingFamily.length >= 3) {
      return res.status(400).json({ message: 'LIMIT_REACHED: This member already has the maximum of 3 family members (4 total people).' });
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const baseId = member.membershipNumber.replace('-1', '');
    const suffix = existingFamily.length + 2; // Start from -2
    const membershipNumber = `${baseId}-${suffix}`;

    const familyMember = await prisma.familyMember.create({
      data: {
        ...familyMemberData,
        memberId,
        membershipNumber,
        dob: new Date(familyMemberData.dob),
        status: 'APPROVED'
      }
    });

    // If approved, set a default password
    const bcrypt = require('bcryptjs');
    const defaultPassword = `TheStellaarAffiliate_${familyMember.id}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await prisma.familyMember.update({
      where: { id: familyMember.id },
      data: { password: hashedPassword }
    });

    await createAuditLog({
      action: 'ADD_FAMILY_MEMBER',
      entityType: 'MEMBER',
      entityId: member?.membershipNumber || String(memberId),
      description: `Added family member ${familyMember.name} (${familyMember.relation}) to member ${member?.nameAsAadhaar}.`,
      user: {
        userId: (req as any).user.userId,
        name: (req as any).user.name,
        role: (req as any).user.role
      }
    });

    res.status(201).json(familyMember);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to add family member' });
  }
});

// Update member status
router.patch('/:id/status', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    const id = Number(req.params.id);

    const oldMember = await prisma.member.findUnique({ where: { id } });

    const member = await prisma.member.update({
      where: { id },
      data: { status },
    });

    await createAuditLog({
      action: 'UPDATE_STATUS',
      entityType: 'MEMBER',
      entityId: String(id),
      description: `Updated status for ${member.nameAsAadhaar} from ${oldMember?.status} to ${status}.`,
      oldData: { status: oldMember?.status },
      newData: { status: member.status },
      user: {
        userId: (req as any).user.userId,
        name: (req as any).user.name,
        role: (req as any).user.role
      }
    });

    clearCachePattern('report_');

    res.json(member);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update member status' });
  }
});


// Generate QR Code for a member
router.get('/:id/qr', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const memberId = Number(req.params.id);

    // RLS Check
    if (role === 'MEMBER' && memberId !== userId) {
      return res.status(403).json({ message: 'Access denied to this identity node' });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { membershipNumber: true, nameAsAadhaar: true }
    });
    
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const qrData = JSON.stringify({
      type: 'PRIMARY',
      id: String(memberId),
      mId: member.membershipNumber,
      name: member.nameAsAadhaar
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    res.json({ qrCodeDataUrl });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generate QR Code for a family member
router.get('/family/:id/qr', authenticateToken, async (req, res) => {
  try {
    const familyMember = await prisma.familyMember.findUnique({
      where: { id: Number(req.params.id) },
      include: { member: { select: { membershipNumber: true } } }
    });
    
    if (!familyMember) return res.status(404).json({ message: 'Family member not found' });

    const qrData = JSON.stringify({
      type: 'FAMILY',
      id: familyMember.id,
      pId: familyMember.memberId,
      mId: familyMember.member.membershipNumber,
      name: familyMember.name,
      relation: familyMember.relation
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    res.json({ qrCodeDataUrl });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove/Delete member
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Delete associated records first (Prisma handles cascading if configured, 
    // but we'll do it manually to be safe if not)
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { order: { memberId: id } } }),
      prisma.order.deleteMany({ where: { memberId: id } }),
      prisma.invoiceItem.deleteMany({ where: { invoice: { memberId: id } } }),
      prisma.invoice.deleteMany({ where: { memberId: id } }),
      prisma.accessLog.deleteMany({ where: { memberId: id } }),
      prisma.familyMember.deleteMany({ where: { memberId: id } }),
      prisma.complaint.deleteMany({ where: { memberId: id } }),
      prisma.member.delete({ where: { id } }),
    ]);

    // Log member removal
    await createAuditLog({
      action: 'MEMBER_REMOVED',
      entityType: 'MEMBER',
      entityId: String(id),
      description: `Member node and all historical data purged from registry.`,
      user: {
        userId: (req as any).user.userId,
        name: (req as any).user.name,
        role: (req as any).user.role
      }
    });

    clearCachePattern('report_');

    res.json({ message: 'Member and all associated records removed successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to remove member' });
  }
});

// Submit unenrollment request
router.post('/me/unenroll', authenticateToken, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user.userId;
    // @ts-ignore
    const role = req.user.role;

    if (role !== 'MEMBER') {
      return res.status(403).json({ message: 'Only members can request unenrollment' });
    }

    const { reason } = req.body;
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'A reason must be provided for unenrollment' });
    }

    const member = await prisma.member.findUnique({ where: { id: userId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Check if there is already a pending request
    const existingRequest = await prisma.unenrollmentRequest.findFirst({
      where: { memberId: userId, status: 'PENDING' }
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'An unenrollment request is already pending for this member' });
    }

    const request = await prisma.unenrollmentRequest.create({
      data: {
        memberId: userId,
        reason,
        status: 'PENDING'
      }
    });

    await createAuditLog({
      action: 'REQUEST_UNENROLLMENT',
      entityType: 'MEMBER',
      entityId: member.membershipNumber,
      description: `Member ${member.nameAsAadhaar} requested unenrollment. Reason: ${reason}`,
      user: {
        userId: userId,
        name: member.nameAsAadhaar,
        role: 'MEMBER'
      }
    });

    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to submit unenrollment request' });
  }
});

export default router;

