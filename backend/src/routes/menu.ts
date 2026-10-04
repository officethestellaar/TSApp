import express from 'express';
import prisma from '../lib/prisma';
import { describeError } from '../lib/apiError';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

const MENU_MANAGERS = [
  'SUPER_ADMIN',
  'ADMIN',
  'RESTAURANT_MANAGER',
  'SALON_MANAGER',
  'CLUB_MANAGER',
  'OPERATIONS_MANAGER',
  'CHEF',
  'DATA_OPERATOR',
];

const authorizeMenuRead = async (req: any, res: any, next: any) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') return next();
  if (MENU_MANAGERS.includes(req.user.role) || req.user.role === 'WAITER' || req.user.role === 'MEMBER') return next();

  // Check granular userScreenAccess for menu screens
  const access = await prisma.userScreenAccess.findFirst({
    where: {
      userId: req.user.userId,
      screenKey: { in: ['menu-hub', 'restaurant-menu', 'salon-menu', 'gym-menu', 'pool-menu', 'banquet-menu', 'personal-trainer-menu'] },
      canRead: true,
    },
  });
  if (access) return next();

  return res.status(403).json({ message: 'Unauthorized role or insufficient permissions' });
};

const authorizeMenuWrite = (action: 'create' | 'update' | 'delete') => {
  return async (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') return next();

    const allowedRoles: Record<'create' | 'update' | 'delete', string[]> = {
      create: MENU_MANAGERS,
      update: MENU_MANAGERS,
      delete: ['SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'CLUB_MANAGER'],
    };

    if (allowedRoles[action]?.includes(req.user.role)) return next();

    const fieldMap = { create: 'canCreate', update: 'canUpdate', delete: 'canDelete' } as const;
    const access = await prisma.userScreenAccess.findFirst({
      where: {
        userId: req.user.userId,
        screenKey: { in: ['menu-hub', 'restaurant-menu', 'salon-menu', 'gym-menu', 'pool-menu', 'banquet-menu', 'personal-trainer-menu'] },
        [fieldMap[action]]: true,
      },
    });
    if (access) return next();

    return res.status(403).json({ message: 'Unauthorized role or insufficient permissions' });
  };
};

router.get('/', authenticateToken, authorizeMenuRead, async (req, res) => {
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
    console.error('[Menu] List items failed:', error);
    res.status(500).json({ message: describeError(error, 'Internal server error') });
  }
});

router.post('/', authenticateToken, authorizeMenuWrite('create'), async (req, res) => {
  try {
    const { name, category, price, department, isAvailable } = req.body;
    if (!name || !String(name).trim() || !category || !String(category).trim() || price === undefined || !department) {
      return res.status(400).json({ message: 'Name, category, price, and department are required' });
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ message: 'Price must be a valid non-negative number' });
    }
    const item = await prisma.menuItem.create({
      data: {
        name: String(name).trim(),
        category: String(category).trim(),
        price: numPrice,
        department: String(department).trim(),
        isAvailable: isAvailable ?? true
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('[Menu] Create item failed:', error);
    res.status(500).json({ message: describeError(error, 'Internal server error') });
  }
});

router.put('/:id', authenticateToken, authorizeMenuWrite('update'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, category, price, department, isAvailable } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (category !== undefined) updateData.category = String(category).trim();
    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ message: 'Price must be a valid non-negative number' });
      }
      updateData.price = numPrice;
    }
    if (department !== undefined) updateData.department = String(department).trim();
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);

    const item = await prisma.menuItem.update({
      where: { id },
      data: updateData,
    });
    res.json(item);
  } catch (error) {
    console.error('[Menu] Update item failed:', error);
    res.status(500).json({ message: describeError(error, 'Internal server error') });
  }
});

router.delete('/:id', authenticateToken, authorizeMenuWrite('delete'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.menuItem.delete({ where: { id } });
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error('[Menu] Delete item failed:', error);
    res.status(500).json({ message: describeError(error, 'Internal server error') });
  }
});

export default router;
