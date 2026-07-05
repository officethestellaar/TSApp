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
// Get all inventory items
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { category } = req.query;
        const where = {};
        if (category)
            where.category = String(category);
        const items = await prisma_1.default.inventoryItem.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { logs: true }
                }
            }
        });
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get low stock alerts
router.get('/alerts', auth_1.authenticateToken, async (req, res) => {
    try {
        const items = await prisma_1.default.inventoryItem.findMany({
            orderBy: { currentStock: 'asc' }
        });
        // Filter in-memory for SQLite compatibility
        const lowStockItems = items.filter(item => item.currentStock <= item.minStockLevel);
        res.json(lowStockItems);
    }
    catch (error) {
        console.error('Inventory alerts error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create inventory item
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
    try {
        const item = await prisma_1.default.inventoryItem.create({
            data: req.body
        });
        (0, socket_1.emitEvent)('inventory_updated', { action: 'CREATE', item: item.name });
        res.status(201).json(item);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to create item' });
    }
});
// Restock item
router.post('/:id/restock', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'DATA_OPERATOR', 'RESTAURANT_MANAGER'), async (req, res) => {
    try {
        const { quantity, unitPrice, description } = req.body;
        const id = Number(req.params.id);
        const userId = req.user?.userId;
        const [log, item] = await prisma_1.default.$transaction([
            prisma_1.default.inventoryLog.create({
                data: {
                    itemId: id,
                    change: Number(quantity),
                    type: 'PURCHASE',
                    description: description || 'Routine restock',
                    performedById: userId,
                }
            }),
            prisma_1.default.inventoryItem.update({
                where: { id },
                data: {
                    currentStock: { increment: Number(quantity) },
                    unitPrice: unitPrice ? Number(unitPrice) : undefined,
                    lastRestockedAt: new Date()
                }
            })
        ]);
        (0, socket_1.emitEvent)('inventory_updated', { action: 'RESTOCK', item: item.name });
        res.json(item);
    }
    catch (error) {
        res.status(400).json({ message: 'Restock failed' });
    }
});
// Manage recipes (Link menu item to inventory)
router.post('/recipes', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
    try {
        const { menuItemId, ingredients } = req.body; // ingredients: [{ inventoryItemId, quantity }]
        await prisma_1.default.$transaction([
            prisma_1.default.recipe.deleteMany({ where: { menuItemId: Number(menuItemId) } }),
            ...ingredients.map((ing) => prisma_1.default.recipe.create({
                data: {
                    menuItemId: Number(menuItemId),
                    inventoryItemId: Number(ing.inventoryItemId),
                    quantity: Number(ing.quantity)
                }
            }))
        ]);
        res.status(201).json({ message: 'Recipe saved successfully' });
    }
    catch (error) {
        console.error('Recipe save error:', error);
        res.status(400).json({ message: 'Failed to save recipe' });
    }
});
// Get consumption trends
router.get('/reports/consumption', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
    try {
        const logs = await prisma_1.default.inventoryLog.findMany({
            where: { type: 'USAGE' },
            include: { item: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const trendData = {};
        logs.forEach(log => {
            const date = new Date(log.createdAt);
            const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
            const itemName = log.item.name;
            if (!trendData[monthYear]) {
                trendData[monthYear] = { month: monthYear };
            }
            const usage = Math.abs(log.change);
            trendData[monthYear][itemName] = (trendData[monthYear][itemName] || 0) + usage;
        });
        res.json(Object.values(trendData));
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get inventory valuation by category
router.get('/reports/valuation', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
    try {
        const items = await prisma_1.default.inventoryItem.findMany();
        const valuation = items.reduce((acc, item) => {
            const cat = item.category;
            const value = item.currentStock * item.unitPrice;
            acc[cat] = (acc[cat] || 0) + value;
            return acc;
        }, {});
        const formattedData = Object.keys(valuation).map(cat => ({
            name: cat,
            value: valuation[cat]
        }));
        res.json(formattedData);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get all inventory logs
router.get('/logs', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
    try {
        const logs = await prisma_1.default.inventoryLog.findMany({
            include: { item: { select: { name: true, unit: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update inventory item
router.patch('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const item = await prisma_1.default.inventoryItem.update({
            where: { id },
            data: req.body
        });
        (0, socket_1.emitEvent)('inventory_updated', { action: 'UPDATE', item: item.name });
        res.json(item);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update item' });
    }
});
// Delete inventory item
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        // Delete associated logs and recipes first
        const [_, __, item] = await prisma_1.default.$transaction([
            prisma_1.default.inventoryLog.deleteMany({ where: { itemId: id } }),
            prisma_1.default.recipe.deleteMany({ where: { inventoryItemId: id } }),
            prisma_1.default.inventoryItem.delete({ where: { id } }),
        ]);
        (0, socket_1.emitEvent)('inventory_updated', { action: 'DELETE', item: item.name });
        res.json({ message: 'Inventory node and associated history removed successfully' });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to remove item' });
    }
});
exports.default = router;
