"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.authenticateToken = exports.authorizePermission = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cache_1 = __importDefault(require("../lib/cache"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const actionFieldMap = {
    create: 'canCreate',
    read: 'canRead',
    update: 'canUpdate',
    delete: 'canDelete',
};
/**
 * Middleware that checks if the authenticated user has a specific CRUD action
 * on a given screen. SUPER_ADMIN bypasses all checks.
 * Use AFTER authenticateToken.
 */
const authorizePermission = (screenKey, action) => {
    return async (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Not authenticated' });
        // SUPER_ADMIN bypasses all permission checks
        if (req.user.role === 'SUPER_ADMIN')
            return next();
        try {
            const field = actionFieldMap[action];
            const perm = await prisma_1.default.userScreenAccess.findUnique({
                where: { userId_screenKey: { userId: req.user.userId, screenKey } },
                select: { [field]: true },
            });
            if (!perm || !perm[field]) {
                return res.status(403).json({
                    message: `You don't have ${action} permission on ${screenKey}`,
                });
            }
            next();
        }
        catch {
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
};
exports.authorizePermission = authorizePermission;
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ message: 'Access token missing' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, async (err, user) => {
        if (err) {
            console.error('[Auth] Token verification failed:', err.message);
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        // Check if user account is locked
        if (user.role !== 'SUPER_ADMIN') {
            try {
                const dbUser = await prisma_1.default.user.findUnique({ where: { id: user.userId }, select: { locked: true } });
                if (dbUser?.locked) {
                    return res.status(403).json({ message: 'Account has been locked. Contact administrator.' });
                }
            }
            catch { /* ignore db check failure */ }
        }
        next();
    });
};
exports.authenticateToken = authenticateToken;
const authorizeRoles = (...roles) => {
    return async (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            console.warn(`[Auth] Role authorization failed. Required: [${roles}], User Role: ${req.user?.role}`);
            return res.status(403).json({ message: 'Unauthorized role' });
        }
        // --- EMERGENCY NETWORK LOCK PROTOCOL ---
        // If the system is locked, block ALL actions except from Super Admins
        if (req.user.role !== 'SUPER_ADMIN') {
            const systemStatus = cache_1.default.get('system_status');
            if (systemStatus?.isLocked) {
                console.warn(`[Auth] Blocked request from ${req.user.name} (${req.user.role}) due to ACTIVE SYSTEM LOCK.`);
                return res.status(503).json({
                    message: 'CRITICAL: System Network Lock Engaged. All operations frozen.',
                    protocol: 'FORCE_LOCK'
                });
            }
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
