"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const router = express_1.default.Router();
// File a complaint
router.post('/', auth_1.authenticateToken, async (req, res) => {
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
        const complaint = await prisma_1.default.complaint.create({
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
        (0, socket_1.emitEvent)('new_complaint', {
            id: complaint.id,
            subject: complaint.subject,
            category: complaint.category
        });
        res.status(201).json(complaint);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to file complaint' });
    }
});
// Get complaints (Admin gets all, Member gets their own)
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { memberId } = req.query;
        const where = {};
        if (memberId)
            where.memberId = Number(memberId);
        // If user is a member, only let them see their own complaints
        if (req.user?.role === 'MEMBER') {
            where.memberId = req.user.userId;
            where.affiliateId = req.user.affiliateId || null;
        }
        const complaints = await prisma_1.default.complaint.findMany({
            where,
            include: {
                member: { select: { nameAsAadhaar: true, membershipNumber: true } },
                _count: { select: { messages: true } }
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(complaints);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get single complaint with messages
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        const complaintId = Number(req.params.id);
        const complaint = await prisma_1.default.complaint.findUnique({
            where: { id: complaintId },
            include: {
                member: { select: { nameAsAadhaar: true, membershipNumber: true } },
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });
        if (!complaint)
            return res.status(404).json({ message: 'Complaint not found' });
        // RLS Check
        if (role === 'MEMBER' && (complaint.memberId !== userId || complaint.affiliateId !== (req.user?.affiliateId || null))) {
            return res.status(403).json({ message: 'Access denied to this concierge node' });
        }
        res.json(complaint);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update complaint status
router.patch('/:id/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const complaint = await prisma_1.default.complaint.update({
            where: { id: Number(req.params.id) },
            data: { status },
        });
        (0, socket_1.emitEvent)('complaint_status_updated', {
            id: complaint.id,
            status: complaint.status
        });
        res.json(complaint);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update complaint' });
    }
});
// Post a message to a complaint (Chat)
router.post('/:id/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const complaintId = Number(req.params.id);
        const userId = req.user?.userId;
        const role = req.user?.role;
        const name = req.user?.name || 'User';
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const message = await prisma_1.default.message.create({
            data: {
                complaintId,
                senderType: role === 'MEMBER' ? 'MEMBER' : 'STAFF',
                senderId: userId,
                senderName: name,
                content,
            },
        });
        // Notify other party via socket
        (0, socket_1.emitEvent)('new_message', {
            complaintId,
            message,
        });
        res.status(201).json(message);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to send message' });
    }
});
exports.default = router;
