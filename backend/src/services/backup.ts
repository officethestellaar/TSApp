import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { synchronizeLocalRegistry } from './sync';

const BACKUP_DIR = 'backups';
const DB_FILE = 'prisma/local_backup.db';
const MAX_BACKUPS = 10;
const MANIFEST_FILE = path.join(BACKUP_DIR, 'manifest.json');

interface BackupManifest {
  backups: Array<{
    filename: string;
    timestamp: string;
    sizeBytes: number;
  }>;
  lastBackupAt: string | null;
  totalBackups: number;
  totalSizeBytes: number;
}

function getDefaultManifest(): BackupManifest {
  return {
    backups: [],
    lastBackupAt: null,
    totalBackups: 0,
    totalSizeBytes: 0,
  };
}

function readManifest(): BackupManifest {
  try {
    const fullPath = path.resolve(MANIFEST_FILE);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return getDefaultManifest();
}

function writeManifest(manifest: BackupManifest): void {
  const fullPath = path.resolve(MANIFEST_FILE);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, JSON.stringify(manifest, null, 2));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
}

export function getBackupStatus(): {
  healthy: boolean;
  lastBackupAt: string | null;
  totalBackups: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  latestBackupSize: string;
  backups: Array<{ filename: string; timestamp: string; sizeFormatted: string }>;
} {
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

function formatTimeCompact(d: Date): string {
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export const performBackup = async (trigger: string = 'manual'): Promise<{ success: boolean; filename?: string; error?: string; sizeBytes?: number }> => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const timeLabel = formatTimeCompact(new Date());

  console.log(`[Backup] ⏱️  [${timeLabel}] Snapshot triggered (${trigger})...`);

  try {
    const syncResult = await synchronizeLocalRegistry();
    if (!syncResult.success) throw new Error(syncResult.error);

    const fullBackupDir = path.resolve(BACKUP_DIR);
    if (!fs.existsSync(fullBackupDir)) {
      fs.mkdirSync(fullBackupDir, { recursive: true });
    }

    const ts = timestamp.replace(/[:.]/g, '-');
    const filename = `recovery-node-${ts}.db`;
    const srcPath = path.resolve(DB_FILE);
    const destPath = path.join(fullBackupDir, filename);

    if (!fs.existsSync(srcPath)) {
      throw new Error('Source registry node not found for snapshot.');
    }

    fs.copyFileSync(srcPath, destPath);
    const sizeBytes = fs.statSync(destPath).size;

    // Rotate old backups
    const files = fs.readdirSync(fullBackupDir)
      .filter(f => f.startsWith('recovery-node-'))
      .map(f => ({ name: f, time: fs.statSync(path.join(fullBackupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      toDelete.forEach(f => fs.unlinkSync(path.join(fullBackupDir, f.name)));
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
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Backup]   ❌ Snapshot failed: ${error.message} [${elapsed}s]`);
    return { success: false, error: error.message };
  }
};

export const scheduleBackups = () => {
  cron.schedule('*/30 * * * *', async () => {
    await performBackup('every-30min');
  });

  cron.schedule('0 3 * * *', async () => {
    await performBackup('daily-3am');
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
