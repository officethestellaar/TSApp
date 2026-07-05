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
        const { search } = req.query;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: 'insensitive' } },
                { contact: { contains: String(search) } },
            ];
        }
        const guests = await prisma_1.default.walkInGuest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        res.json(guests);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'DATA_OPERATOR', 'RECEPTIONIST'), async (req, res) => {
    try {
        const { name, contact } = req.body;
        if (!name)
            return res.status(400).json({ message: 'Name is required' });
        const existing = await prisma_1.default.walkInGuest.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (existing) {
            if (contact && !existing.contact) {
                const updated = await prisma_1.default.walkInGuest.update({
                    where: { id: existing.id },
                    data: { contact },
                });
                return res.json(updated);
            }
            return res.json(existing);
        }
        const guest = await prisma_1.default.walkInGuest.create({
            data: { name, contact: contact || null },
        });
        res.status(201).json(guest);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to create' });
    }
});
exports.default = router;
