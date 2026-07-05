import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Get audit logs
router.get('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { action, entityType, search, limit = 50 } = req.query;
    
    const where: any = {};
    if (action) where.action = String(action);
    if (entityType) where.entityType = String(entityType);
    
    if (search && String(search).trim() !== '') {
      const searchStr = String(search);
      where.OR = [
        { userName: { contains: searchStr, mode: 'insensitive' } },
        { description: { contains: searchStr, mode: 'insensitive' } },
        { entityId: { contains: searchStr, mode: 'insensitive' } }
      ];
    }

    console.log('[Audit] Fetching logs with where:', JSON.stringify(where));

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json(logs);
  } catch (error: any) {
    console.error('[Audit] Fetch failure:', error.message);
    res.status(500).json({ message: 'Internal system log failure', error: error.message });
  }
});

// Get audit log stats
router.get('/stats', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const [totalLogs, last24h] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 1))
          }
        }
      })
    ]);

    const topActions = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    res.json({ totalLogs, last24h, topActions });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Edit audit log (SUPER_ADMIN ONLY)
router.patch('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action, description } = req.body;
    
    const log = await prisma.auditLog.update({
      where: { id },
      data: { action, description }
    });
    
    res.json(log);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to update log', error: error.message });
  }
});

// Clear all audit logs (SUPER_ADMIN ONLY) — must be before /:id
router.delete('/clear/all', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const count = await prisma.auditLog.count();
    await prisma.auditLog.deleteMany();
    res.json({ message: `All ${count} audit logs cleared.` });
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to clear logs', error: error.message });
  }
});

// Delete audit log (SUPER_ADMIN ONLY)
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.auditLog.delete({ where: { id } });
    res.json({ message: 'Log deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to delete log', error: error.message });
  }
});

export default router;
