import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { contact: { contains: String(search) } },
      ];
    }
    const guests = await prisma.walkInGuest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(guests);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'DATA_OPERATOR', 'RECEPTIONIST'), async (req, res) => {
  try {
    const { name, contact } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const existing = await prisma.walkInGuest.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      if (contact && !existing.contact) {
        const updated = await prisma.walkInGuest.update({
          where: { id: existing.id },
          data: { contact },
        });
        return res.json(updated);
      }
      return res.json(existing);
    }

    const guest = await prisma.walkInGuest.create({
      data: { name, contact: contact || null },
    });
    res.status(201).json(guest);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to create' });
  }
});

export default router;
