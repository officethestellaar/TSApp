"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const email_1 = require("../lib/email");
const router = express_1.default.Router();
const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'RECEPTIONIST'];
// Get all activities with current booking status
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const activities = await prisma_1.default.activity.findMany({
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
                const updated = await prisma_1.default.activity.update({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create new activity (STAFF ONLY)
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...STAFF_ROLES), async (req, res) => {
    try {
        const activity = await prisma_1.default.activity.create({
            data: {
                ...req.body,
                startTime: new Date(req.body.startTime),
                endTime: new Date(req.body.endTime),
                timer: req.body.timer ? new Date(req.body.timer) : null
            }
        });
        (0, socket_1.emitEvent)('activity_update', { action: 'CREATED', activity });
        // Create a system announcement for the new curation
        await prisma_1.default.announcement.create({
            data: {
                title: `New Curation: ${activity.name}`,
                content: `A new estate activity "${activity.name}" has been scheduled at ${activity.location}. Details: ${activity.description}`,
                targetAudience: 'ALL',
                createdById: req.user.userId
            }
        });
        (0, socket_1.emitEvent)('new_announcement', {
            title: `New Curation: ${activity.name}`,
            targetAudience: 'ALL',
            createdAt: new Date()
        });
        // Send email to all active members
        try {
            const activeMembers = await prisma_1.default.member.findMany({
                where: { isActive: true, email: { not: null } },
                select: { email: true }
            });
            const memberEmails = activeMembers.map(m => m.email).filter(e => e.trim() !== '');
            if (memberEmails.length > 0) {
                // Send asynchronously to not block the response
                (0, email_1.sendNewActivityEmail)(memberEmails, activity.name, activity.description, activity.startTime).catch(console.error);
            }
        }
        catch (emailError) {
            console.error('Error fetching members for activity email:', emailError);
        }
        res.status(201).json(activity);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to create curation' });
    }
});
// Update activity (STAFF ONLY)
router.patch('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...STAFF_ROLES), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const data = { ...req.body };
        if (data.startTime)
            data.startTime = new Date(data.startTime);
        if (data.endTime)
            data.endTime = new Date(data.endTime);
        if (data.timer)
            data.timer = new Date(data.timer);
        const activity = await prisma_1.default.activity.update({
            where: { id },
            data
        });
        (0, socket_1.emitEvent)('activity_update', { action: 'UPDATED', activity });
        res.json(activity);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to update curation' });
    }
});
// Set Timer/Countdown (STAFF ONLY)
router.patch('/:id/timer', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...STAFF_ROLES), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { targetTime, status } = req.body;
        const activity = await prisma_1.default.activity.update({
            where: { id },
            data: {
                timer: targetTime ? new Date(targetTime) : null,
                status: status || undefined
            }
        });
        (0, socket_1.emitEvent)('activity_update', { action: 'TIMER_SET', activity });
        res.json(activity);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to engage timer protocol' });
    }
});
// Delete activity (STAFF ONLY)
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        await prisma_1.default.reservation.deleteMany({ where: { activityId: id } });
        await prisma_1.default.activity.delete({ where: { id } });
        (0, socket_1.emitEvent)('activity_update', { action: 'DELETED', id });
        res.json({ message: 'Curation purged successfully' });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to purge curation' });
    }
});
// Make a reservation
router.post('/:id/reserve', auth_1.authenticateToken, async (req, res) => {
    try {
        const activityId = Number(req.params.id);
        const authUserId = req.user?.userId;
        const { paxCount, notes } = req.body;
        if (!authUserId)
            return res.status(401).json({ message: 'Member not identified' });
        // Prevent duplicate registration
        const existing = await prisma_1.default.reservation.findFirst({
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
        const activity = await prisma_1.default.activity.findUnique({
            where: { id: activityId },
            include: {
                _count: {
                    select: { reservations: { where: { status: 'CONFIRMED' } } }
                }
            }
        });
        if (!activity)
            return res.status(404).json({ message: 'Activity not found' });
        const isFull = activity._count.reservations >= activity.capacity;
        const status = isFull ? 'WAITLISTED' : 'CONFIRMED';
        const reservation = await prisma_1.default.reservation.create({
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
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Reservation failed' });
    }
});
// Get member reservations
router.get('/my-reservations', auth_1.authenticateToken, async (req, res) => {
    try {
        const memberId = req.user?.userId;
        const affiliateId = req.user?.affiliateId;
        const reservations = await prisma_1.default.reservation.findMany({
            where: {
                memberId,
                affiliateId: affiliateId || null
            },
            include: { activity: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reservations);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Request cancellation of a reservation
router.patch('/reservations/:id/cancel', auth_1.authenticateToken, async (req, res) => {
    try {
        const reservationId = Number(req.params.id);
        const memberId = req.user?.userId;
        const affiliateId = req.user?.affiliateId;
        const reservation = await prisma_1.default.reservation.findUnique({
            where: { id: reservationId },
            include: { activity: true }
        });
        if (!reservation || reservation.memberId !== memberId || reservation.affiliateId !== (affiliateId || null)) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        if (reservation.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Reservation is already cancelled' });
        }
        const updated = await prisma_1.default.reservation.update({
            where: { id: reservationId },
            data: { status: 'CANCELLED' }
        });
        (0, socket_1.emitEvent)('activity_update', { action: 'CANCELLATION', reservation: updated });
        res.json({ message: 'Reservation successfully cancelled', updated });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to cancel reservation' });
    }
});
exports.default = router;
