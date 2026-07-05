"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get audit logs
router.get('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
    try {
        const { action, entityType, search, limit = 50 } = req.query;
        const where = {};
        if (action)
            where.action = String(action);
        if (entityType)
            where.entityType = String(entityType);
        if (search && String(search).trim() !== '') {
            const searchStr = String(search);
            where.OR = [
                { userName: { contains: searchStr, mode: 'insensitive' } },
                { description: { contains: searchStr, mode: 'insensitive' } },
                { entityId: { contains: searchStr, mode: 'insensitive' } }
            ];
        }
        console.log('[Audit] Fetching logs with where:', JSON.stringify(where));
        const logs = await prisma_1.default.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Number(limit)
        });
        res.json(logs);
    }
    catch (error) {
        console.error('[Audit] Fetch failure:', error.message);
        res.status(500).json({ message: 'Internal system log failure', error: error.message });
    }
});
// Get audit log stats
router.get('/stats', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
    try {
        const [totalLogs, last24h] = await Promise.all([
            prisma_1.default.auditLog.count(),
            prisma_1.default.auditLog.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setDate(new Date().getDate() - 1))
                    }
                }
            })
        ]);
        const topActions = await prisma_1.default.auditLog.groupBy({
            by: ['action'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5
        });
        res.json({ totalLogs, last24h, topActions });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Edit audit log (SUPER_ADMIN ONLY)
router.patch('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { action, description } = req.body;
        const log = await prisma_1.default.auditLog.update({
            where: { id },
            data: { action, description }
        });
        res.json(log);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update log', error: error.message });
    }
});
// Clear all audit logs (SUPER_ADMIN ONLY) — must be before /:id
router.delete('/clear/all', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const count = await prisma_1.default.auditLog.count();
        await prisma_1.default.auditLog.deleteMany();
        res.json({ message: `All ${count} audit logs cleared.` });
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to clear logs', error: error.message });
    }
});
// Delete audit log (SUPER_ADMIN ONLY)
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        await prisma_1.default.auditLog.delete({ where: { id } });
        res.json({ message: 'Log deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to delete log', error: error.message });
    }
});
exports.default = router;
