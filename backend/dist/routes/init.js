"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const backup_1 = require("../services/backup");
const router = express_1.default.Router();
/**
 * Super Diagnostic Node
 * Performs a comprehensive system-wide health check.
 * Accessible only by SUPER_ADMIN for security.
 */
router.get('/check', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    const report = {
        timestamp: new Date().toISOString(),
        status: 'OPTIMAL',
        nodes: {
            database: { status: 'UNKNOWN' },
            environment: { status: 'UNKNOWN' },
            fileSystem: { status: 'UNKNOWN' },
            backup: { status: 'UNKNOWN' },
            system: {
                platform: os_1.default.platform(),
                uptime: os_1.default.uptime(),
                memory: {
                    total: Math.round(os_1.default.totalmem() / 1024 / 1024) + 'MB',
                    free: Math.round(os_1.default.freemem() / 1024 / 1024) + 'MB'
                }
            }
        },
        issues: []
    };
    // 1. Database Diagnostic
    try {
        const start = Date.now();
        await prisma_1.default.$queryRaw `SELECT 1`;
        const latency = Date.now() - start;
        const counts = await Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.member.count(),
            prisma_1.default.invoice.count(),
            prisma_1.default.auditLog.count()
        ]);
        report.nodes.database = {
            status: 'CONNECTED',
            latency: `${latency}ms`,
            registryCounts: {
                users: counts[0],
                members: counts[1],
                invoices: counts[2],
                auditLogs: counts[3]
            }
        };
    }
    catch (error) {
        report.status = 'DEGRADED';
        report.nodes.database.status = 'CRITICAL';
        report.issues.push(`Database Connection Failure: ${error.message}`);
    }
    // 2. Environment Node Diagnostic
    const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'PORT'];
    const missingEnv = requiredEnv.filter(key => !process.env[key]);
    report.nodes.environment = {
        status: missingEnv.length === 0 ? 'HEALTHY' : 'INCOMPLETE',
        configuredNodes: requiredEnv.length - missingEnv.length,
        missingNodes: missingEnv
    };
    if (missingEnv.length > 0) {
        report.status = 'DEGRADED';
        report.issues.push(`Missing Critical Environment Nodes: ${missingEnv.join(', ')}`);
    }
    // 3. File System Diagnostic (Upload Permissions)
    const uploadDirs = ['uploads/amc-proofs', 'uploads/photos'];
    const fsReport = {};
    for (const dir of uploadDirs) {
        const fullPath = path_1.default.resolve(dir);
        try {
            if (!fs_1.default.existsSync(fullPath)) {
                fs_1.default.mkdirSync(fullPath, { recursive: true });
                fsReport[dir] = 'CREATED';
            }
            else {
                fs_1.default.accessSync(fullPath, fs_1.default.constants.W_OK);
                fsReport[dir] = 'WRITABLE';
            }
        }
        catch (err) {
            fsReport[dir] = 'ERROR';
            report.status = 'DEGRADED';
            report.issues.push(`File System Permission Denied: ${dir}`);
        }
    }
    report.nodes.fileSystem = fsReport;
    // 4. Schema Integrity Check (Orphaned records)
    try {
        const orphanedInvoices = await prisma_1.default.invoice.count({
            where: { memberId: { notIn: (await prisma_1.default.member.findMany({ select: { id: true } })).map(m => m.id) } }
        });
        if (orphanedInvoices > 0) {
            report.issues.push(`Data Integrity Alert: Found ${orphanedInvoices} orphaned invoices.`);
        }
    }
    catch (err) { }
    // 5. Backup Service Diagnostic
    const backupDir = path_1.default.resolve('backups');
    let lastBackup = null;
    if (fs_1.default.existsSync(backupDir)) {
        const files = fs_1.default.readdirSync(backupDir).filter(f => f.startsWith('recovery-node-'));
        if (files.length > 0) {
            const latest = files.sort().reverse()[0];
            const stats = fs_1.default.statSync(path_1.default.join(backupDir, latest));
            lastBackup = {
                filename: latest,
                size: Math.round(stats.size / 1024) + 'KB',
                timestamp: stats.mtime
            };
        }
    }
    report.nodes.backup = {
        status: lastBackup ? 'ACTIVE' : 'NONE',
        lastSnapshot: lastBackup
    };
    res.json(report);
});
/**
 * List Recovery Snapshots
 */
router.get('/backups', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    const backupDir = path_1.default.resolve('backups');
    if (!fs_1.default.existsSync(backupDir))
        return res.json([]);
    const files = fs_1.default.readdirSync(backupDir)
        .filter(f => f.startsWith('recovery-node-'))
        .map(f => {
        const stats = fs_1.default.statSync(path_1.default.join(backupDir, f));
        return {
            filename: f,
            size: Math.round(stats.size / 1024) + 'KB',
            timestamp: stats.mtime
        };
    })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(files);
});
/**
 * Cloud Recovery Protocol
 * Restores Supabase Cloud registry from a selected local snapshot.
 */
router.post('/recover', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    const { filename } = req.body;
    if (!filename)
        return res.status(400).json({ message: 'Target recovery node not specified.' });
    const backupPath = path_1.default.resolve('backups', filename);
    const localDbPath = path_1.default.resolve('prisma/local_backup.db');
    try {
        if (!fs_1.default.existsSync(backupPath))
            throw new Error('Recovery node not found in storage.');
        // 1. Snapshot the selected point to the active shadow node
        fs_1.default.copyFileSync(backupPath, localDbPath);
        // 2. Perform Reverse Sync (Local to Cloud)
        // NOTE: This is a heavy operation. We use the specialized local client.
        const { PrismaClient: LocalClient } = require('../generated/local-client');
        const localPrisma = new LocalClient();
        // Reverse dependency order for deletion (children first)
        const deleteOrder = [
            'orderItem', 'payment', 'invoiceItem', 'invoice', 'message', 'complaint',
            'familyMember', 'reservation', 'aMCPaymentRequest', 'accessLog', 'feedback',
            'order', 'recipe', 'inventoryLog', 'maintenanceLog', 'announcement',
            'systemStatus', 'auditLog', 'asset', 'menuItem', 'inventoryItem',
            'restaurantTable', 'activity', 'member', 'user', 'role'
        ];
        // Forward dependency order for insertion (parents first)
        const insertOrder = [...deleteOrder].reverse();
        console.log(`[Recovery] Initiating cloud restoration from node: ${filename}`);
        await prisma_1.default.$transaction(async (tx) => {
            // 1. Wipe cloud tables cleanly without constraint violations
            for (const model of deleteOrder) {
                // @ts-ignore
                await tx[model].deleteMany();
            }
            // 2. Refill from local snapshot
            for (const model of insertOrder) {
                // @ts-ignore
                const localData = await localPrisma[model].findMany();
                if (localData.length > 0) {
                    // @ts-ignore
                    await tx[model].createMany({ data: localData });
                }
                console.log(`[Recovery] Injected ${localData.length} records into cloud for ${model}`);
            }
        });
        res.json({ status: 'SUCCESS', message: 'Cloud Registry restored successfully. All systems normalized.' });
    }
    catch (error) {
        console.error('[Recovery] Restoration failure:', error.message);
        res.status(500).json({ status: 'ERROR', message: `Restoration failed: ${error.message}` });
    }
});
/**
 * Manual Backup Trigger
 * Allows SUPER_ADMIN to force a registry snapshot.
 */
router.post('/backup', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    const result = await (0, backup_1.performBackup)();
    if (result.success) {
        res.json({ status: 'SUCCESS', message: 'Registry snapshot committed to storage.', filename: result.filename });
    }
    else {
        res.status(500).json({ status: 'ERROR', message: result.error });
    }
});
/**
 * Emergency System Reset (Seed Only)
 * Allows SUPER_ADMIN to re-trigger the seed script if registry is corrupt.
 */
router.post('/reseed', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { exec } = require('child_process');
        exec('npx ts-node prisma/seed.ts', (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ status: 'ERROR', message: stderr });
            }
            res.json({ status: 'SUCCESS', message: 'Registry seeding node re-initialized.' });
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * Clear All Data (SUPER_ADMIN ONLY)
 * Deletes all business data while preserving users, roles, and permissions.
 */
router.delete('/clear-all', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        await prisma_1.default.$transaction(async (tx) => {
            // Children first (respect FK constraints)
            await tx.message.deleteMany();
            await tx.orderItem.deleteMany();
            await tx.invoiceItem.deleteMany();
            await tx.payment.deleteMany();
            await tx.maintenanceLog.deleteMany();
            await tx.inventoryLog.deleteMany();
            await tx.feedback.deleteMany();
            await tx.exportRequest.deleteMany();
            await tx.auditLog.deleteMany();
            await tx.familyMember.deleteMany();
            await tx.invoice.deleteMany();
            await tx.complaint.deleteMany();
            await tx.order.deleteMany();
            await tx.aMCPaymentRequest.deleteMany();
            await tx.unenrollmentRequest.deleteMany();
            await tx.accessLog.deleteMany();
            await tx.walkInGuest.deleteMany();
            await tx.tableReservation.deleteMany();
            await tx.reservation.deleteMany();
            await tx.housekeepingTaskInstance.deleteMany();
            await tx.housekeepingAllocation.deleteMany();
            await tx.housekeepingDeepCleaning.deleteMany();
            await tx.housekeepingFloorTemplate.deleteMany();
            await tx.housekeepingTask.deleteMany();
            await tx.staffAttendance.deleteMany();
            await tx.staffSalary.deleteMany();
            await tx.leaveBalance.deleteMany();
            await tx.staffLeave.deleteMany();
            await tx.announcement.deleteMany();
            await tx.activity.deleteMany();
            await tx.menuItem.deleteMany();
            await tx.inventoryItem.deleteMany();
            await tx.asset.deleteMany();
            await tx.restaurantTable.deleteMany();
            await tx.recipe.deleteMany();
            await tx.member.deleteMany();
        });
        res.json({ message: 'All business data cleared. Users, roles, and permissions preserved.' });
    }
    catch (error) {
        console.error('[ClearAll] Failed:', error);
        res.status(500).json({ message: 'Failed to clear data', error: error.message });
    }
});
exports.default = router;
