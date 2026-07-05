"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const qrcode_1 = __importDefault(require("qrcode"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const multer_1 = __importDefault(require("multer"));
const xlsx = __importStar(require("xlsx"));
const audit_1 = require("../lib/audit");
const cache_1 = require("../lib/cache");
const json2csv_1 = require("json2csv");
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// Multer setup for file upload (Memory for bulk import)
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
// Disk storage for permanent payment proofs
const proofStorage = multer_1.default.diskStorage({
    destination: 'uploads/member-proofs/',
    filename: (req, file, cb) => {
        cb(null, `proof-${Date.now()}${path_1.default.extname(file.originalname)}`);
    }
});
const uploadProof = (0, multer_1.default)({ storage: proofStorage });
// Export Members as CSV
router.get('/export/csv', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), async (req, res) => {
    try {
        const members = await prisma_1.default.member.findMany({
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
        const json2csvParser = new json2csv_1.Parser({ fields });
        const csv = json2csvParser.parse(members);
        res.header('Content-Type', 'text/csv');
        res.attachment(`stellaar-members-${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    }
    catch (error) {
        console.error('Member export error:', error);
        res.status(500).json({ message: 'Failed to generate member export protocol' });
    }
});
// Bulk Import Members via Excel
router.post('/bulk-import', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        const results = {
            total: data.length,
            imported: 0,
            skipped: 0,
            errors: []
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
                const existingMember = await prisma_1.default.member.findUnique({
                    where: { membershipNumber: serialNumber }
                });
                if (existingMember) {
                    results.skipped++;
                    results.errors.push(`Serial Number ${serialNumber} already exists. Skipping.`);
                    continue;
                }
                // Check for other unique constraints
                const existingOther = await prisma_1.default.member.findFirst({
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
                await prisma_1.default.member.create({
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
            }
            catch (err) {
                results.skipped++;
                results.errors.push(`Error processing row: ${err.message}`);
            }
        }
        if (results.imported > 0) {
            await (0, audit_1.createAuditLog)({
                action: 'BULK_IMPORT',
                entityType: 'MEMBER',
                description: `Imported ${results.imported} members from Excel sheet.`,
                newData: { importedCount: results.imported, skippedCount: results.skipped },
                user: {
                    userId: req.user.userId,
                    name: req.user.name,
                    role: req.user.role
                }
            });
        }
        (0, cache_1.clearCachePattern)('report_');
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
});
// Register new member
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'RECEPTIONIST'), uploadProof.single('proof'), async (req, res) => {
    try {
        const inputData = req.body.data ? (typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data) : req.body;
        const { familyMembers, ...memberData } = inputData;
        // Link uploaded proof if exists
        if (req.file) {
            memberData.paymentProofUrl = `/uploads/member-proofs/${req.file.filename}`;
        }
        // Auto-generate membership number if not provided
        if (!memberData.membershipNumber) {
            const count = await prisma_1.default.member.count();
            memberData.membershipNumber = `STEL-${1000 + count + 1}-1`;
        }
        else if (!memberData.membershipNumber.endsWith('-1')) {
            // Ensure it ends with -1 if it's the main user
            memberData.membershipNumber = `${memberData.membershipNumber}-1`;
        }
        // Hash password if provided
        if (memberData.password) {
            memberData.password = await bcryptjs_1.default.hash(memberData.password, 10);
        }
        else {
            // Phase 3 Refinement: Provision initial digital identity with default security node
            memberData.password = await bcryptjs_1.default.hash('TheStellaarMember', 10);
        }
        // Convert date strings to Date objects
        if (memberData.dob)
            memberData.dob = new Date(memberData.dob);
        if (memberData.startDate)
            memberData.startDate = new Date(memberData.startDate);
        if (memberData.expiryDate)
            memberData.expiryDate = new Date(memberData.expiryDate);
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
        }
        else if (memberData.category === 'BLUE') {
            memberData.tenure = '1_YEAR';
            memberData.amcApplicable = false;
            memberData.amcStatus = 'PAID';
            memberData.amcYear = currentYear;
            const exp = new Date(memberData.startDate || new Date());
            exp.setFullYear(exp.getFullYear() + 1);
            memberData.expiryDate = exp;
        }
        else if (memberData.category === 'SILVER') {
            memberData.tenure = '3_YEAR'; // 2 AMCs = 3 Years
            memberData.amcApplicable = true;
            memberData.amcStatus = 'PAID'; // First year is included in registration
            memberData.amcYear = currentYear;
            const exp = new Date(memberData.startDate || new Date());
            exp.setFullYear(exp.getFullYear() + 3);
            memberData.expiryDate = exp;
            if (!memberData.amcAmount)
                memberData.amcAmount = 2500; // Default Silver AMC
        }
        else if (memberData.category === 'GOLD') {
            memberData.tenure = '5_YEAR'; // 4 AMCs = 5 Years
            memberData.amcApplicable = true;
            memberData.amcStatus = 'PAID'; // First year is included in registration
            memberData.amcYear = currentYear;
            const exp = new Date(memberData.startDate || new Date());
            exp.setFullYear(exp.getFullYear() + 5);
            memberData.expiryDate = exp;
            if (!memberData.amcAmount)
                memberData.amcAmount = 5000; // Default Gold AMC
        }
        // Phase 4: Identity Conflict Pre-emption
        const identityConflict = await prisma_1.default.member.findFirst({
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
            if (identityConflict.aadhaarNumber === memberData.aadhaarNumber)
                node = 'Aadhaar Identification';
            else if (identityConflict.mobileNumber === memberData.mobileNumber)
                node = 'Primary Mobile';
            else if (identityConflict.email === memberData.email)
                node = 'Email Address';
            return res.status(400).json({
                message: `CONFLICT: ${node} already exists in the registry.`,
                node
            });
        }
        // Enforce Family Member Limit (Max 3 family members, 4 people total)
        if (familyMembers && familyMembers.length > 3) {
            return res.status(400).json({ message: 'LIMIT_REACHED: Only up to 3 family members can be added (4 members in total).' });
        }
        const member = await prisma_1.default.member.create({
            data: {
                ...memberData,
                familyMembers: {
                    create: (familyMembers || []).map((fm) => ({
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
        await (0, audit_1.createAuditLog)({
            action: 'MEMBER_REGISTERED',
            entityType: 'MEMBER',
            entityId: member.membershipNumber,
            description: `New member ${member.nameAsAadhaar} enrolled under ${member.category} tier.`,
            user: {
                userId: req.user.userId,
                name: req.user.name,
                role: req.user.role
            }
        });
        (0, cache_1.clearCachePattern)('report_');
        res.status(201).json(member);
    }
    catch (error) {
        console.error('Member creation error:', error);
        res.status(400).json({ message: error.message || 'Failed to create member' });
    }
});
// List members
router.get('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'HOUSEKEEPING_SUPERVISOR', 'RECEPTIONIST'), async (req, res) => {
    try {
        const { status, search } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { nameAsAadhaar: { contains: String(search), mode: 'insensitive' } },
                { membershipNumber: { contains: String(search) } },
                { mobileNumber: { contains: String(search) } },
            ];
        }
        const members = await prisma_1.default.member.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { familyMembers: true } } }
        });
        res.json(members);
    }
    catch (error) {
        console.error('Member search/list error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get current member profile
router.get('/me', auth_1.authenticateToken, async (req, res) => {
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
        const member = await prisma_1.default.member.findUnique({
            where: { id: userId },
            include: { familyMembers: true },
        });
        if (!member)
            return res.status(404).json({ message: 'Member profile not found' });
        if (affiliateId) {
            const affiliate = await prisma_1.default.familyMember.findUnique({
                where: { id: Number(affiliateId) }
            });
            return res.json({
                ...member,
                affiliateProfile: affiliate
            });
        }
        res.json(member);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get member detail
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        const memberId = Number(req.params.id);
        // RLS Check
        if (role === 'MEMBER' && memberId !== userId) {
            return res.status(403).json({ message: 'Access denied to this identity node' });
        }
        const member = await prisma_1.default.member.findUnique({
            where: { id: memberId },
            include: { familyMembers: true },
        });
        if (!member)
            return res.status(404).json({ message: 'Member not found' });
        res.json(member);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update current member's own profile (Personal Nodes)
router.patch('/me/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.user.userId;
        // @ts-ignore
        const role = req.user.role;
        if (role !== 'MEMBER') {
            return res.status(403).json({ message: 'Only members can update their own profile' });
        }
        // Allowed fields for self-update (Personal Nodes)
        const { fatherHusbandName, gender, dob, bloodGroup, occupation, companyName, designation, residentialAddress, city, state, pincode, nationality, emergencyContactName, emergencyContactNumber } = req.body;
        const updateData = {};
        if (fatherHusbandName)
            updateData.fatherHusbandName = fatherHusbandName;
        if (gender)
            updateData.gender = gender;
        if (dob)
            updateData.dob = new Date(dob);
        if (bloodGroup)
            updateData.bloodGroup = bloodGroup;
        if (occupation)
            updateData.occupation = occupation;
        if (companyName)
            updateData.companyName = companyName;
        if (designation)
            updateData.designation = designation;
        if (residentialAddress)
            updateData.residentialAddress = residentialAddress;
        if (city)
            updateData.city = city;
        if (state)
            updateData.state = state;
        if (pincode)
            updateData.pincode = pincode;
        if (nationality)
            updateData.nationality = nationality;
        if (emergencyContactName)
            updateData.emergencyContactName = emergencyContactName;
        if (emergencyContactNumber)
            updateData.emergencyContactNumber = emergencyContactNumber;
        const member = await prisma_1.default.member.update({
            where: { id: userId },
            data: updateData
        });
        await (0, audit_1.createAuditLog)({
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
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to update profile' });
    }
});
// Member: Request to add a family member
router.post('/me/family-request', auth_1.authenticateToken, async (req, res) => {
    try {
        const memberId = req.user?.userId;
        const role = req.user?.role;
        if (role !== 'MEMBER' || !memberId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const { name, relation, dob, gender, email, mobileNumber } = req.body;
        // Check existing count (including pending requests)
        const existingFamily = await prisma_1.default.familyMember.findMany({
            where: { memberId }
        });
        if (existingFamily.length >= 3) {
            return res.status(400).json({ message: 'LIMIT_REACHED: You have reached the maximum allowed family members (3).' });
        }
        const member = await prisma_1.default.member.findUnique({ where: { id: memberId } });
        if (!member)
            return res.status(404).json({ message: 'Member not found' });
        const baseId = member.membershipNumber.replace('-1', '');
        const suffix = existingFamily.length + 2; // Start from -2
        const membershipNumber = `${baseId}-${suffix}`;
        const familyMember = await prisma_1.default.familyMember.create({
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
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to submit request' });
    }
});
// Admin: Get all pending unenrollment requests
router.get('/unenroll-requests/pending', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'HOUSEKEEPING_SUPERVISOR'), async (req, res) => {
    try {
        const requests = await prisma_1.default.unenrollmentRequest.findMany({
            where: { status: 'PENDING' },
            include: { member: { select: { nameAsAadhaar: true, membershipNumber: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Admin: Get all pending family member requests
router.get('/family-requests/pending', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'HOUSEKEEPING_SUPERVISOR'), async (req, res) => {
    try {
        const requests = await prisma_1.default.familyMember.findMany({
            where: { status: 'PENDING' },
            include: { member: { select: { nameAsAadhaar: true, membershipNumber: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Admin: Approve or Reject family member request
router.patch('/family-requests/:id/process', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'HOUSEKEEPING_SUPERVISOR'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body; // 'APPROVED' or 'REJECTED'
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const familyMember = await prisma_1.default.familyMember.findUnique({
            where: { id },
            include: { member: true }
        });
        if (!familyMember)
            return res.status(404).json({ message: 'Request not found' });
        let updatedData = { status };
        // If approved, set a default password
        if (status === 'APPROVED') {
            const bcrypt = require('bcryptjs');
            const defaultPassword = `TheStellaarAffiliate_${familyMember.id}`;
            updatedData.password = await bcrypt.hash(defaultPassword, 10);
        }
        const updated = await prisma_1.default.familyMember.update({
            where: { id },
            data: updatedData
        });
        res.json({ message: `Request ${status.toLowerCase()} successfully`, updated });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to process request' });
    }
});
// Add family member (Staff Only)
router.post('/:id/family', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'RECEPTIONIST'), async (req, res) => {
    try {
        const memberId = Number(req.params.id);
        const familyMemberData = req.body;
        // Check existing count
        const existingFamily = await prisma_1.default.familyMember.findMany({
            where: { memberId }
        });
        if (existingFamily.length >= 3) {
            return res.status(400).json({ message: 'LIMIT_REACHED: This member already has the maximum of 3 family members (4 total people).' });
        }
        const member = await prisma_1.default.member.findUnique({ where: { id: memberId } });
        if (!member)
            return res.status(404).json({ message: 'Member not found' });
        const baseId = member.membershipNumber.replace('-1', '');
        const suffix = existingFamily.length + 2; // Start from -2
        const membershipNumber = `${baseId}-${suffix}`;
        const familyMember = await prisma_1.default.familyMember.create({
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
        await prisma_1.default.familyMember.update({
            where: { id: familyMember.id },
            data: { password: hashedPassword }
        });
        await (0, audit_1.createAuditLog)({
            action: 'ADD_FAMILY_MEMBER',
            entityType: 'MEMBER',
            entityId: member?.membershipNumber || String(memberId),
            description: `Added family member ${familyMember.name} (${familyMember.relation}) to member ${member?.nameAsAadhaar}.`,
            user: {
                userId: req.user.userId,
                name: req.user.name,
                role: req.user.role
            }
        });
        res.status(201).json(familyMember);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to add family member' });
    }
});
// Update member status
router.patch('/:id/status', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const { status } = req.body;
        const id = Number(req.params.id);
        const oldMember = await prisma_1.default.member.findUnique({ where: { id } });
        const member = await prisma_1.default.member.update({
            where: { id },
            data: { status },
        });
        await (0, audit_1.createAuditLog)({
            action: 'UPDATE_STATUS',
            entityType: 'MEMBER',
            entityId: String(id),
            description: `Updated status for ${member.nameAsAadhaar} from ${oldMember?.status} to ${status}.`,
            oldData: { status: oldMember?.status },
            newData: { status: member.status },
            user: {
                userId: req.user.userId,
                name: req.user.name,
                role: req.user.role
            }
        });
        (0, cache_1.clearCachePattern)('report_');
        res.json(member);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update member status' });
    }
});
// Generate QR Code for a member
router.get('/:id/qr', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        const memberId = Number(req.params.id);
        // RLS Check
        if (role === 'MEMBER' && memberId !== userId) {
            return res.status(403).json({ message: 'Access denied to this identity node' });
        }
        const member = await prisma_1.default.member.findUnique({
            where: { id: memberId },
            select: { membershipNumber: true, nameAsAadhaar: true }
        });
        if (!member)
            return res.status(404).json({ message: 'Member not found' });
        const qrData = JSON.stringify({
            type: 'PRIMARY',
            id: String(memberId),
            mId: member.membershipNumber,
            name: member.nameAsAadhaar
        });
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(qrData);
        res.json({ qrCodeDataUrl });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Generate QR Code for a family member
router.get('/family/:id/qr', auth_1.authenticateToken, async (req, res) => {
    try {
        const familyMember = await prisma_1.default.familyMember.findUnique({
            where: { id: Number(req.params.id) },
            include: { member: { select: { membershipNumber: true } } }
        });
        if (!familyMember)
            return res.status(404).json({ message: 'Family member not found' });
        const qrData = JSON.stringify({
            type: 'FAMILY',
            id: familyMember.id,
            pId: familyMember.memberId,
            mId: familyMember.member.membershipNumber,
            name: familyMember.name,
            relation: familyMember.relation
        });
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(qrData);
        res.json({ qrCodeDataUrl });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Remove/Delete member
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        // Delete associated records first (Prisma handles cascading if configured, 
        // but we'll do it manually to be safe if not)
        await prisma_1.default.$transaction([
            prisma_1.default.orderItem.deleteMany({ where: { order: { memberId: id } } }),
            prisma_1.default.order.deleteMany({ where: { memberId: id } }),
            prisma_1.default.invoiceItem.deleteMany({ where: { invoice: { memberId: id } } }),
            prisma_1.default.invoice.deleteMany({ where: { memberId: id } }),
            prisma_1.default.accessLog.deleteMany({ where: { memberId: id } }),
            prisma_1.default.familyMember.deleteMany({ where: { memberId: id } }),
            prisma_1.default.complaint.deleteMany({ where: { memberId: id } }),
            prisma_1.default.member.delete({ where: { id } }),
        ]);
        // Log member removal
        await (0, audit_1.createAuditLog)({
            action: 'MEMBER_REMOVED',
            entityType: 'MEMBER',
            entityId: String(id),
            description: `Member node and all historical data purged from registry.`,
            user: {
                userId: req.user.userId,
                name: req.user.name,
                role: req.user.role
            }
        });
        (0, cache_1.clearCachePattern)('report_');
        res.json({ message: 'Member and all associated records removed successfully' });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to remove member' });
    }
});
// Submit unenrollment request
router.post('/me/unenroll', auth_1.authenticateToken, async (req, res) => {
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
        const member = await prisma_1.default.member.findUnique({ where: { id: userId } });
        if (!member)
            return res.status(404).json({ message: 'Member not found' });
        // Check if there is already a pending request
        const existingRequest = await prisma_1.default.unenrollmentRequest.findFirst({
            where: { memberId: userId, status: 'PENDING' }
        });
        if (existingRequest) {
            return res.status(400).json({ message: 'An unenrollment request is already pending for this member' });
        }
        const request = await prisma_1.default.unenrollmentRequest.create({
            data: {
                memberId: userId,
                reason,
                status: 'PENDING'
            }
        });
        await (0, audit_1.createAuditLog)({
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
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to submit unenrollment request' });
    }
});
exports.default = router;
