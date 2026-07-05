"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const cache_1 = __importDefault(require("../lib/cache"));
const audit_1 = require("../lib/audit");
const sync_1 = require("../services/sync");
const ledger_1 = require("../lib/ledger");
const backup_1 = require("../services/backup");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const socket_1 = require("../lib/socket");
const router = express_1.default.Router();
// Get system status
router.get('/status', async (req, res) => {
    try {
        let status = cache_1.default.get('system_status');
        if (!status) {
            status = await prisma_1.default.systemStatus.findUnique({ where: { id: 1 } });
            if (!status) {
                status = await prisma_1.default.systemStatus.create({ data: { id: 1, isLocked: false } });
            }
            cache_1.default.set('system_status', status, 60); // Cache for 60 seconds
        }
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get backup system status
router.get('/backup-status', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const status = (0, backup_1.getBackupStatus)();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve backup status' });
    }
});
// Trigger manual backup
router.post('/backup', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const result = await (0, backup_1.performBackup)('manual-api');
        if (result.success) {
            res.json({ message: 'Backup completed successfully', filename: result.filename, sizeBytes: result.sizeBytes });
        }
        else {
            res.status(500).json({ message: 'Backup failed', error: result.error });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Backup failed', error: error.message });
    }
});
// Trigger Emergency Panic Lock
router.post('/lock', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { reason } = req.body;
        const userId = req.user.userId;
        const status = await prisma_1.default.systemStatus.upsert({
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
        cache_1.default.set('system_status', status, 60);
        await (0, audit_1.createAuditLog)({
            action: 'SYSTEM_LOCK',
            entityType: 'SECURITY',
            description: `CRITICAL: System Network Lock Engaged. Reason: ${status.reason}`,
            user: {
                userId: req.user.userId,
                name: req.user.name,
                role: req.user.role
            }
        });
        // Take immediate local snapshot
        (0, sync_1.synchronizeLocalRegistry)().catch(console.error);
        res.json({ message: 'SYSTEM LOCKED. All non-Super Admin nodes disconnected.', status });
    }
    catch (error) {
        console.error('System lock error:', error);
        res.status(500).json({ message: 'Failed to engage system lock' });
    }
});
// Unlock System
router.post('/unlock', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const status = await prisma_1.default.systemStatus.update({
            where: { id: 1 },
            data: {
                isLocked: false,
                lockedAt: null,
                lockedById: null,
                reason: null
            }
        });
        cache_1.default.set('system_status', status, 60);
        await (0, audit_1.createAuditLog)({
            action: 'SYSTEM_UNLOCK',
            entityType: 'SECURITY',
            description: `System Network Lock Disengaged. Operations normalized.`,
            user: {
                userId: req.user.userId,
                name: req.user.name,
                role: req.user.role
            }
        });
        res.json({ message: 'SYSTEM UNLOCKED. Normal operations resumed.', status });
    }
    catch (error) {
        console.error('System unlock error:', error);
        res.status(500).json({ message: 'Failed to disengage system lock' });
    }
});
// Get Transaction Ledger (SUPER_ADMIN ONLY)
router.get('/ledger', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const transactions = await (0, ledger_1.getLedgerTransactions)();
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve secondary ledger' });
    }
});
// Edit Transaction Ledger (SUPER_ADMIN ONLY)
router.patch('/ledger/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { amount, description } = req.body;
        const transaction = await (0, ledger_1.updateLedgerTransaction)(id, {
            amount: amount ? Number(amount) : undefined,
            description
        });
        res.json(transaction);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update ledger record', error: error.message });
    }
});
// Delete Transaction Ledger (SUPER_ADMIN ONLY)
router.delete('/ledger/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        await (0, ledger_1.deleteLedgerTransaction)(id);
        res.json({ message: 'Ledger record permanently deleted' });
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to delete ledger record', error: error.message });
    }
});
// COMPREHENSIVE TRAFFIC STRESS TEST ENDPOINT
router.get('/traffic-test', async (req, res) => {
    try {
        const results = {
            timestamp: new Date().toISOString(),
            vectors: {}
        };
        // 1. DATABASE VECTOR: Simple query to verify connectivity
        const dbStart = Date.now();
        const dbCheck = await prisma_1.default.systemStatus.findUnique({ where: { id: 1 } });
        results.vectors.database = {
            status: dbCheck ? 'CONNECTED' : 'NODE_MISSING',
            latency: `${Date.now() - dbStart}ms`
        };
        // 2. STORAGE VECTOR: Write/Delete cycle to verify FS integrity
        const storageStart = Date.now();
        const testPath = path_1.default.join(__dirname, '../../uploads/traffic_integrity.tmp');
        // Ensure uploads directory exists
        const uploadsDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadsDir))
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        fs_1.default.writeFileSync(testPath, `TRAFFIC_TEST_${results.timestamp}`);
        const exists = fs_1.default.existsSync(testPath);
        if (exists)
            fs_1.default.unlinkSync(testPath);
        results.vectors.storage = {
            status: exists ? 'INTEGRITY_VERIFIED' : 'WRITE_FAILURE',
            latency: `${Date.now() - storageStart}ms`
        };
        // 3. REALTIME VECTOR: Broadcast test event
        const realtimeStart = Date.now();
        (0, socket_1.emitEvent)('TRAFFIC_STRESS_PING', { timestamp: results.timestamp });
        results.vectors.realtime = {
            status: 'BROADCAST_DISPATCHED',
            latency: `${Date.now() - realtimeStart}ms`
        };
        res.json({
            status: 'STRESS_VECTOR_ACTIVE',
            ...results
        });
    }
    catch (error) {
        console.error('[Traffic Test] Vector failure:', error.message);
        res.status(500).json({
            status: 'VECTOR_CRASH',
            error: error.message
        });
    }
});
exports.default = router;
