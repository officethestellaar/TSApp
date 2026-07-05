"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { department } = req.query;
        const where = {};
        if (department && department !== 'ALL')
            where.department = String(department);
        const items = await prisma_1.default.menuItem.findMany({
            where,
            orderBy: [{ department: 'asc' }, { category: 'asc' }],
        });
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'SALON_MANAGER'), async (req, res) => {
    try {
        const { name, category, price, department, isAvailable } = req.body;
        if (!name || !category || price === undefined || !department) {
            return res.status(400).json({ message: 'name, category, price, and department are required' });
        }
        const item = await prisma_1.default.menuItem.create({
            data: { name, category, price: Number(price), department, isAvailable: isAvailable ?? true },
        });
        res.status(201).json(item);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.put('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'SALON_MANAGER'), async (req, res) => {
    try {
        const { name, category, price, department, isAvailable } = req.body;
        const item = await prisma_1.default.menuItem.update({
            where: { id: Number(req.params.id) },
            data: { name, category, price: price !== undefined ? Number(price) : undefined, department, isAvailable },
        });
        res.json(item);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        await prisma_1.default.menuItem.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: 'Menu item deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
