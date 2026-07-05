import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department } = req.query;
    const where: any = {};
    if (department && department !== 'ALL') where.department = String(department);
    const items = await prisma.menuItem.findMany({
      where,
      orderBy: [{ department: 'asc' }, { category: 'asc' }],
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'SALON_MANAGER'), async (req, res) => {
  try {
    const { name, category, price, department, isAvailable } = req.body;
    if (!name || !category || price === undefined || !department) {
      return res.status(400).json({ message: 'name, category, price, and department are required' });
    }
    const item = await prisma.menuItem.create({
      data: { name, category, price: Number(price), department, isAvailable: isAvailable ?? true },
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'SALON_MANAGER'), async (req, res) => {
  try {
    const { name, category, price, department, isAvailable } = req.body;
    const item = await prisma.menuItem.update({
      where: { id: Number(req.params.id) },
      data: { name, category, price: price !== undefined ? Number(price) : undefined, department, isAvailable },
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    await prisma.menuItem.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
