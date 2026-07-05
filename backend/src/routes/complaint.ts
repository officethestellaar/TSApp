import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { emitEvent } from '../lib/socket';

const router = express.Router();

// File a complaint
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { memberId, subject, description, category, priority } = req.body;
    const userId = req.user?.userId;
    const affiliateId = req.user?.affiliateId;
    const role = req.user?.role;

    // Determine the target member ID
    // If it's a member filing, use their own ID. If it's staff, use the provided memberId.
    const targetMemberId = role === 'MEMBER' ? userId : Number(memberId);

    if (!targetMemberId) {
      return res.status(400).json({ message: 'Target Member Node not identified.' });
    }
    
    const complaint = await prisma.complaint.create({
      data: {
        memberId: targetMemberId,
        affiliateId: role === 'MEMBER' ? (affiliateId || null) : null,
        subject,
        description,
        category,
        priority: priority || 'LOW',
      },
    });

    // Real-time notification for Admin
    emitEvent('new_complaint', {
      id: complaint.id,
      subject: complaint.subject,
      category: complaint.category
    });

    res.status(201).json(complaint);
  } catch (error) {
    res.status(400).json({ message: 'Failed to file complaint' });
  }
});

// Get complaints (Admin gets all, Member gets their own)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { memberId } = req.query;
    const where: any = {};
    
    if (memberId) where.memberId = Number(memberId);
    
    // If user is a member, only let them see their own complaints
    if (req.user?.role === 'MEMBER') {
      where.memberId = req.user.userId;
      where.affiliateId = req.user.affiliateId || null;
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: { 
        member: { select: { nameAsAadhaar: true, membershipNumber: true } },
        _count: { select: { messages: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single complaint with messages
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const complaintId = Number(req.params.id);

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        member: { select: { nameAsAadhaar: true, membershipNumber: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // RLS Check
    if (role === 'MEMBER' && (complaint.memberId !== userId || complaint.affiliateId !== (req.user?.affiliateId || null))) {
      return res.status(403).json({ message: 'Access denied to this concierge node' });
    }

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update complaint status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await prisma.complaint.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });

    emitEvent('complaint_status_updated', {
      id: complaint.id,
      status: complaint.status
    });

    res.json(complaint);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update complaint' });
  }
});

// Post a message to a complaint (Chat)
router.post('/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const complaintId = Number(req.params.id);
    const userId = req.user?.userId;
    const role = req.user?.role;
    const name = req.user?.name || 'User';

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const message = await prisma.message.create({
      data: {
        complaintId,
        senderType: role === 'MEMBER' ? 'MEMBER' : 'STAFF',
        senderId: userId,
        senderName: name,
        content,
      },
    });

    // Notify other party via socket
    emitEvent('new_message', {
      complaintId,
      message,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ message: 'Failed to send message' });
  }
});

export default router;
