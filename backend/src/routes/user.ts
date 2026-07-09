import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles, authorizePermission } from '../middleware/auth';
import { emitEvent } from '../lib/socket';

const router = express.Router();

// Get all staff users
router.get('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), authorizePermission('users', 'read'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true, staffProfile: true },
      orderBy: { createdAt: 'desc' },
    });
    
    // Remove passwords from response
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(sanitizedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, staffProfile: true },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update current user profile
router.patch('/me', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, password } = req.body;

    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: { role: true, staffProfile: true },
    });

    emitEvent('staff_update', { action: 'UPDATED', user: { id: user.id, name: user.name } }, { userId: user.id });

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update PIN
router.patch('/me/pin', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { currentPin, newPin } = req.body;

    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: 'New PIN must be exactly 4 digits' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pin: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.pin) {
      if (!currentPin) return res.status(400).json({ message: 'Current PIN is required to change' });
      const valid = await bcrypt.compare(currentPin, user.pin);
      if (!valid) return res.status(401).json({ message: 'Current PIN is incorrect' });
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    await prisma.user.update({ where: { id: userId }, data: { pin: hashedPin } });

    res.json({ message: 'PIN updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all roles (for the dropdown in the UI)
router.get('/roles', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: {
        name: { notIn: ['SUPER_ADMIN', 'MEMBER'] }
      }
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new staff user
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    let { email, password, name, roleId, roleName, defaultCheckIn, monthlySalary } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (!roleId && roleName) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) return res.status(400).json({ message: `Role '${roleName}' not found` });
      roleId = role.id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        roleId: Number(roleId),
        defaultCheckIn: defaultCheckIn || '09:00',
        monthlySalary: monthlySalary ? Number(monthlySalary) : 0,
      },
      include: { role: true, staffProfile: true },
    });

    emitEvent('staff_update', { action: 'CREATED', user: { id: user.id, name: user.name } }, { userId: user.id });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

const PROTECTED_ADMINS = ['admin@stellaar.com', 'office.thestellaar@gmail.com'];

// Update staff user
router.patch('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    let { email, name, roleId, roleName, password, status } = req.body;
    const userId = Number(req.params.id);

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (target?.email && PROTECTED_ADMINS.includes(target.email)) {
      return res.status(403).json({ message: 'This admin account cannot be modified.' });
    }

    if (!roleId && roleName) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) return res.status(400).json({ message: `Role '${roleName}' not found` });
      roleId = role.id;
    }

    const data: any = {};
    if (email) data.email = email;
    if (name) data.name = name;
    if (roleId) data.roleId = Number(roleId);
    if (status) data.status = status;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: { role: true, staffProfile: true },
    });

    emitEvent('staff_update', { action: 'UPDATED', user: { id: user.id, name: user.name } }, { userId: user.id });

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete staff user
router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    
    // @ts-ignore
    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (target?.email && PROTECTED_ADMINS.includes(target.email)) {
      return res.status(403).json({ message: 'This admin account cannot be deleted.' });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    emitEvent('staff_update', { action: 'DELETED', userId }, { userId });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Lock/Unlock user
router.patch('/:id/lock', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  try {
    const userId = Number(req.params.id);
    const { locked } = req.body;
    if (typeof locked !== 'boolean') return res.status(400).json({ message: 'locked must be a boolean' });

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, locked: true } });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.email && PROTECTED_ADMINS.includes(target.email)) {
      return res.status(403).json({ message: 'This admin account cannot be locked.' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { locked },
      select: { id: true, locked: true, name: true },
    });

    emitEvent('staff_update', { action: locked ? 'LOCKED' : 'UNLOCKED', userId, name: user.name }, { userId });
    res.json(user);
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

// ─── SCREEN PERMISSIONS ───────────────────────────────────────

export const ALL_SCREENS = [
  { key: 'overview', label: 'Overview' },
  { key: 'requests', label: 'Requests' },
  { key: 'records', label: 'Records' },
  { key: 'activities', label: 'Activities' },
  { key: 'members', label: 'Members' },
  { key: 'concierge', label: 'Concierge' },
  { key: 'notices', label: 'Notices' },
  { key: 'billing', label: 'Billing' },
  { key: 'restaurant-billing', label: 'Restaurant Billing' },
  { key: 'salon-billing', label: 'Salon Billing' },
  { key: 'gym-billing', label: 'Gym Billing' },
  { key: 'pool-billing', label: 'Pool Billing' },
  { key: 'banquet-billing', label: 'Banquet Billing' },
  { key: 'personal-trainer-billing', label: 'Personal Trainer Billing' },
  { key: 'menu-hub', label: 'Menu Hub' },
  { key: 'amc-approvals', label: 'AMC Approvals' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'restaurant-pos', label: 'Restaurant POS' },
  { key: 'kitchen-display', label: 'Kitchen Display' },
  { key: 'restaurant-menu', label: 'Restaurant Menu' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'assets', label: 'Assets' },
  { key: 'salon-menu', label: 'Salon Menu' },
  { key: 'gym-menu', label: 'Gym Menu' },
  { key: 'pool-menu', label: 'Pool Menu' },
  { key: 'banquet-menu', label: 'Banquet Menu' },
  { key: 'personal-trainer-menu', label: 'Personal Trainer Menu' },
  { key: 'housekeeping', label: 'Housekeeping Dashboard' },
  { key: 'housekeeping-tasks', label: 'Housekeeping Tasks' },
  { key: 'housekeeping-allocations', label: 'Housekeeping Allocations' },
  { key: 'housekeeping-deep-cleaning', label: 'Deep Cleaning' },
  { key: 'housekeeping-reports', label: 'Housekeeping Reports' },
  { key: 'reports', label: 'Reports' },
  { key: 'audit-logs', label: 'Audit Logs' },
  { key: 'users', label: 'Users' },
  { key: 'leave', label: 'Leave Management' },
  { key: 'system-init', label: 'System Init' },
  { key: 'staff-attendance', label: 'Staff Attendance' },
  { key: 'staff-salary', label: 'Staff Salary' },
  { key: 'salary', label: 'My Salary' },
];

// Non-editable role → default screen keys (always present, cannot be removed via UI)
const ROLE_SCREEN_MAP: Record<string, string[]> = {
  SUPER_ADMIN: ALL_SCREENS.map(s => s.key),
  ADMIN: ALL_SCREENS.map(s => s.key),
  CLUB_MANAGER: ['members', 'billing', 'restaurant-pos', 'requests', 'activities', 'reports', 'menu-hub', 'concierge'],
  OPERATIONS_MANAGER: ['housekeeping', 'inventory', 'assets', 'staff-attendance', 'activities', 'members', 'reports', 'requests'],
  DATA_OPERATOR: ['members', 'records', 'activities', 'menu-hub', 'inventory', 'assets', 'requests'],
  SALES_EXECUTIVE: ['members', 'billing'],
  ACCOUNTANT: ['billing', 'ledger', 'amc-approvals', 'reports'],
  RESTAURANT_MANAGER: ['restaurant-pos', 'kitchen-display', 'restaurant-menu', 'billing'],
  SALON_MANAGER: ['salon-menu', 'billing'],
  HOUSEKEEPING_SUPERVISOR: ['housekeeping', 'housekeeping-tasks', 'housekeeping-allocations', 'housekeeping-deep-cleaning', 'housekeeping-reports', 'staff-attendance', 'inventory', 'requests'],
  HOUSEKEEPING_EXECUTIVE: ['housekeeping', 'housekeeping-tasks', 'housekeeping-allocations', 'housekeeping-deep-cleaning', 'housekeeping-reports', 'staff-attendance', 'inventory', 'requests'],
  RECEPTIONIST: ['members', 'billing', 'activities', 'concierge', 'requests', 'notices', 'records'],
  WAITER: ['restaurant-pos', 'billing'],
  CHEF: ['kitchen-display', 'restaurant-menu', 'inventory'],
};

function getRoleDefaultKeys(roleName: string): string[] {
  return ROLE_SCREEN_MAP[roleName] || [];
}

const KNOWN_CHILDREN: Record<string, string[]> = {
  housekeeping: [
    'housekeeping-tasks',
    'housekeeping-allocations',
    'housekeeping-deep-cleaning',
    'housekeeping-reports',
  ],
};

function expandChildren(keys: string[]): string[] {
  const expanded = new Set(keys);
  for (const key of keys) {
    for (const ck of KNOWN_CHILDREN[key] || []) {
      expanded.add(ck);
    }
  }
  return Array.from(expanded);
}

router.get('/screens', authenticateToken, async (req: any, res) => {
  const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
  const roleDefaults = getRoleDefaultKeys(req.user.role);
  let userScreens: { screenKey: string; canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }[] = [];
  // Start with role defaults (read-only baseline)
  const roleDefaultPerms = expandChildren(roleDefaults).map(key => ({
    screenKey: key,
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  }));
  // Merge user-specific screens (allow overriding defaults per user)
  const userPerms = await prisma.userScreenAccess.findMany({
    where: { userId: req.user.userId },
    select: { screenKey: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
  });
  const userMap = new Map(userPerms.map(a => [a.screenKey, a]));
  const merged = new Map<string, { screenKey: string; canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }>();
  for (const d of roleDefaultPerms) {
    const u = userMap.get(d.screenKey);
    // If user has an explicit entry (even all-false), use it; otherwise use default
    const entry = u || d;
    // Include only if at least one CRUD is active
    if (entry.canCreate || entry.canRead || entry.canUpdate || entry.canDelete) {
      merged.set(d.screenKey, entry);
    }
    if (u) userMap.delete(d.screenKey);
  }
  // Add extra non-default screens that have at least one active CRUD
  for (const [, u] of userMap) {
    if (u.canCreate || u.canRead || u.canUpdate || u.canDelete) {
      merged.set(u.screenKey, u);
    }
  }
  userScreens = Array.from(merged.values());
  res.json({ allScreens: ALL_SCREENS, userScreens, isSuperAdmin, roleDefaults: expandChildren(roleDefaults) });
});

router.get('/:id/screens', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  try {
    const userId = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!target) return res.status(404).json({ message: 'User not found' });

    const roleDefaults = getRoleDefaultKeys(target.role.name);
    const access = await prisma.userScreenAccess.findMany({
      where: { userId },
      select: { screenKey: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    });
    const active = access.filter(a => a.canCreate || a.canRead || a.canUpdate || a.canDelete);
    const userKeys = active.map(a => a.screenKey);
    const effective = Array.from(new Set([...expandChildren(roleDefaults), ...userKeys]));
    res.json(effective);
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.put('/:id/screens', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  try {
    const userId = Number(req.params.id);
    const { screenKeys } = req.body;
    if (!Array.isArray(screenKeys)) return res.status(400).json({ message: 'screenKeys must be an array' });

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role.name === 'SUPER_ADMIN') {
      return res.json({ message: 'Super admin has unrestricted access', screenKeys: ALL_SCREENS.map(s => s.key) });
    }

    // Save all screens (role-default + extra are fully editable per user)
    await prisma.userScreenAccess.deleteMany({ where: { userId } });
    if (screenKeys.length > 0) {
      await prisma.userScreenAccess.createMany({
        data: expandChildren(screenKeys).map((key: string) => ({ userId, screenKey: key })),
      });
    }

    emitEvent('staff_update', { action: 'SCREENS_UPDATED', userId, screenKeys });
    res.json({ message: 'Screen permissions updated', screenKeys });
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

// ─── GRANULAR PERMISSIONS ──────────────────────────────────────

router.get('/:id/screens/permissions', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  try {
    const userId = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!target) return res.status(404).json({ message: 'User not found' });

    const roleDefaults = expandChildren(getRoleDefaultKeys(target.role.name));

    const access = await prisma.userScreenAccess.findMany({
      where: { userId },
      select: { screenKey: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    });
    const permMap: Record<string, { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }> = {};
    for (const a of access) {
      if (a.canCreate || a.canRead || a.canUpdate || a.canDelete) {
        permMap[a.screenKey] = { canCreate: a.canCreate, canRead: a.canRead, canUpdate: a.canUpdate, canDelete: a.canDelete };
      }
    }
    res.json({ allScreens: ALL_SCREENS, permissions: permMap, roleDefaults });
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.put('/:id/screens/permissions', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  try {
    const userId = Number(req.params.id);
    const { screens } = req.body;
    if (!screens || typeof screens !== 'object') {
      return res.status(400).json({ message: 'screens must be an object mapping screenKey to permissions' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role.name === 'SUPER_ADMIN') {
      return res.json({ message: 'Super admin has unrestricted access' });
    }

    // Role defaults are non-editable — only save non-default screens
    const roleDefaults = new Set(expandChildren(getRoleDefaultKeys(user.role.name)));

    // Delete existing non-default entries
    await prisma.userScreenAccess.deleteMany({ where: { userId } });

    // Save all screens (default + extra) with granular permissions
    const entries = Object.entries(screens)
      .filter(([key, perm]: [string, any]) => {
        if (key.length === 0) return false;
        const crud = [perm.canCreate ?? false, perm.canRead ?? false, perm.canUpdate ?? false, perm.canDelete ?? false];
        return crud.some(Boolean);
      })
      .flatMap(([key, perm]: [string, any]) => {
        const crud = {
          canCreate: perm.canCreate ?? false,
          canRead: perm.canRead ?? false,
          canUpdate: perm.canUpdate ?? false,
          canDelete: perm.canDelete ?? false,
        };
        const children = KNOWN_CHILDREN[key] || [];
        return [
          { userId, screenKey: key, ...crud },
          ...children.map(childKey => ({ userId, screenKey: childKey, ...crud })),
        ];
      });
    if (entries.length > 0) {
      await prisma.userScreenAccess.createMany({
        data: entries,
      });
    }

    emitEvent('staff_update', { action: 'PERMISSIONS_UPDATED', userId, screens });
    res.json({ message: 'Granular permissions updated', screens });
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

export default router;
