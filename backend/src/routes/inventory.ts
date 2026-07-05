import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { emitEvent } from '../lib/socket';

const router = express.Router();

// Get all inventory items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category) where.category = String(category);

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { logs: true }
        }
      }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get low stock alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { currentStock: 'asc' }
    });
    
    // Filter in-memory for SQLite compatibility
    const lowStockItems = items.filter(item => item.currentStock <= item.minStockLevel);
    
    res.json(lowStockItems);
  } catch (error) {
    console.error('Inventory alerts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create inventory item
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
  try {
    const item = await prisma.inventoryItem.create({
      data: req.body
    });
    emitEvent('inventory_updated', { action: 'CREATE', item: item.name });
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create item' });
  }
});

// Restock item
router.post('/:id/restock', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'DATA_OPERATOR', 'RESTAURANT_MANAGER'), async (req, res) => {
  try {
    const { quantity, unitPrice, description } = req.body;
    const id = Number(req.params.id);
    const userId = (req as any).user?.userId;

    const [log, item] = await prisma.$transaction([
      prisma.inventoryLog.create({
        data: {
          itemId: id,
          change: Number(quantity),
          type: 'PURCHASE',
          description: description || 'Routine restock',
          performedById: userId,
        }
      }),
      prisma.inventoryItem.update({
        where: { id },
        data: {
          currentStock: { increment: Number(quantity) },
          unitPrice: unitPrice ? Number(unitPrice) : undefined,
          lastRestockedAt: new Date()
        }
      })
    ]);

    emitEvent('inventory_updated', { action: 'RESTOCK', item: item.name });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: 'Restock failed' });
  }
});

// Manage recipes (Link menu item to inventory)
router.post('/recipes', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
  try {
    const { menuItemId, ingredients } = req.body; // ingredients: [{ inventoryItemId, quantity }]

    await prisma.$transaction([
      prisma.recipe.deleteMany({ where: { menuItemId: Number(menuItemId) } }),
      ...ingredients.map((ing: any) => 
        prisma.recipe.create({
          data: {
            menuItemId: Number(menuItemId),
            inventoryItemId: Number(ing.inventoryItemId),
            quantity: Number(ing.quantity)
          }
        })
      )
    ]);

    res.status(201).json({ message: 'Recipe saved successfully' });
  } catch (error) {
    console.error('Recipe save error:', error);
    res.status(400).json({ message: 'Failed to save recipe' });
  }
});

// Get consumption trends
router.get('/reports/consumption', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      where: { type: 'USAGE' },
      include: { item: { select: { name: true } } },
      orderBy: { createdAt: 'asc' }
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendData: any = {};

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
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get inventory valuation by category
router.get('/reports/valuation', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany();
    
    const valuation = items.reduce((acc: any, item) => {
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
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all inventory logs
router.get('/logs', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      include: { item: { select: { name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update inventory item
router.patch('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'RESTAURANT_MANAGER'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: req.body
    });
    emitEvent('inventory_updated', { action: 'UPDATE', item: item.name });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update item' });
  }
});

// Delete inventory item
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Delete associated logs and recipes first
    const [_, __, item] = await prisma.$transaction([
      prisma.inventoryLog.deleteMany({ where: { itemId: id } }),
      prisma.recipe.deleteMany({ where: { inventoryItemId: id } }),
      prisma.inventoryItem.delete({ where: { id } }),
    ]);

    emitEvent('inventory_updated', { action: 'DELETE', item: item.name });
    res.json({ message: 'Inventory node and associated history removed successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to remove item' });
  }
});

export default router;
