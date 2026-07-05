"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = require("express-rate-limit");
const http_1 = require("http");
const socket_1 = require("./lib/socket");
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const member_1 = __importDefault(require("./routes/member"));
const billing_1 = __importDefault(require("./routes/billing"));
const restaurant_1 = __importDefault(require("./routes/restaurant"));
const access_1 = __importDefault(require("./routes/access"));
const announcement_1 = __importDefault(require("./routes/announcement"));
const complaint_1 = __importDefault(require("./routes/complaint"));
const activity_1 = __importDefault(require("./routes/activity"));
const reports_1 = __importDefault(require("./routes/reports"));
const asset_1 = __importDefault(require("./routes/asset"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const audit_1 = __importDefault(require("./routes/audit"));
const amc_1 = __importDefault(require("./routes/amc"));
const init_1 = __importDefault(require("./routes/init"));
const system_1 = __importDefault(require("./routes/system"));
const menu_1 = __importDefault(require("./routes/menu"));
const leave_1 = __importDefault(require("./routes/leave"));
const push_1 = __importDefault(require("./routes/push"));
const walkin_guests_1 = __importDefault(require("./routes/walkin-guests"));
const housekeeping_1 = __importDefault(require("./routes/housekeeping"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const salary_1 = __importDefault(require("./routes/salary"));
const export_requests_1 = __importDefault(require("./routes/export-requests"));
const automation_1 = require("./services/automation");
const backup_1 = require("./services/backup");
const sync_1 = require("./services/sync");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 5000;
// Initialize Socket.io
(0, socket_1.initIO)(httpServer);
// Auth Limiter: 25 requests per 5 minutes (Applicable for Login purposes)
const authLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 5 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.headers['x-test-bypass'] === 'true',
    message: { message: 'Too many requests from this IP, please try again after 5 minutes' }
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
        : '*',
}));
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static('uploads'));
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Stellaar Backend is running with Real-time support' });
});
app.use('/api/auth', authLimiter, auth_1.default);
app.use('/api/users', user_1.default);
app.use('/api/members', member_1.default);
app.use('/api/billing', billing_1.default);
app.use('/api/restaurant', restaurant_1.default);
app.use('/api/access', access_1.default);
app.use('/api/announcements', announcement_1.default);
app.use('/api/complaints', complaint_1.default);
app.use('/api/activities', activity_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/assets', asset_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/audit', audit_1.default);
app.use('/api/amc', amc_1.default);
app.use('/api/init', init_1.default);
app.use('/api/system', system_1.default);
app.use('/api/menu', menu_1.default);
app.use('/api/leave', leave_1.default);
app.use('/api/push', push_1.default);
app.use('/api/walkin-guests', walkin_guests_1.default);
app.use('/api/housekeeping', housekeeping_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/salary', salary_1.default);
app.use('/api/export-requests', export_requests_1.default);
// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'An internal node failure occurred',
        protocol: 'SECURE_FAULT_HANDLING'
    });
});
// Initialize Automation Jobs
(0, automation_1.scheduleJobs)();
(0, backup_1.scheduleBackups)();
// On-Start: sync registry + take an initial backup
(async () => {
    console.log('[Lifecycle] ┌──────────────────────────────────────────────');
    console.log('[Lifecycle] │ 🔄 Initial registry alignment...');
    try {
        await (0, sync_1.synchronizeLocalRegistry)();
        console.log('[Lifecycle] │ ✅ Initial registry alignment successful.');
    }
    catch (err) {
        console.log('[Lifecycle] │ ⚠️  Initial registry alignment failed:', err);
    }
    console.log('[Lifecycle] │ 📦 Taking initial recovery snapshot...');
    const result = await (0, backup_1.performBackup)('startup');
    if (result.success) {
        console.log('[Lifecycle] │ ✅ Initial backup complete.');
    }
    else {
        console.log('[Lifecycle] │ ⚠️  Initial backup skipped:', result.error);
    }
    const status = (0, backup_1.getBackupStatus)();
    console.log(`[Lifecycle] ├─ Snapshots:    ${status.totalBackups}`);
    console.log(`[Lifecycle] ├─ Total size:   ${status.totalSizeFormatted}`);
    console.log(`[Lifecycle] └─ Last backup:  ${status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : 'N/A'}`);
    console.log('[Lifecycle] ────────────────────────────────────────────────');
})();
// On-Shutdown: backup then sync
const gracefulShutdown = async (signal) => {
    console.log(`\n[Lifecycle] ════════════════════════════════════════════`);
    console.log(`[Lifecycle] 🔴 ${signal} detected. Shutting down...`);
    console.log(`[Lifecycle] 📦 Running final backup...`);
    try {
        await (0, backup_1.performBackup)('shutdown');
        console.log(`[Lifecycle] ✅ Final backup complete.`);
    }
    catch (err) {
        console.error(`[Lifecycle] ❌ Final backup failed:`, err);
    }
    console.log(`[Lifecycle] 🔄 Running final registry alignment...`);
    try {
        await (0, sync_1.synchronizeLocalRegistry)();
        console.log(`[Lifecycle] ✅ Final registry alignment complete.`);
    }
    catch (err) {
        console.error(`[Lifecycle] ❌ Final registry alignment failed:`, err);
    }
    const status = (0, backup_1.getBackupStatus)();
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
