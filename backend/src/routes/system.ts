import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import cache from '../lib/cache';
import { createAuditLog } from '../lib/audit';
import { synchronizeLocalRegistry } from '../services/sync';
import { getLedgerTransactions, updateLedgerTransaction, deleteLedgerTransaction } from '../lib/ledger';
import { getBackupStatus, performBackup } from '../services/backup';
import fs from 'fs';
import path from 'path';
import { emitEvent } from '../lib/socket';

const router = express.Router();

// Get system status
router.get('/status', async (req, res) => {
  try {
    let status = cache.get('system_status') as any;
    if (!status) {
      status = await prisma.systemStatus.findUnique({ where: { id: 1 } });
      if (!status) {
        status = await prisma.systemStatus.create({ data: { id: 1, isLocked: false } });
      }
      cache.set('system_status', status, 60); // Cache for 60 seconds
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get backup system status
router.get('/backup-status', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const status = getBackupStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve backup status' });
  }
});

// Trigger manual backup
router.post('/backup', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const result = await performBackup('manual-api');
    if (result.success) {
      res.json({ message: 'Backup completed successfully', filename: result.filename, sizeBytes: result.sizeBytes });
    } else {
      res.status(500).json({ message: 'Backup failed', error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Backup failed', error: error.message });
  }
});

// Trigger Emergency Panic Lock
router.post('/lock', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = (req as any).user.userId;

    const status = await prisma.systemStatus.upsert({
      where: { id: 1 },
      update: {
        isLocked: true,
        lockedAt: new Date(),
        lockedById: userId,
        reason: reason || 'EMERGENCY PROTOCOL ACTIVATED'
      },
      create: {
        id: 1,
        isLocked: true,
        lockedAt: new Date(),
        lockedById: userId,
        reason: reason || 'EMERGENCY PROTOCOL ACTIVATED'
      }
    });

    cache.set('system_status', status, 60);

    await createAuditLog({
      action: 'SYSTEM_LOCK',
      entityType: 'SECURITY',
      description: `CRITICAL: System Network Lock Engaged. Reason: ${status.reason}`,
      user: {
        userId: (req as any).user.userId,
        name: (req as any).user.name,
        role: (req as any).user.role
      }
    });

    // Take immediate local snapshot
    synchronizeLocalRegistry().catch(console.error);

    res.json({ message: 'SYSTEM LOCKED. All non-Super Admin nodes disconnected.', status });
  } catch (error: any) {
    console.error('System lock error:', error);
    res.status(500).json({ message: 'Failed to engage system lock' });
  }
});

// Unlock System
router.post('/unlock', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const status = await prisma.systemStatus.update({
      where: { id: 1 },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedById: null,
        reason: null
      }
    });

    cache.set('system_status', status, 60);

    await createAuditLog({
      action: 'SYSTEM_UNLOCK',
      entityType: 'SECURITY',
      description: `System Network Lock Disengaged. Operations normalized.`,
      user: {
        userId: (req as any).user.userId,
        name: (req as any).user.name,
        role: (req as any).user.role
      }
    });

    res.json({ message: 'SYSTEM UNLOCKED. Normal operations resumed.', status });
  } catch (error: any) {
    console.error('System unlock error:', error);
    res.status(500).json({ message: 'Failed to disengage system lock' });
  }
});

// Get Transaction Ledger (SUPER_ADMIN ONLY)
router.get('/ledger', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const transactions = await getLedgerTransactions();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve secondary ledger' });
  }
});

// Edit Transaction Ledger (SUPER_ADMIN ONLY)
router.patch('/ledger/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, description } = req.body;
    
    const transaction = await updateLedgerTransaction(id, { 
      amount: amount ? Number(amount) : undefined, 
      description 
    });
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to update ledger record', error: error.message });
  }
});

// Delete Transaction Ledger (SUPER_ADMIN ONLY)
router.delete('/ledger/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await deleteLedgerTransaction(id);
    res.json({ message: 'Ledger record permanently deleted' });
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to delete ledger record', error: error.message });
  }
});

// COMPREHENSIVE TRAFFIC STRESS TEST ENDPOINT
router.get('/traffic-test', async (req, res) => {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      vectors: {}
    };

    // 1. DATABASE VECTOR: Simple query to verify connectivity
    const dbStart = Date.now();
    const dbCheck = await prisma.systemStatus.findUnique({ where: { id: 1 } });
    results.vectors.database = { 
      status: dbCheck ? 'CONNECTED' : 'NODE_MISSING',
      latency: `${Date.now() - dbStart}ms`
    };

    // 2. STORAGE VECTOR: Write/Delete cycle to verify FS integrity
    const storageStart = Date.now();
    const testPath = path.join(__dirname, '../../uploads/traffic_integrity.tmp');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    fs.writeFileSync(testPath, `TRAFFIC_TEST_${results.timestamp}`);
    const exists = fs.existsSync(testPath);
    if (exists) fs.unlinkSync(testPath);
    
    results.vectors.storage = {
      status: exists ? 'INTEGRITY_VERIFIED' : 'WRITE_FAILURE',
      latency: `${Date.now() - storageStart}ms`
    };

    // 3. REALTIME VECTOR: Broadcast test event
    const realtimeStart = Date.now();
    emitEvent('TRAFFIC_STRESS_PING', { timestamp: results.timestamp });
    results.vectors.realtime = {
      status: 'BROADCAST_DISPATCHED',
      latency: `${Date.now() - realtimeStart}ms`
    };

    res.json({
      status: 'STRESS_VECTOR_ACTIVE',
      ...results
    });
  } catch (error: any) {
    console.error('[Traffic Test] Vector failure:', error.message);
    res.status(500).json({ 
      status: 'VECTOR_CRASH', 
      error: error.message 
    });
  }
});

export default router;
