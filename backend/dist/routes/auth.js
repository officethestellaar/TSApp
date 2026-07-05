"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const email_1 = require("../lib/email");
const backup_1 = require("../services/backup");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // 1. Check if it's a Staff User
        const user = await prisma_1.default.user.findUnique({
            where: { email },
            include: { role: true },
        });
        if (user && (await bcryptjs_1.default.compare(password, user.password))) {
            if (user.status !== 'APPROVED') {
                return res.status(403).json({ message: 'Account pending approval or disabled' });
            }
            if (user.locked) {
                return res.status(403).json({ message: 'Account has been locked. Contact administrator.' });
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role.name, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
            return res.json({
                token,
                user: { id: user.id, email: user.email, name: user.name, role: user.role.name },
            });
        }
        // 2. Check if it's a Member (Login via Email, Mobile or Membership Number)
        const member = await prisma_1.default.member.findFirst({
            where: {
                OR: [
                    { email: email },
                    { mobileNumber: email },
                    { membershipNumber: email }
                ]
            }
        });
        if (member && member.password && (await bcryptjs_1.default.compare(password, member.password))) {
            if (member.status !== 'APPROVED') {
                return res.status(403).json({ message: 'Membership not yet active or approved' });
            }
            const token = jsonwebtoken_1.default.sign({ userId: member.id, role: 'MEMBER', name: member.nameAsAadhaar }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({
                token,
                user: {
                    id: member.id,
                    email: member.email,
                    name: member.nameAsAadhaar,
                    role: 'MEMBER',
                    membershipNumber: member.membershipNumber
                },
            });
        }
        // 3. Check if it's a Family Member
        const familyMember = await prisma_1.default.familyMember.findFirst({
            where: {
                OR: [
                    { email: email },
                    { mobileNumber: email }
                ]
            }
        });
        if (familyMember && familyMember.password && (await bcryptjs_1.default.compare(password, familyMember.password))) {
            if (familyMember.status !== 'APPROVED') {
                return res.status(403).json({ message: 'Affiliate access not yet approved' });
            }
            // Treat family member as a regular MEMBER but with their own affiliateId
            const token = jsonwebtoken_1.default.sign({
                userId: familyMember.memberId,
                affiliateId: familyMember.id,
                role: 'MEMBER',
                name: familyMember.name
            }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({
                token,
                user: {
                    id: familyMember.memberId,
                    affiliateId: familyMember.id,
                    email: familyMember.email,
                    name: familyMember.name,
                    role: 'MEMBER',
                    membershipNumber: familyMember.membershipNumber
                },
            });
        }
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Logout — triggers a backup snapshot
router.post('/logout', auth_1.authenticateToken, async (req, res) => {
    const name = req.user?.name || 'Unknown';
    console.log(`[Auth] User "${name}" logging out. Taking backup...`);
    // Fire-and-forget backup (don't block the response)
    (0, backup_1.performBackup)('logout').catch(err => {
        console.error('[Auth] Logout backup failed:', err?.message);
    });
    res.json({ message: 'Logged out. Registry snapshot initiated.' });
});
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log(`[Auth] Forgot password request initiated for: ${email}`);
    try {
        if (!email) {
            console.warn('[Auth] Forgot password attempt with missing email.');
            return res.status(400).json({ message: 'Identity node required.' });
        }
        // Check both User and Member tables
        let entity = await prisma_1.default.user.findUnique({ where: { email } });
        let type = 'USER';
        if (!entity) {
            entity = await prisma_1.default.member.findFirst({ where: { email } });
            type = 'MEMBER';
        }
        if (!entity) {
            console.log(`[Auth] No entity found for email: ${email}. Returning generic success.`);
            // For security, don't reveal if user exists or not
            return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }
        console.log(`[Auth] Found ${type} node for email: ${email}. Performing temporary auto-reset...`);
        const defaultPassword = `TheStellaarMember_${entity.id}`;
        const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 10);
        if (type === 'USER') {
            await prisma_1.default.user.update({
                where: { id: entity.id },
                data: {
                    password: hashedPassword,
                    resetPasswordToken: null,
                    resetPasswordExpires: null
                }
            });
        }
        else {
            await prisma_1.default.member.update({
                where: { id: entity.id },
                data: {
                    password: hashedPassword,
                    resetPasswordToken: null,
                    resetPasswordExpires: null
                }
            });
        }
        console.log(`[Auth] Password auto-reset to ${defaultPassword} for ${email}.`);
        // Still try to send an email, but it's now a notification of the reset
        try {
            await (0, email_1.sendResetPasswordEmail)(email, defaultPassword);
        }
        catch (e) {
            console.warn('[Auth] Notification email failed, but password was reset.');
        }
        res.json({
            message: 'IDENTITY_RESET: Your security key has been reset to the default protocol format.',
            tempPassword: defaultPassword
        });
    }
    catch (error) {
        console.error('[Auth] Critical failure during forgot password workflow:', error);
        res.status(500).json({ message: 'Internal server error during security node transmission.' });
    }
});
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    try {
        // Find User or Member with this valid token
        let user = await prisma_1.default.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() }
            }
        });
        let member = null;
        if (!user) {
            member = await prisma_1.default.member.findFirst({
                where: {
                    resetPasswordToken: token,
                    resetPasswordExpires: { gt: new Date() }
                }
            });
        }
        if (!user && !member) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        if (user) {
            await prisma_1.default.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetPasswordToken: null,
                    resetPasswordExpires: null
                }
            });
        }
        else if (member) {
            await prisma_1.default.member.update({
                where: { id: member.id },
                data: {
                    password: hashedPassword,
                    resetPasswordToken: null,
                    resetPasswordExpires: null
                }
            });
        }
        res.json({ message: 'Password has been updated successfully.' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Public endpoint to get all roles for registration
router.get('/roles', async (req, res) => {
    try {
        const roles = await prisma_1.default.role.findMany({
            where: {
                name: { not: 'SUPER_ADMIN' }
            }
        });
        res.json(roles);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/register', async (req, res) => {
    const { email, password, name, roleName } = req.body;
    if (roleName === 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Super Admin registration restricted to established protocols.' });
    }
    try {
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Find the requested role or fall back to DATA_OPERATOR
        const requestedRole = await prisma_1.default.role.findUnique({
            where: { name: roleName || 'DATA_OPERATOR' }
        });
        if (!requestedRole) {
            return res.status(400).json({ message: 'Requested role node not found' });
        }
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                roleId: requestedRole.id,
                status: 'PENDING',
            },
            include: { role: true }
        });
        res.status(201).json({
            message: 'Registration successful. Please wait for admin approval.',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.name,
                status: user.status
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
