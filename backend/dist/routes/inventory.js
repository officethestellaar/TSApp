"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const apiError_1 = require("../lib/apiError");
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const router = express_1.default.Router();
// Get all inventory items
router.get('/', auth_1.authenticateToken, (0, auth_1.authorizePermission)('inventory', 'read'), async (req, res) => {
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
        console.error('[Inventory] List items failed:', error);
        res.status(500).json({ message: (0, apiError_1.describeError)(error, 'Internal server error') });
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
        console.error('[Inventory] Low stock alerts failed:', error);
        res.status(500).json({ message: (0, apiError_1.describeError)(error, 'Internal server error') });
    }
});
const INVENTORY_MANAGERS = [
    'SUPER_ADMIN',
    'ADMIN',
    'OPERATIONS_MANAGER',
    'DATA_OPERATOR',
    'RESTAURANT_MANAGER',
    'CHEF',
    'HOUSEKEEPING_SUPERVISOR',
    'HOUSEKEEPING_EXECUTIVE',
    'CLUB_MANAGER',
];
const authorizeInventoryAction = (action) => {
    return async (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Not authenticated' });
        if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')
            return next();
        const allowedRoles = {
            create: INVENTORY_MANAGERS,
            update: INVENTORY_MANAGERS,
            delete: ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'CLUB_MANAGER'],
        };
        if (allowedRoles[action]?.includes(req.user.role))
            return next();
        // Check granular userScreenAccess
        const fieldMap = { create: 'canCreate', update: 'canUpdate', delete: 'canDelete' };
        const perm = await prisma_1.default.userScreenAccess.findUnique({
            where: { userId_screenKey: { userId: req.user.userId, screenKey: 'inventory' } },
            select: { [fieldMap[action]]: true },
        });
        if (perm && perm[fieldMap[action]])
            return next();
        return res.status(403).json({ message: 'Unauthorized role or insufficient permissions' });
    };
};
// Create inventory item
router.post('/', auth_1.authenticateToken, authorizeInventoryAction('create'), async (req, res) => {
    try {
        const { name, category, unit, currentStock, minStockLevel, unitPrice } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: 'Item name is required' });
        }
        if (!category || !String(category).trim()) {
            return res.status(400).json({ message: 'Category is required' });
        }
        if (!unit || !String(unit).trim()) {
            return res.status(400).json({ message: 'Unit is required' });
        }
        const item = await prisma_1.default.inventoryItem.create({
            data: {
                name: String(name).trim(),
                category: String(category).trim(),
                unit: String(unit).trim(),
                currentStock: isNaN(Number(currentStock)) ? 0 : Number(currentStock),
                minStockLevel: isNaN(Number(minStockLevel)) ? 5 : Number(minStockLevel),
                unitPrice: isNaN(Number(unitPrice)) ? 0 : Number(unitPrice),
            }
        });
        (0, socket_1.emitEvent)('inventory_updated', { action: 'CREATE', item: item.name });
        res.status(201).json(item);
    }
    catch (error) {
        console.error('[Inventory] Create item failed:', error);
        res.status(400).json({ message: (0, apiError_1.describeError)(error, 'Failed to create item') });
    }
});
// Restock item
router.post('/:id/restock', auth_1.authenticateToken, authorizeInventoryAction('update'), async (req, res) => {
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
        console.error('[Inventory] Restock failed:', error);
        res.status(400).json({ message: (0, apiError_1.describeError)(error, 'Restock failed') });
    }
});
// Manage recipes (Link menu item to inventory)
router.post('/recipes', auth_1.authenticateToken, authorizeInventoryAction('update'), async (req, res) => {
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
        console.error('[Inventory] Recipe save failed:', error);
        res.status(400).json({ message: (0, apiError_1.describeError)(error, 'Failed to save recipe') });
    }
});
// Get consumption trends
router.get('/reports/consumption', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...INVENTORY_MANAGERS), async (req, res) => {
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
        console.error('[Inventory] Consumption report failed:', error);
        res.status(500).json({ message: (0, apiError_1.describeError)(error, 'Internal server error') });
    }
});
// Get inventory valuation by category
router.get('/reports/valuation', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...INVENTORY_MANAGERS), async (req, res) => {
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
        console.error('[Inventory] Valuation report failed:', error);
        res.status(500).json({ message: (0, apiError_1.describeError)(error, 'Internal server error') });
    }
});
// Get all inventory logs
router.get('/logs', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...INVENTORY_MANAGERS), async (req, res) => {
    try {
        const logs = await prisma_1.default.inventoryLog.findMany({
            include: { item: { select: { name: true, unit: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(logs);
    }
    catch (error) {
        console.error('[Inventory] List logs failed:', error);
        res.status(500).json({ message: (0, apiError_1.describeError)(error, 'Internal server error') });
    }
});
// Update inventory item
router.patch('/:id', auth_1.authenticateToken, authorizeInventoryAction('update'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, category, unit, currentStock, minStockLevel, unitPrice } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = String(name).trim();
        if (category !== undefined)
            updateData.category = String(category).trim();
        if (unit !== undefined)
            updateData.unit = String(unit).trim();
        if (currentStock !== undefined)
            updateData.currentStock = isNaN(Number(currentStock)) ? 0 : Number(currentStock);
        if (minStockLevel !== undefined)
            updateData.minStockLevel = isNaN(Number(minStockLevel)) ? 5 : Number(minStockLevel);
        if (unitPrice !== undefined)
            updateData.unitPrice = isNaN(Number(unitPrice)) ? 0 : Number(unitPrice);
        const item = await prisma_1.default.inventoryItem.update({
            where: { id },
            data: updateData
        });
        (0, socket_1.emitEvent)('inventory_updated', { action: 'UPDATE', item: item.name });
        res.json(item);
    }
    catch (error) {
        console.error('[Inventory] Update item failed:', error);
        res.status(400).json({ message: (0, apiError_1.describeError)(error, 'Failed to update item') });
    }
});
// Delete inventory item
router.delete('/:id', auth_1.authenticateToken, authorizeInventoryAction('delete'), async (req, res) => {
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
        console.error('[Inventory] Delete item failed:', error);
        res.status(400).json({ message: (0, apiError_1.describeError)(error, 'Failed to remove item') });
    }
});
exports.default = router;
