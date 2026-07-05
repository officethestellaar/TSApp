import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { emitEvent } from '../lib/socket';

const router = express.Router();

const ALL_ADMINS = ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'HOUSEKEEPING_SUPERVISOR', 'SALON_MANAGER', 'RESTAURANT_MANAGER', 'RECEPTIONIST'];

router.get('/', authenticateToken, authorizeRoles(...ALL_ADMINS), async (req: any, res) => {
  try {
    const leaves = await prisma.staffLeave.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/my', authenticateToken, async (req: any, res) => {
  try {
    const leaves = await prisma.staffLeave.findMany({
      where: { userId: req.user.userId },
      include: {
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/balances', authenticateToken, async (req: any, res) => {
  try {
    let balance = await prisma.leaveBalance.findUnique({
      where: { userId: req.user.userId },
    });
    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: {
          userId: req.user.userId,
          year: new Date().getFullYear(),
        },
      });
    }
    res.json(balance);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const userId = req.user.userId;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const leave = await prisma.staffLeave.create({
      data: { userId, leaveType, startDate: start, endDate: end, reason },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    emitEvent('staff_leave', { action: 'APPLIED', leave: { id: leave.id, userId: leave.userId, status: leave.status } });
    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id/review', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req: any, res) => {
  try {
    const leaveId = Number(req.params.id);
    const { status, reviewNotes } = req.body;
    const reviewerId = req.user.userId;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be APPROVED or REJECTED' });
    }

    const existing = await prisma.staffLeave.findUnique({ where: { id: leaveId } });
    if (!existing) return res.status(404).json({ message: 'Leave application not found' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ message: 'Leave has already been reviewed' });
    }

    const leave = await prisma.staffLeave.update({
      where: { id: leaveId },
      data: { status, reviewNotes, reviewedById: reviewerId, reviewedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    emitEvent('staff_leave', { action: status === 'APPROVED' ? 'APPROVED' : 'REJECTED', leave: { id: leave.id, userId: leave.userId, status: leave.status } });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/balances/all', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req: any, res) => {
  try {
    const balances = await prisma.leaveBalance.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { year: 'desc' },
    });
    res.json(balances);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/balances/:userId', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req: any, res) => {
  try {
    const userId = Number(req.params.userId);
    const { earnedLeave, sickLeave, casualLeave, year } = req.body;

    const data: any = {};
    if (earnedLeave !== undefined) data.earnedLeave = earnedLeave;
    if (sickLeave !== undefined) data.sickLeave = sickLeave;
    if (casualLeave !== undefined) data.casualLeave = casualLeave;
    if (year !== undefined) data.year = year;

    const balance = await prisma.leaveBalance.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        earnedLeave: earnedLeave ?? 0,
        sickLeave: sickLeave ?? 0,
        casualLeave: casualLeave ?? 0,
        year: year ?? new Date().getFullYear(),
      },
    });

    res.json(balance);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
