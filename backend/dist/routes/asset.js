"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all assets
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { category, status } = req.query;
        const where = {};
        if (category)
            where.category = String(category);
        if (status)
            where.status = String(status);
        const assets = await prisma_1.default.asset.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { maintenanceLogs: true }
                }
            }
        });
        res.json(assets);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get asset stats
router.get('/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const [totalAssets, maintenanceCount, retiredCount, totalCost] = await Promise.all([
            prisma_1.default.asset.count(),
            prisma_1.default.asset.count({ where: { status: 'MAINTENANCE' } }),
            prisma_1.default.asset.count({ where: { status: 'RETIRED' } }),
            prisma_1.default.asset.aggregate({ _sum: { purchaseCost: true } })
        ]);
        const categories = await prisma_1.default.asset.groupBy({
            by: ['category'],
            _count: { _all: true }
        });
        res.json({
            totalAssets,
            maintenanceCount,
            retiredCount,
            totalCost: totalCost._sum.purchaseCost || 0,
            categories
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get asset detail with logs
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const asset = await prisma_1.default.asset.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                maintenanceLogs: {
                    orderBy: { serviceDate: 'desc' }
                }
            }
        });
        if (!asset)
            return res.status(404).json({ message: 'Asset not found' });
        res.json(asset);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create asset
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const data = req.body;
        if (data.purchaseDate)
            data.purchaseDate = new Date(data.purchaseDate);
        if (data.nextMaintenance)
            data.nextMaintenance = new Date(data.nextMaintenance);
        const asset = await prisma_1.default.asset.create({
            data
        });
        res.status(201).json(asset);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to create asset' });
    }
});
// Update asset
router.patch('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const data = req.body;
        if (data.purchaseDate)
            data.purchaseDate = new Date(data.purchaseDate);
        if (data.lastMaintenance)
            data.lastMaintenance = new Date(data.lastMaintenance);
        if (data.nextMaintenance)
            data.nextMaintenance = new Date(data.nextMaintenance);
        const asset = await prisma_1.default.asset.update({
            where: { id: Number(req.params.id) },
            data
        });
        res.json(asset);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update asset' });
    }
});
// Add maintenance log
router.post('/:id/logs', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const assetId = Number(req.params.id);
        const { serviceDate, serviceType, performedBy, cost, description, status } = req.body;
        const [log, asset] = await prisma_1.default.$transaction([
            prisma_1.default.maintenanceLog.create({
                data: {
                    assetId,
                    serviceDate: new Date(serviceDate),
                    serviceType,
                    performedBy,
                    cost: Number(cost),
                    description,
                    status
                }
            }),
            prisma_1.default.asset.update({
                where: { id: assetId },
                data: {
                    lastMaintenance: new Date(serviceDate),
                    status: status === 'COMPLETED' ? 'OPERATIONAL' : 'MAINTENANCE'
                }
            })
        ]);
        res.status(201).json(log);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to add log' });
    }
});
// Delete asset
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        // Delete associated logs first
        await prisma_1.default.$transaction([
            prisma_1.default.maintenanceLog.deleteMany({ where: { assetId: id } }),
            prisma_1.default.asset.delete({ where: { id } }),
        ]);
        res.json({ message: 'Asset and associated logs removed successfully' });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to remove asset' });
    }
});
exports.default = router;
