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
const ALL_ADMINS = ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'HOUSEKEEPING_SUPERVISOR', 'SALON_MANAGER', 'RESTAURANT_MANAGER', 'RECEPTIONIST'];
router.get('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...ALL_ADMINS), async (req, res) => {
    try {
        const leaves = await prisma_1.default.staffLeave.findMany({
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
                reviewedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(leaves);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/my', auth_1.authenticateToken, async (req, res) => {
    try {
        const leaves = await prisma_1.default.staffLeave.findMany({
            where: { userId: req.user.userId },
            include: {
                reviewedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(leaves);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/balances', auth_1.authenticateToken, async (req, res) => {
    try {
        let balance = await prisma_1.default.leaveBalance.findUnique({
            where: { userId: req.user.userId },
        });
        if (!balance) {
            balance = await prisma_1.default.leaveBalance.create({
                data: {
                    userId: req.user.userId,
                    year: new Date().getFullYear(),
                },
            });
        }
        res.json(balance);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
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
        const leave = await prisma_1.default.staffLeave.create({
            data: { userId, leaveType, startDate: start, endDate: end, reason },
            include: {
                user: { select: { id: true, name: true } },
            },
        });
        (0, socket_1.emitEvent)('staff_leave', { action: 'APPLIED', leave: { id: leave.id, userId: leave.userId, status: leave.status } });
        res.status(201).json(leave);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/:id/review', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const leaveId = Number(req.params.id);
        const { status, reviewNotes } = req.body;
        const reviewerId = req.user.userId;
        if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ message: 'Status must be APPROVED or REJECTED' });
        }
        const existing = await prisma_1.default.staffLeave.findUnique({ where: { id: leaveId } });
        if (!existing)
            return res.status(404).json({ message: 'Leave application not found' });
        if (existing.status !== 'PENDING') {
            return res.status(400).json({ message: 'Leave has already been reviewed' });
        }
        const leave = await prisma_1.default.staffLeave.update({
            where: { id: leaveId },
            data: { status, reviewNotes, reviewedById: reviewerId, reviewedAt: new Date() },
            include: {
                user: { select: { id: true, name: true, email: true } },
                reviewedBy: { select: { id: true, name: true } },
            },
        });
        (0, socket_1.emitEvent)('staff_leave', { action: status === 'APPROVED' ? 'APPROVED' : 'REJECTED', leave: { id: leave.id, userId: leave.userId, status: leave.status } });
        res.json(leave);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/balances/all', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const balances = await prisma_1.default.leaveBalance.findMany({
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
            },
            orderBy: { year: 'desc' },
        });
        res.json(balances);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/balances/:userId', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const { earnedLeave, sickLeave, casualLeave, year } = req.body;
        const data = {};
        if (earnedLeave !== undefined)
            data.earnedLeave = earnedLeave;
        if (sickLeave !== undefined)
            data.sickLeave = sickLeave;
        if (casualLeave !== undefined)
            data.casualLeave = casualLeave;
        if (year !== undefined)
            data.year = year;
        const balance = await prisma_1.default.leaveBalance.upsert({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
