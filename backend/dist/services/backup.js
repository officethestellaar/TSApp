"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleBackups = exports.performBackup = void 0;
exports.getBackupStatus = getBackupStatus;
const node_cron_1 = __importDefault(require("node-cron"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sync_1 = require("./sync");
const BACKUP_DIR = 'backups';
const DB_FILE = 'prisma/local_backup.db';
const MAX_BACKUPS = 10;
const MANIFEST_FILE = path_1.default.join(BACKUP_DIR, 'manifest.json');
function getDefaultManifest() {
    return {
        backups: [],
        lastBackupAt: null,
        totalBackups: 0,
        totalSizeBytes: 0,
    };
}
function readManifest() {
    try {
        const fullPath = path_1.default.resolve(MANIFEST_FILE);
        if (fs_1.default.existsSync(fullPath)) {
            return JSON.parse(fs_1.default.readFileSync(fullPath, 'utf-8'));
        }
    }
    catch {
        // ignore
    }
    return getDefaultManifest();
}
function writeManifest(manifest) {
    const fullPath = path_1.default.resolve(MANIFEST_FILE);
    const dir = path_1.default.dirname(fullPath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    fs_1.default.writeFileSync(fullPath, JSON.stringify(manifest, null, 2));
}
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
}
function getBackupStatus() {
    const manifest = readManifest();
    const backups = manifest.backups.map(b => ({
        filename: b.filename,
        timestamp: b.timestamp,
        sizeFormatted: formatSize(b.sizeBytes),
    }));
    return {
        healthy: manifest.totalBackups > 0,
        lastBackupAt: manifest.lastBackupAt,
        totalBackups: manifest.totalBackups,
        totalSizeBytes: manifest.totalSizeBytes,
        totalSizeFormatted: formatSize(manifest.totalSizeBytes),
        latestBackupSize: manifest.backups.length > 0 ? formatSize(manifest.backups[0].sizeBytes) : 'N/A',
        backups,
    };
}
function formatTimeCompact(d) {
    return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
    });
}
const performBackup = async (trigger = 'manual') => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const timeLabel = formatTimeCompact(new Date());
    console.log(`[Backup] ⏱️  [${timeLabel}] Snapshot triggered (${trigger})...`);
    try {
        const syncResult = await (0, sync_1.synchronizeLocalRegistry)();
        if (!syncResult.success)
            throw new Error(syncResult.error);
        const fullBackupDir = path_1.default.resolve(BACKUP_DIR);
        if (!fs_1.default.existsSync(fullBackupDir)) {
            fs_1.default.mkdirSync(fullBackupDir, { recursive: true });
        }
        const ts = timestamp.replace(/[:.]/g, '-');
        const filename = `recovery-node-${ts}.db`;
        const srcPath = path_1.default.resolve(DB_FILE);
        const destPath = path_1.default.join(fullBackupDir, filename);
        if (!fs_1.default.existsSync(srcPath)) {
            throw new Error('Source registry node not found for snapshot.');
        }
        fs_1.default.copyFileSync(srcPath, destPath);
        const sizeBytes = fs_1.default.statSync(destPath).size;
        // Rotate old backups
        const files = fs_1.default.readdirSync(fullBackupDir)
            .filter(f => f.startsWith('recovery-node-'))
            .map(f => ({ name: f, time: fs_1.default.statSync(path_1.default.join(fullBackupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);
        if (files.length > MAX_BACKUPS) {
            const toDelete = files.slice(MAX_BACKUPS);
            toDelete.forEach(f => fs_1.default.unlinkSync(path_1.default.join(fullBackupDir, f.name)));
            console.log(`[Backup]   🗑️  Rotated ${toDelete.length} legacy recovery points.`);
        }
        // Update manifest
        const manifest = readManifest();
        manifest.backups.unshift({ filename, timestamp, sizeBytes });
        if (manifest.backups.length > MAX_BACKUPS) {
            manifest.backups = manifest.backups.slice(0, MAX_BACKUPS);
        }
        manifest.lastBackupAt = timestamp;
        manifest.totalBackups = manifest.backups.length;
        manifest.totalSizeBytes = manifest.backups.reduce((sum, b) => sum + b.sizeBytes, 0);
        writeManifest(manifest);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Backup]   ✅ Snapshot committed: ${filename} (${formatSize(sizeBytes)}) [${elapsed}s]`);
        return { success: true, filename, sizeBytes };
    }
    catch (error) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Backup]   ❌ Snapshot failed: ${error.message} [${elapsed}s]`);
        return { success: false, error: error.message };
    }
};
exports.performBackup = performBackup;
const scheduleBackups = () => {
    node_cron_1.default.schedule('*/30 * * * *', async () => {
        await (0, exports.performBackup)('every-30min');
    });
    node_cron_1.default.schedule('0 3 * * *', async () => {
        await (0, exports.performBackup)('daily-3am');
    });
    const status = getBackupStatus();
    const lines = [
        `[Backup] ┌──────────────────────────────────────────────`,
        `[Backup] │ 📦 Recovery Snapshot Service`,
        `[Backup] ├─ Auto-backup:  every 30 minutes`,
        `[Backup] ├─ Deep-archive: daily at 3:00 AM`,
        `[Backup] ├─ Retention:    last ${MAX_BACKUPS} snapshots`,
        `[Backup] ├─ Status:       ${status.healthy ? '✅ Healthy' : '⏳ No snapshots yet'}`,
        `[Backup] ├─ Snapshots:    ${status.totalBackups}`,
        `[Backup] ├─ Total size:   ${status.totalSizeFormatted}`,
        `[Backup] └─ Last backup:  ${status.lastBackupAt ? formatTime(status.lastBackupAt) : 'N/A'}`,
    ];
    lines.forEach(l => console.log(l));
};
exports.scheduleBackups = scheduleBackups;
