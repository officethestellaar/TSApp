import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { emitEvent } from '../lib/socket';

const router = express.Router();

// Biometric Device Webhook
router.post('/webhook', async (req, res) => {
  try {
    const { biometricId, memberId, deviceIp, deviceLocation, accessType = 'ENTRY' } = req.body;

    // Find member by ID or Biometric ID
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { id: memberId ? Number(memberId) : undefined },
          { membershipNumber: memberId }, // Allow membership number too
          { familyMembers: { some: { biometricId: biometricId } } },
          // Note: In real app, we'd need to map biometric ID correctly
        ],
      },
    });

    if (!member) {
      return res.status(404).json({ allowed: false, reason: 'Member not found' });
    }

    let isAllowed = true;
    let denialReason = null;

    if (member.status !== 'APPROVED') {
      isAllowed = false;
      denialReason = 'Membership not approved';
    } else if (member.amcStatus !== 'PAID' && member.amcApplicable) {
      isAllowed = false;
      denialReason = 'AMC Payment Pending';
    } else if (member.accessStatus === 'DISABLED') {
      isAllowed = false;
      denialReason = 'Access manually disabled';
    } else if (member.isBlacklisted) {
      isAllowed = false;
      denialReason = 'Member Blacklisted';
    }

    // Log the access attempt
    const log = await prisma.accessLog.create({
      data: {
        memberId: member.id,
        deviceIp,
        deviceLocation,
        accessType,
        isAllowed,
        denialReason,
      },
    });

    // Update last access timestamp for the member
    if (isAllowed) {
      await prisma.member.update({
        where: { id: member.id },
        data: { lastAccess: new Date() },
      });
    }

    // Real-time notification for Security Dashboard
    emitEvent('new_access_log', { 
      memberName: member.nameAsAadhaar, 
      location: deviceLocation, 
      type: accessType, 
      isAllowed,
      denialReason
    });

    res.json({ allowed: isAllowed, reason: denialReason, memberName: member.nameAsAadhaar });
  } catch (error) {
    console.error('Access control error:', error);
    res.status(500).json({ allowed: false, reason: 'Internal server error' });
  }
});

// Get access logs (for Admin dashboard)
router.get('/logs', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const logs = await prisma.accessLog.findMany({
      include: { member: { select: { nameAsAadhaar: true, membershipNumber: true } } },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
