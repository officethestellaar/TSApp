"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const push_1 = require("../lib/push");
const router = express_1.default.Router();
// Get announcements
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const announcements = await prisma_1.default.announcement.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { name: true } } }
        });
        res.json(announcements);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create announcement (Admin only)
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'RECEPTIONIST', 'ACCOUNTANT'), async (req, res) => {
    try {
        const { title, content, targetAudience, priority } = req.body;
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = {
            title,
            content,
            targetAudience,
            createdById: userId,
        };
        // If priority field was added to schema, include it. If not, Prisma will ignore or throw.
        // Assuming we added it or will handle it without breaking.
        // For now, let's just stick to the schema fields to avoid crashing. 
        // Wait, the frontend type has priority, but DB schema doesn't. 
        // Let's just create the basic announcement first.
        const announcement = await prisma_1.default.announcement.create({
            data: data,
        });
        // Real-time notification
        (0, socket_1.emitEvent)('new_announcement', {
            id: announcement.id,
            title: announcement.title,
            targetAudience: announcement.targetAudience,
            createdAt: announcement.createdAt,
        });
        (0, push_1.broadcastPush)('New Announcement', announcement.title, {
            screen: '/(member)/announcements',
        });
        res.status(201).json(announcement);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to create announcement' });
    }
});
// Edit announcement (Admin only)
router.patch('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'RECEPTIONIST', 'ACCOUNTANT'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { title, content, targetAudience, isActive } = req.body;
        const data = {};
        if (title !== undefined)
            data.title = title;
        if (content !== undefined)
            data.content = content;
        if (targetAudience !== undefined)
            data.targetAudience = targetAudience;
        if (isActive !== undefined)
            data.isActive = isActive;
        const announcement = await prisma_1.default.announcement.update({
            where: { id },
            data
        });
        res.json(announcement);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update announcement' });
    }
});
// Delete announcement (Admin only)
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        await prisma_1.default.announcement.delete({
            where: { id }
        });
        res.json({ message: 'Announcement deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to delete announcement' });
    }
});
exports.default = router;
