import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import cache from '../lib/cache';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    name: string;
    affiliateId?: number;
  };
}

// ─── GRANULAR PERMISSION CHECK ────────────────────────────────

type PermissionAction = 'create' | 'read' | 'update' | 'delete';

const actionFieldMap: Record<PermissionAction, string> = {
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
export const authorizePermission = (screenKey: string, action: PermissionAction) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    // SUPER_ADMIN bypasses all permission checks
    if (req.user.role === 'SUPER_ADMIN') return next();

    try {
      const field = actionFieldMap[action];
      const perm = await prisma.userScreenAccess.findUnique({
        where: { userId_screenKey: { userId: req.user.userId, screenKey } },
        select: { [field]: true },
      });

      if (!perm || !(perm as any)[field]) {
        return res.status(403).json({
          message: `You don't have ${action} permission on ${screenKey}`,
        });
      }

      next();
    } catch {
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
    if (err) {
      console.error('[Auth] Token verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    // Check if user account is locked
    if (user.role !== 'SUPER_ADMIN') {
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { locked: true } });
        if (dbUser?.locked) {
          return res.status(403).json({ message: 'Account has been locked. Contact administrator.' });
        }
      } catch { /* ignore db check failure */ }
    }
    next();
  });
};

export const authorizeRoles = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      console.warn(`[Auth] Role authorization failed. Required: [${roles}], User Role: ${req.user?.role}`);
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    // --- EMERGENCY NETWORK LOCK PROTOCOL ---
    // If the system is locked, block ALL actions except from Super Admins
    if (req.user.role !== 'SUPER_ADMIN') {
      const systemStatus = cache.get('system_status') as any;
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
