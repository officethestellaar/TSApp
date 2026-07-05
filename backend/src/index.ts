import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'http';
import { initIO } from './lib/socket';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import memberRoutes from './routes/member';
import billingRoutes from './routes/billing';
import restaurantRoutes from './routes/restaurant';
import accessRoutes from './routes/access';
import announcementRoutes from './routes/announcement';
import complaintRoutes from './routes/complaint';
import activityRoutes from './routes/activity';
import reportsRoutes from './routes/reports';
import assetRoutes from './routes/asset';
import inventoryRoutes from './routes/inventory';
import auditRoutes from './routes/audit';
import amcRoutes from './routes/amc';
import initRoutes from './routes/init';
import systemRoutes from './routes/system';
import menuRoutes from './routes/menu';
import leaveRoutes from './routes/leave';
import pushRoutes from './routes/push';
import walkinGuestRoutes from './routes/walkin-guests';
import housekeepingRoutes from './routes/housekeeping';
import attendanceRoutes from './routes/attendance';
import salaryRoutes from './routes/salary';
import exportRequestRoutes from './routes/export-requests';
import { scheduleJobs } from './services/automation';
import { scheduleBackups, performBackup, getBackupStatus } from './services/backup';
import { synchronizeLocalRegistry } from './services/sync';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
initIO(httpServer);

// Auth Limiter: 25 requests per 5 minutes (Applicable for Login purposes)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers['x-test-bypass'] === 'true',
  message: { message: 'Too many requests from this IP, please try again after 5 minutes' }
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
    : '*',
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Stellaar Backend is running with Real-time support' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/amc', amcRoutes);
app.use('/api/init', initRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/walkin-guests', walkinGuestRoutes);
app.use('/api/housekeeping', housekeepingRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/export-requests', exportRequestRoutes);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'An internal node failure occurred',
    protocol: 'SECURE_FAULT_HANDLING'
  });
});

// Initialize Automation Jobs
scheduleJobs();
scheduleBackups();

// On-Start: sync registry + take an initial backup
(async () => {
  console.log('[Lifecycle] ┌──────────────────────────────────────────────');
  console.log('[Lifecycle] │ 🔄 Initial registry alignment...');
  try {
    await synchronizeLocalRegistry();
    console.log('[Lifecycle] │ ✅ Initial registry alignment successful.');
  } catch (err) {
    console.log('[Lifecycle] │ ⚠️  Initial registry alignment failed:', err);
  }

  console.log('[Lifecycle] │ 📦 Taking initial recovery snapshot...');
  const result = await performBackup('startup');
  if (result.success) {
    console.log('[Lifecycle] │ ✅ Initial backup complete.');
  } else {
    console.log('[Lifecycle] │ ⚠️  Initial backup skipped:', result.error);
  }

  const status = getBackupStatus();
  console.log(`[Lifecycle] ├─ Snapshots:    ${status.totalBackups}`);
  console.log(`[Lifecycle] ├─ Total size:   ${status.totalSizeFormatted}`);
  console.log(`[Lifecycle] └─ Last backup:  ${status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : 'N/A'}`);
  console.log('[Lifecycle] ────────────────────────────────────────────────');
})();

// On-Shutdown: backup then sync
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[Lifecycle] ════════════════════════════════════════════`);
  console.log(`[Lifecycle] 🔴 ${signal} detected. Shutting down...`);
  console.log(`[Lifecycle] 📦 Running final backup...`);
  try {
    await performBackup('shutdown');
    console.log(`[Lifecycle] ✅ Final backup complete.`);
  } catch (err) {
    console.error(`[Lifecycle] ❌ Final backup failed:`, err);
  }

  console.log(`[Lifecycle] 🔄 Running final registry alignment...`);
  try {
    await synchronizeLocalRegistry();
    console.log(`[Lifecycle] ✅ Final registry alignment complete.`);
  } catch (err) {
    console.error(`[Lifecycle] ❌ Final registry alignment failed:`, err);
  }

  const status = getBackupStatus();
  console.log(`[Lifecycle] ├─ Snapshots:    ${status.totalBackups}`);
  console.log(`[Lifecycle] ├─ Total size:   ${status.totalSizeFormatted}`);
  console.log(`[Lifecycle] └─ Last backup:  ${status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : 'N/A'}`);
  console.log(`[Lifecycle] ✨ Registry state preserved. Goodbye.`);
  console.log(`[Lifecycle] ════════════════════════════════════════════`);
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
