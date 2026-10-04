"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const screenDefaults_1 = require("../lib/screenDefaults");
const router = express_1.default.Router();
// Get all staff users
router.get('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), (0, auth_1.authorizePermission)('users', 'read'), async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            include: { role: true, staffProfile: true },
            orderBy: { createdAt: 'desc' },
        });
        // Remove passwords from response
        const sanitizedUsers = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
        res.json(sanitizedUsers);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get current user profile
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            include: { role: true, staffProfile: true },
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update current user profile
router.patch('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, email, password } = req.body;
        const data = {};
        if (name)
            data.name = name;
        if (email)
            data.email = email;
        if (password) {
            data.password = await bcryptjs_1.default.hash(password, 10);
        }
        const user = await prisma_1.default.user.update({
            where: { id: userId },
            data,
            include: { role: true, staffProfile: true },
        });
        (0, socket_1.emitEvent)('staff_update', { action: 'UPDATED', user: { id: user.id, name: user.name } }, { userId: user.id });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update PIN
router.patch('/me/pin', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPin, newPin } = req.body;
        if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ message: 'New PIN must be exactly 4 digits' });
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: userId }, select: { pin: true } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        if (user.pin) {
            if (!currentPin)
                return res.status(400).json({ message: 'Current PIN is required to change' });
            const valid = await bcryptjs_1.default.compare(currentPin, user.pin);
            if (!valid)
                return res.status(401).json({ message: 'Current PIN is incorrect' });
        }
        const hashedPin = await bcryptjs_1.default.hash(newPin, 10);
        await prisma_1.default.user.update({ where: { id: userId }, data: { pin: hashedPin } });
        res.json({ message: 'PIN updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get all roles (for the dropdown in the UI)
router.get('/roles', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const roles = await prisma_1.default.role.findMany({
            where: {
                name: { notIn: ['SUPER_ADMIN', 'MEMBER'] }
            }
        });
        res.json(roles);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create new staff user
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        let { email, password, name, roleId, roleName, defaultCheckIn, monthlySalary } = req.body;
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        if (!roleId && roleName) {
            const role = await prisma_1.default.role.findUnique({ where: { name: roleName } });
            if (!role)
                return res.status(400).json({ message: `Role '${roleName}' not found` });
            roleId = role.id;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
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
        (0, socket_1.emitEvent)('staff_update', { action: 'CREATED', user: { id: user.id, name: user.name } }, { userId: user.id });
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
const PROTECTED_ADMINS = ['admin@stellaar.com', 'office.thestellaar@gmail.com'];
// Update staff user
router.patch('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        let { email, name, roleId, roleName, password, status } = req.body;
        const userId = Number(req.params.id);
        const target = await prisma_1.default.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (target?.email && PROTECTED_ADMINS.includes(target.email)) {
            return res.status(403).json({ message: 'This admin account cannot be modified.' });
        }
        if (!roleId && roleName) {
            const role = await prisma_1.default.role.findUnique({ where: { name: roleName } });
            if (!role)
                return res.status(400).json({ message: `Role '${roleName}' not found` });
            roleId = role.id;
        }
        const data = {};
        if (email)
            data.email = email;
        if (name)
            data.name = name;
        if (roleId)
            data.roleId = Number(roleId);
        if (status)
            data.status = status;
        if (password) {
            data.password = await bcryptjs_1.default.hash(password, 10);
        }
        const user = await prisma_1.default.user.update({
            where: { id: userId },
            data,
            include: { role: true, staffProfile: true },
        });
        (0, socket_1.emitEvent)('staff_update', { action: 'UPDATED', user: { id: user.id, name: user.name } }, { userId: user.id });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Delete staff user
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        // @ts-ignore
        if (userId === req.user.userId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        const target = await prisma_1.default.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (target?.email && PROTECTED_ADMINS.includes(target.email)) {
            return res.status(403).json({ message: 'This admin account cannot be deleted.' });
        }
        await prisma_1.default.user.delete({
            where: { id: userId },
        });
        (0, socket_1.emitEvent)('staff_update', { action: 'DELETED', userId }, { userId });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Lock/Unlock user
router.patch('/:id/lock', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { locked } = req.body;
        if (typeof locked !== 'boolean')
            return res.status(400).json({ message: 'locked must be a boolean' });
        const target = await prisma_1.default.user.findUnique({ where: { id: userId }, select: { email: true, locked: true } });
        if (!target)
            return res.status(404).json({ message: 'User not found' });
        if (target.email && PROTECTED_ADMINS.includes(target.email)) {
            return res.status(403).json({ message: 'This admin account cannot be locked.' });
        }
        const user = await prisma_1.default.user.update({
            where: { id: userId },
            data: { locked },
            select: { id: true, locked: true, name: true },
        });
        (0, socket_1.emitEvent)('staff_update', { action: locked ? 'LOCKED' : 'UNLOCKED', userId, name: user.name }, { userId });
        res.json(user);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── SCREEN PERMISSIONS ───────────────────────────────────────
// Non-editable role → default screen keys (always present, cannot be removed via UI)
function getRoleDefaultKeys(roleName) {
    return screenDefaults_1.ROLE_SCREEN_MAP[roleName] || [];
}
router.get('/screens', auth_1.authenticateToken, async (req, res) => {
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const roleDefaults = getRoleDefaultKeys(req.user.role);
    let userScreens = [];
    // Start with role defaults (read-only baseline)
    const roleDefaultPerms = (0, screenDefaults_1.expandChildren)(roleDefaults).map(key => ({
        screenKey: key,
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
    }));
    // Merge user-specific screens (allow overriding defaults per user)
    const userPerms = await prisma_1.default.userScreenAccess.findMany({
        where: { userId: req.user.userId },
        select: { screenKey: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    });
    const userMap = new Map(userPerms.map(a => [a.screenKey, a]));
    const merged = new Map();
    for (const d of roleDefaultPerms) {
        const u = userMap.get(d.screenKey);
        // If user has an explicit entry (even all-false), use it; otherwise use default
        const entry = u || d;
        // Include only if at least one CRUD is active
        if (entry.canCreate || entry.canRead || entry.canUpdate || entry.canDelete) {
            merged.set(d.screenKey, entry);
        }
        if (u)
            userMap.delete(d.screenKey);
    }
    // Add extra non-default screens that have at least one active CRUD
    for (const [, u] of userMap) {
        if (u.canCreate || u.canRead || u.canUpdate || u.canDelete) {
            merged.set(u.screenKey, u);
        }
    }
    userScreens = Array.from(merged.values());
    res.json({ allScreens: screenDefaults_1.ALL_SCREENS, userScreens, isSuperAdmin, roleDefaults: (0, screenDefaults_1.expandChildren)(roleDefaults) });
});
router.get('/:id/screens', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const target = await prisma_1.default.user.findUnique({ where: { id: userId }, include: { role: true } });
        if (!target)
            return res.status(404).json({ message: 'User not found' });
        const roleDefaults = getRoleDefaultKeys(target.role.name);
        const access = await prisma_1.default.userScreenAccess.findMany({
            where: { userId },
            select: { screenKey: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        });
        const active = access.filter(a => a.canCreate || a.canRead || a.canUpdate || a.canDelete);
        const userKeys = active.map(a => a.screenKey);
        const effective = Array.from(new Set([...(0, screenDefaults_1.expandChildren)(roleDefaults), ...userKeys]));
        res.json(effective);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.put('/:id/screens', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { screenKeys } = req.body;
        if (!Array.isArray(screenKeys))
            return res.status(400).json({ message: 'screenKeys must be an array' });
        const user = await prisma_1.default.user.findUnique({ where: { id: userId }, include: { role: true } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        if (user.role.name === 'SUPER_ADMIN') {
            return res.json({ message: 'Super admin has unrestricted access', screenKeys: screenDefaults_1.ALL_SCREENS.map(s => s.key) });
        }
        // Save all screens (role-default + extra are fully editable per user)
        await prisma_1.default.userScreenAccess.deleteMany({ where: { userId } });
        if (screenKeys.length > 0) {
            await prisma_1.default.userScreenAccess.createMany({
                data: (0, screenDefaults_1.expandChildren)(screenKeys).map((key) => ({ userId, screenKey: key })),
            });
        }
        (0, socket_1.emitEvent)('staff_update', { action: 'SCREENS_UPDATED', userId, screenKeys });
        res.json({ message: 'Screen permissions updated', screenKeys });
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── GRANULAR PERMISSIONS ──────────────────────────────────────
router.get('/:id/screens/permissions', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const target = await prisma_1.default.user.findUnique({ where: { id: userId }, include: { role: true } });
        if (!target)
            return res.status(404).json({ message: 'User not found' });
        const roleDefaults = (0, screenDefaults_1.expandChildren)(getRoleDefaultKeys(target.role.name));
        const access = await prisma_1.default.userScreenAccess.findMany({
            where: { userId },
            select: { screenKey: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        });
        const permMap = {};
        for (const a of access) {
            if (a.canCreate || a.canRead || a.canUpdate || a.canDelete) {
                permMap[a.screenKey] = { canCreate: a.canCreate, canRead: a.canRead, canUpdate: a.canUpdate, canDelete: a.canDelete };
            }
        }
        res.json({ allScreens: screenDefaults_1.ALL_SCREENS, permissions: permMap, roleDefaults });
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.put('/:id/screens/permissions', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { screens } = req.body;
        if (!screens || typeof screens !== 'object') {
            return res.status(400).json({ message: 'screens must be an object mapping screenKey to permissions' });
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: userId }, include: { role: true } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        if (user.role.name === 'SUPER_ADMIN') {
            return res.json({ message: 'Super admin has unrestricted access' });
        }
        // Role defaults are non-editable — only save non-default screens
        const roleDefaults = new Set((0, screenDefaults_1.expandChildren)(getRoleDefaultKeys(user.role.name)));
        // Delete existing non-default entries
        await prisma_1.default.userScreenAccess.deleteMany({ where: { userId } });
        // Save all screens (default + extra) with granular permissions
        const entries = Object.entries(screens)
            .filter(([key, perm]) => {
            if (key.length === 0)
                return false;
            const crud = [perm.canCreate ?? false, perm.canRead ?? false, perm.canUpdate ?? false, perm.canDelete ?? false];
            return crud.some(Boolean);
        })
            .flatMap(([key, perm]) => {
            const crud = {
                canCreate: perm.canCreate ?? false,
                canRead: perm.canRead ?? false,
                canUpdate: perm.canUpdate ?? false,
                canDelete: perm.canDelete ?? false,
            };
            const children = screenDefaults_1.KNOWN_CHILDREN[key] || [];
            return [
                { userId, screenKey: key, ...crud },
                ...children.map(childKey => ({ userId, screenKey: childKey, ...crud })),
            ];
        });
        if (entries.length > 0) {
            await prisma_1.default.userScreenAccess.createMany({
                data: entries,
            });
        }
        (0, socket_1.emitEvent)('staff_update', { action: 'PERMISSIONS_UPDATED', userId, screens });
        res.json({ message: 'Granular permissions updated', screens });
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
