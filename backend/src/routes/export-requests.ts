import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { emitEvent } from '../lib/socket';

const router = express.Router();

// Create export request (any authenticated user)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { page, reason, params } = req.body;
    if (!page || !reason) {
      return res.status(400).json({ message: 'Page and reason are required.' });
    }

    const request = await prisma.exportRequest.create({
      data: {
        userId: req.user!.userId,
        page,
        reason,
        params: params ? JSON.stringify(params) : null,
      },
    });

    emitEvent('new_export_request', {
      requestId: request.id,
      userName: req.user!.name,
      page,
      reason,
      createdAt: request.createdAt,
    }, { role: 'SUPER_ADMIN' });

    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to create export request' });
  }
});

// Get pending requests (SUPER_ADMIN only)
router.get('/pending', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const requests = await prisma.exportRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to fetch requests' });
  }
});

// Get my requests (any user)
router.get('/my', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const requests = await prisma.exportRequest.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to fetch requests' });
  }
});

// Approve request (SUPER_ADMIN only)
router.patch('/:id/approve', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID.' });

    const request = await prisma.exportRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

    emitEvent('export_request_approved', {
      requestId: request.id,
      page: request.page,
    }, { userId: request.userId });

    res.json({ message: 'Export request approved.' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to approve request' });
  }
});

// Reject request (SUPER_ADMIN only)
router.patch('/:id/reject', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID.' });

    const request = await prisma.exportRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectedAt: new Date() },
    });

    emitEvent('export_request_rejected', {
      requestId: request.id,
      page: request.page,
    }, { userId: request.userId });

    res.json({ message: 'Export request rejected.' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to reject request' });
  }
});

export default router;
