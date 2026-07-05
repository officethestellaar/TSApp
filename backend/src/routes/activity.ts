import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { emitEvent } from '../lib/socket';
import { sendNewActivityEmail } from '../lib/email';

const router = express.Router();
const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'RECEPTIONIST'];

// Get all activities with current booking status
router.get('/', authenticateToken, async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      include: {
        _count: {
          select: { reservations: { where: { status: 'CONFIRMED' } } }
        }
      },
      orderBy: { startTime: 'desc' }
    });
    
    // Automatically deactivate events if their end time has passed
    const now = new Date();
    const updatedActivities = await Promise.all(activities.map(async (activity) => {
      if (new Date(activity.endTime) < now && activity.status !== 'COMPLETED') {
        const updated = await prisma.activity.update({
          where: { id: activity.id },
          data: { status: 'COMPLETED' },
          include: {
            _count: {
              select: { reservations: { where: { status: 'CONFIRMED' } } }
            }
          }
        });
        return updated;
      }
      return activity;
    }));

    res.json(updatedActivities);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new activity (STAFF ONLY)
router.post('/', authenticateToken, authorizeRoles(...STAFF_ROLES), async (req, res) => {
  try {
    const activity = await prisma.activity.create({
      data: {
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        timer: req.body.timer ? new Date(req.body.timer) : null
      }
    });

    emitEvent('activity_update', { action: 'CREATED', activity });

    // Create a system announcement for the new curation
    await prisma.announcement.create({
      data: {
        title: `New Curation: ${activity.name}`,
        content: `A new estate activity "${activity.name}" has been scheduled at ${activity.location}. Details: ${activity.description}`,
        targetAudience: 'ALL',
        createdById: (req as any).user.userId
      }
    });

    emitEvent('new_announcement', {
      title: `New Curation: ${activity.name}`,
      targetAudience: 'ALL',
      createdAt: new Date()
    });

    // Send email to all active members
    try {
      const activeMembers = await prisma.member.findMany({
        where: { isActive: true, email: { not: null } },
        select: { email: true }
      });
      const memberEmails = activeMembers.map(m => m.email as string).filter(e => e.trim() !== '');
      if (memberEmails.length > 0) {
        // Send asynchronously to not block the response
        sendNewActivityEmail(memberEmails, activity.name, activity.description, activity.startTime).catch(console.error);
      }
    } catch (emailError) {
      console.error('Error fetching members for activity email:', emailError);
    }

    res.status(201).json(activity);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to create curation' });
  }
});

// Update activity (STAFF ONLY)
router.patch('/:id', authenticateToken, authorizeRoles(...STAFF_ROLES), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = { ...req.body };
    if (data.startTime) data.startTime = new Date(data.startTime);
    if (data.endTime) data.endTime = new Date(data.endTime);
    if (data.timer) data.timer = new Date(data.timer);

    const activity = await prisma.activity.update({
      where: { id },
      data
    });

    emitEvent('activity_update', { action: 'UPDATED', activity });
    res.json(activity);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to update curation' });
  }
});

// Set Timer/Countdown (STAFF ONLY)
router.patch('/:id/timer', authenticateToken, authorizeRoles(...STAFF_ROLES), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { targetTime, status } = req.body;

    const activity = await prisma.activity.update({
      where: { id },
      data: { 
        timer: targetTime ? new Date(targetTime) : null,
        status: status || undefined
      }
    });

    emitEvent('activity_update', { action: 'TIMER_SET', activity });
    res.json(activity);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to engage timer protocol' });
  }
});

// Delete activity (STAFF ONLY)
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.reservation.deleteMany({ where: { activityId: id } });
    await prisma.activity.delete({ where: { id } });

    emitEvent('activity_update', { action: 'DELETED', id });
    res.json({ message: 'Curation purged successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to purge curation' });
  }
});
// Make a reservation
router.post('/:id/reserve', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const activityId = Number(req.params.id);
    const authUserId = req.user?.userId;
    const { paxCount, notes } = req.body;

    if (!authUserId) return res.status(401).json({ message: 'Member not identified' });

    // Prevent duplicate registration
    const existing = await prisma.reservation.findFirst({
      where: {
        activityId,
        memberId: authUserId,
        affiliateId: req.user?.affiliateId || null,
        status: { not: 'CANCELLED' }
      }
    });
    if (existing) {
      return res.status(409).json({ message: 'You have already registered for this experience.' });
    }

    // Enforce 1-4 pax limit
    const pax = Number(paxCount) || 1;
    if (pax < 1 || pax > 4) {
      return res.status(400).json({ message: 'STRESS_PROTOCOL: Reservation volume must be between 1 and 4 nodes.' });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        _count: {
          select: { reservations: { where: { status: 'CONFIRMED' } } }
        }
      }
    });

    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    const isFull = activity._count.reservations >= activity.capacity;
    const status = isFull ? 'WAITLISTED' : 'CONFIRMED';

    const reservation = await prisma.reservation.create({
      data: {
        memberId: authUserId,
        affiliateId: req.user?.affiliateId || null,
        activityId,
        paxCount: pax,
        notes,
        status
      },
      include: { activity: true }
    });

    res.status(201).json({
      message: isFull 
        ? 'Capacity reached. You have been added to the waitlist.' 
        : 'Reservation confirmed successfully.',
      reservation
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Reservation failed' });
  }
});

// Get member reservations
router.get('/my-reservations', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const memberId = req.user?.userId;
    const affiliateId = req.user?.affiliateId;

    const reservations = await prisma.reservation.findMany({
      where: { 
        memberId,
        affiliateId: affiliateId || null
      },
      include: { activity: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Request cancellation of a reservation
router.patch('/reservations/:id/cancel', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reservationId = Number(req.params.id);
    const memberId = req.user?.userId;
    const affiliateId = req.user?.affiliateId;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { activity: true }
    });

    if (!reservation || reservation.memberId !== memberId || reservation.affiliateId !== (affiliateId || null)) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (reservation.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Reservation is already cancelled' });
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' }
    });

    emitEvent('activity_update', { action: 'CANCELLATION', reservation: updated });

    res.json({ message: 'Reservation successfully cancelled', updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel reservation' });
  }
});

export default router;
