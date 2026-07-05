"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const push_1 = require("../lib/push");
const cache_1 = require("../lib/cache");
const audit_1 = require("../lib/audit");
const ledger_1 = require("../lib/ledger");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const proofStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/payment-proofs';
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'PAY-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path_1.default.extname(file.originalname));
    }
});
const uploadProof = (0, multer_1.default)({
    storage: proofStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|pdf/;
        if (allowed.test(file.mimetype) || allowed.test(path_1.default.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        }
        else {
            cb(new Error('Only images and PDFs are allowed'));
        }
    }
});
const router = express_1.default.Router();
// Get all invoices
router.get('/invoices', auth_1.authenticateToken, (0, auth_1.authorizePermission)('billing', 'read'), async (req, res) => {
    try {
        const { search, status } = req.query;
        const userId = req.user?.userId;
        const role = req.user?.role;
        const where = {};
        // RLS: Members only see their own
        if (role === 'MEMBER') {
            where.memberId = userId;
        }
        if (status && status !== 'ALL')
            where.status = status;
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: String(search) } },
                { member: { nameAsAadhaar: { contains: String(search), mode: 'insensitive' } } },
                { walkInGuest: { name: { contains: String(search), mode: 'insensitive' } } },
            ];
        }
        const invoices = await prisma_1.default.invoice.findMany({
            where,
            include: {
                member: true,
                walkInGuest: true,
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get member's own invoices
router.get('/my-invoices', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const invoices = await prisma_1.default.invoice.findMany({
            where: { memberId: userId },
            include: {
                member: true,
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Member: Request Invoice Cancellation
router.post('/invoice/:id/request-cancellation', auth_1.authenticateToken, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const userId = req.user?.userId;
        const role = req.user?.role;
        const invoice = await prisma_1.default.invoice.findUnique({
            where: { id },
            include: { member: true, walkInGuest: true }
        });
        if (!invoice)
            return res.status(404).json({ message: 'Invoice not found' });
        if (role === 'MEMBER' && invoice.memberId !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (invoice.status === 'CANCELLED' || invoice.status === 'PAID') {
            return res.status(400).json({ message: 'Only unpaid active invoices can be requested for cancellation.' });
        }
        const updatedInvoice = await prisma_1.default.invoice.update({
            where: { id },
            data: { cancellationStatus: 'PENDING' }
        });
        // Notify Admins
        const customerName = invoice.member?.nameAsAadhaar || invoice.walkInGuest?.name || 'Unknown';
        (0, socket_1.emitEvent)('new_notification', {
            title: 'Cancellation Request',
            message: `${customerName} has requested to cancel invoice ${invoice.invoiceNumber}.`,
            type: 'invoice',
            role: 'ADMIN'
        });
        await (0, audit_1.createAuditLog)({
            action: 'CANCELLATION_REQUESTED',
            entityType: 'INVOICE',
            entityId: invoice.invoiceNumber,
            description: `${customerName} requested cancellation of invoice.`,
            user: { userId: userId, name: req.user.name, role: req.user.role }
        });
        res.json(updatedInvoice);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Admin: Process Cancellation Request
router.patch('/invoice/:id/process-cancellation', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { action } = req.body; // APPROVED or REJECTED
        const userId = req.user?.userId;
        const invoice = await prisma_1.default.invoice.findUnique({
            where: { id },
            include: { member: true }
        });
        if (!invoice)
            return res.status(404).json({ message: 'Invoice not found' });
        const data = { cancellationStatus: action };
        if (action === 'APPROVED') {
            data.status = 'CANCELLED';
        }
        const updatedInvoice = await prisma_1.default.invoice.update({
            where: { id },
            data
        });
        await (0, audit_1.createAuditLog)({
            action: action === 'APPROVED' ? 'CANCELLATION_APPROVED' : 'CANCELLATION_REJECTED',
            entityType: 'INVOICE',
            entityId: invoice.invoiceNumber,
            description: `Cancellation request ${action.toLowerCase()} by ${req.user.name}.`,
            user: { userId: userId, name: req.user.name, role: req.user.role }
        });
        res.json(updatedInvoice);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get single invoice
router.get('/invoice/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        const invoiceId = Number(req.params.id);
        const invoice = await prisma_1.default.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                member: true,
                walkInGuest: true,
                items: true,
                payments: {
                    include: { receivedBy: { select: { name: true } } },
                },
            },
        });
        if (!invoice)
            return res.status(404).json({ message: 'Invoice not found' });
        // RLS Check
        if (role === 'MEMBER' && invoice.memberId !== userId) {
            return res.status(403).json({ message: 'Access denied to this treasury node' });
        }
        res.json(invoice);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create invoice for a member
router.post('/invoice', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'DATA_OPERATOR', 'ACCOUNTANT'), (0, auth_1.authorizePermission)('billing', 'create'), async (req, res) => {
    try {
        const { memberId, department, items, isMember } = req.body;
        const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        let resolvedMemberId = null;
        let resolvedWalkInGuestId = null;
        let customerName = '';
        let discount = 0;
        if (isMember === false) {
            if (req.body.guestName) {
                const existing = await prisma_1.default.walkInGuest.findFirst({
                    where: { name: { equals: req.body.guestName, mode: 'insensitive' } },
                });
                if (existing) {
                    resolvedWalkInGuestId = existing.id;
                    customerName = existing.name;
                    if (req.body.guestContact && !existing.contact) {
                        await prisma_1.default.walkInGuest.update({
                            where: { id: existing.id },
                            data: { contact: req.body.guestContact },
                        });
                    }
                }
                else {
                    const created = await prisma_1.default.walkInGuest.create({
                        data: { name: req.body.guestName, contact: req.body.guestContact || null },
                    });
                    resolvedWalkInGuestId = created.id;
                    customerName = created.name;
                }
            }
            else {
                customerName = 'Walk-in Guest';
            }
        }
        else {
            resolvedMemberId = Number(memberId);
            const member = await prisma_1.default.member.findUnique({ where: { id: resolvedMemberId } });
            customerName = member?.nameAsAadhaar || 'Member';
            if (member && member.membershipNumber !== 'GUEST-001') {
                discount = subtotal * 0.30;
            }
        }
        const gstRate = (department === 'RESTAURANT' || department === 'BANQUET') ? 0.05 : 0.18;
        const taxableAmount = subtotal - discount;
        const gstAmount = taxableAmount * gstRate;
        const rawTotal = taxableAmount + gstAmount;
        const roundedTotal = Math.round(rawTotal);
        const roundOff = Number((roundedTotal - rawTotal).toFixed(2));
        const count = await prisma_1.default.invoice.count();
        const invoiceNumber = `INV-${new Date().getFullYear()}-${1000 + count + 1}`;
        const invoice = await prisma_1.default.invoice.create({
            data: {
                invoiceNumber,
                memberId: resolvedMemberId,
                walkInGuestId: resolvedWalkInGuestId,
                department,
                amount: Number(subtotal),
                discount: Number(discount),
                gst: Number(gstAmount),
                roundOff,
                total: Number(roundedTotal),
                dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
                items: {
                    create: items.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: Number(item.unitPrice),
                        amount: Number(item.unitPrice * item.quantity),
                    })),
                },
            },
            include: { items: true, member: true, walkInGuest: true },
        });
        (0, socket_1.emitEvent)('new_invoice', {
            invoiceNumber: invoice.invoiceNumber,
            memberName: customerName,
            total: invoice.total
        });
        if (resolvedMemberId) {
            const memberTokens = (0, push_1.getTokensForUser)(undefined, resolvedMemberId);
            for (const token of memberTokens) {
                (0, push_1.sendPushNotification)(token, 'New Invoice', `Invoice ${invoice.invoiceNumber} for ₹${invoice.total}`, {
                    screen: '/(member)/billing',
                    id: invoice.id,
                });
            }
        }
        await (0, audit_1.createAuditLog)({
            action: 'INVOICE_GENERATED',
            entityType: 'INVOICE',
            entityId: invoice.invoiceNumber,
            description: `New ${department} invoice generated for ${customerName}. Amount: ₹${invoice.total}`,
            user: {
                userId: req.user.userId,
                name: req.user.name || 'System',
                role: req.user.role
            }
        });
        await (0, ledger_1.commitToLedger)({
            staffId: req.user.userId,
            staffName: req.user.name || 'System',
            memberName: customerName,
            memberId: isMember && resolvedMemberId ? `MEMBER-${resolvedMemberId}` : `WALKIN-${resolvedWalkInGuestId}`,
            amount: Number(invoice.total),
            type: 'INVOICE_GENERATION',
            description: `Generated ${department} invoice: ${invoice.invoiceNumber}`
        });
        (0, cache_1.clearCachePattern)('report_');
        res.status(201).json(invoice);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to create invoice' });
    }
});
// Record payment
router.post('/payment', auth_1.authenticateToken, uploadProof.single('proof'), async (req, res) => {
    try {
        const { invoiceId, amount, paymentMode, transactionId, referenceNumber } = req.body;
        const userId = req.user?.userId;
        const proofUrl = req.file ? req.file.path : null;
        if (!userId)
            return res.status(401).json({ message: 'User not identified' });
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount.' });
        }
        if (!transactionId && !referenceNumber && !proofUrl) {
            return res.status(400).json({ message: 'Provide a Transaction ID, Cheque No., or upload a payment screenshot.' });
        }
        const invoice = await prisma_1.default.invoice.findUnique({ where: { id: Number(invoiceId) } });
        if (!invoice)
            return res.status(404).json({ message: 'Invoice not found.' });
        if (invoice.status === 'PAID')
            return res.status(400).json({ message: 'Invoice is already settled.' });
        if (invoice.status === 'CANCELLED')
            return res.status(400).json({ message: 'Invoice has been cancelled.' });
        const count = await prisma_1.default.payment.count();
        const receiptNumber = `RCP-${new Date().getFullYear()}-${1000 + count + 1}`;
        const isMemberPayment = req.user?.role === 'MEMBER';
        const payment = await prisma_1.default.$transaction(async (tx) => {
            const p = await tx.payment.create({
                data: {
                    receiptNumber,
                    invoiceId: Number(invoiceId),
                    amount: Number(amount),
                    paymentMode: paymentMode || 'ONLINE',
                    referenceNumber: referenceNumber || null,
                    transactionId: transactionId || null,
                    proofUrl,
                    receivedById: isMemberPayment ? null : userId,
                },
            });
            const updatedInvoice = await tx.invoice.findUnique({ where: { id: Number(invoiceId) }, include: { member: true, walkInGuest: true } });
            const aggregateResult = await tx.payment.aggregate({
                where: { invoiceId: Number(invoiceId) },
                _sum: { amount: true },
            });
            const totalPaid = aggregateResult._sum.amount || 0;
            if (!updatedInvoice)
                throw new Error('Invoice not found');
            const remainingBalance = Number(updatedInvoice.total) - Number(totalPaid);
            if (totalPaid >= updatedInvoice.total) {
                const newStatus = isMemberPayment ? 'PENDING_APPROVAL' : 'PAID';
                await tx.invoice.update({
                    where: { id: Number(invoiceId) },
                    data: { status: newStatus },
                });
                if (!isMemberPayment && updatedInvoice.department === 'AMC' && updatedInvoice.memberId) {
                    await tx.member.update({
                        where: { id: updatedInvoice.memberId },
                        data: { amcStatus: 'PAID', accessStatus: 'ENABLED' },
                    });
                }
            }
            if (updatedInvoice.department === 'MEMBERSHIP' && updatedInvoice.memberId) {
                await tx.member.update({
                    where: { id: updatedInvoice.memberId },
                    data: { ledgerBalance: remainingBalance > 0 ? remainingBalance : 0 }
                });
            }
            const customerName = updatedInvoice.member?.nameAsAadhaar || updatedInvoice.walkInGuest?.name || 'Customer';
            const contactNumber = updatedInvoice.member?.mobileNumber || updatedInvoice.walkInGuest?.contact || 'N/A';
            console.log(`[WhatsApp API Simulated] To: ${contactNumber}`);
            console.log(`[WhatsApp API Simulated] Message: "Dear ${customerName}, we have received ₹${amount} towards ${updatedInvoice.department}. Remaining Balance: ₹${remainingBalance > 0 ? remainingBalance : 0}."`);
            (0, socket_1.emitEvent)('payment_received', {
                invoiceNumber: updatedInvoice.invoiceNumber,
                memberName: customerName,
                amount,
                balance: remainingBalance > 0 ? remainingBalance : 0
            });
            await (0, audit_1.createAuditLog)({
                action: 'PAYMENT_RECORDED',
                entityType: 'PAYMENT',
                entityId: p.receiptNumber,
                description: `Payment of ₹${amount} recorded for ${customerName} (Invoice: ${updatedInvoice.invoiceNumber})`,
                user: {
                    userId,
                    name: req.user.name || 'System',
                    role: req.user.role
                }
            });
            await (0, ledger_1.commitToLedger)({
                staffId: userId,
                staffName: req.user.name || 'System',
                memberName: customerName,
                memberId: updatedInvoice.member?.membershipNumber || `WALKIN-${updatedInvoice.walkInGuestId}` || 'GUEST',
                amount: Number(amount),
                type: 'PAYMENT_CAPTURE',
                description: `Recorded payment for ${updatedInvoice.invoiceNumber}. Mode: ${paymentMode}. TxID: ${transactionId || 'N/A'}`
            });
            (0, cache_1.clearCachePattern)('report_');
            return p;
        });
        res.status(201).json(payment);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Payment failed' });
    }
});
// Get payments pending approval (STAFF ONLY)
router.get('/payments/pending', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req, res) => {
    try {
        const invoices = await prisma_1.default.invoice.findMany({
            where: { status: 'PENDING_APPROVAL' },
            include: {
                member: { select: { nameAsAadhaar: true, membershipNumber: true } },
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 1,
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Approve pending payment (STAFF ONLY)
router.post('/payment/:id/approve', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req, res) => {
    try {
        const paymentId = parseInt(req.params.id, 10);
        if (isNaN(paymentId)) {
            return res.status(400).json({ message: 'Invalid payment ID.' });
        }
        const payment = await prisma_1.default.payment.findUnique({
            where: { id: paymentId },
            include: { invoice: true },
        });
        if (!payment)
            return res.status(404).json({ message: 'Payment not found' });
        if (payment.invoice.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({ message: 'Invoice is not pending approval.' });
        }
        await prisma_1.default.$transaction(async (tx) => {
            await tx.invoice.update({
                where: { id: payment.invoiceId },
                data: { status: 'PAID' },
            });
            if (payment.invoice.department === 'AMC' && payment.invoice.memberId) {
                await tx.member.update({
                    where: { id: payment.invoice.memberId },
                    data: { amcStatus: 'PAID', accessStatus: 'ENABLED' },
                });
            }
        });
        await (0, audit_1.createAuditLog)({
            action: 'PAYMENT_APPROVED',
            entityType: 'PAYMENT',
            entityId: payment.receiptNumber,
            description: `Payment of ₹${payment.amount} for ${payment.invoice.invoiceNumber} approved by ${req.user.name}.`,
            user: { userId: req.user.userId, name: req.user.name, role: req.user.role },
        });
        (0, socket_1.emitEvent)('payment_received', {
            invoiceNumber: payment.invoice.invoiceNumber,
            amount: payment.amount,
        });
        (0, cache_1.clearCachePattern)('report_');
        res.json({ message: 'Payment approved and invoice settled.' });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Approval failed' });
    }
});
// Reject pending payment (STAFF ONLY)
router.post('/payment/:id/reject', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req, res) => {
    try {
        const paymentId = parseInt(req.params.id, 10);
        if (isNaN(paymentId)) {
            return res.status(400).json({ message: 'Invalid payment ID.' });
        }
        const payment = await prisma_1.default.payment.findUnique({
            where: { id: paymentId },
            include: { invoice: true },
        });
        if (!payment)
            return res.status(404).json({ message: 'Payment not found' });
        if (payment.invoice.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({ message: 'Invoice is not pending approval.' });
        }
        await prisma_1.default.$transaction(async (tx) => {
            await tx.payment.delete({ where: { id: paymentId } });
            await tx.invoice.update({
                where: { id: payment.invoiceId },
                data: { status: 'UNPAID' },
            });
        });
        await (0, audit_1.createAuditLog)({
            action: 'PAYMENT_REJECTED',
            entityType: 'PAYMENT',
            entityId: payment.receiptNumber,
            description: `Payment of ₹${payment.amount} for ${payment.invoice.invoiceNumber} rejected by ${req.user.name}.`,
            user: { userId: req.user.userId, name: req.user.name, role: req.user.role },
        });
        (0, cache_1.clearCachePattern)('report_');
        res.json({ message: 'Payment rejected and invoice reverted to unpaid.' });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Rejection failed' });
    }
});
// Edit invoice (SUPER_ADMIN ONLY)
router.patch('/invoice/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), (0, auth_1.authorizePermission)('billing', 'update'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { amount, discount, gst, total, status } = req.body;
        const oldInvoice = await prisma_1.default.invoice.findUnique({ where: { id } });
        const invoice = await prisma_1.default.invoice.update({
            where: { id },
            data: {
                amount: amount ? Number(amount) : undefined,
                discount: discount ? Number(discount) : undefined,
                gst: gst ? Number(gst) : undefined,
                total: total ? Number(total) : undefined,
                status: status || undefined
            }
        });
        const user = req.user;
        const fieldLabels = { amount: 'Amount', discount: 'Discount', gst: 'GST', total: 'Total', status: 'Status' };
        const changes = [];
        if (oldInvoice) {
            for (const [key, label] of Object.entries(fieldLabels)) {
                const oldVal = oldInvoice[key];
                const newVal = invoice[key];
                if (String(oldVal) !== String(newVal)) {
                    changes.push(`${label}: ${oldVal ?? 'empty'} → ${newVal ?? 'empty'}`);
                }
            }
        }
        await (0, audit_1.createAuditLog)({
            action: 'INVOICE_UPDATED',
            entityType: 'INVOICE',
            entityId: invoice.invoiceNumber,
            description: `${user.name} updated invoice ${invoice.invoiceNumber} — ${changes.join(', ') || 'no fields changed'}`,
            oldData: oldInvoice,
            newData: invoice,
            user: { userId: user.userId, name: user.name, role: user.role }
        });
        (0, cache_1.clearCachePattern)('report_');
        res.json(invoice);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update invoice', error: error.message });
    }
});
// Delete invoice (SUPER_ADMIN ONLY)
router.delete('/invoice/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), (0, auth_1.authorizePermission)('billing', 'delete'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const oldInvoice = await prisma_1.default.invoice.findUnique({ where: { id } });
        await prisma_1.default.$transaction(async (tx) => {
            // 1. Delete associated payments
            await tx.payment.deleteMany({ where: { invoiceId: id } });
            // 2. Delete associated items
            await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
            // 3. Delete the invoice itself
            await tx.invoice.delete({ where: { id } });
        });
        const user = req.user;
        await (0, audit_1.createAuditLog)({
            action: 'INVOICE_DELETED',
            entityType: 'INVOICE',
            entityId: oldInvoice?.invoiceNumber,
            description: `${user.name} deleted invoice ${oldInvoice?.invoiceNumber || id}`,
            oldData: oldInvoice,
            user: { userId: user.userId, name: user.name, role: user.role }
        });
        (0, cache_1.clearCachePattern)('report_');
        res.json({ message: 'Invoice permanently deleted' });
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to delete invoice', error: error.message });
    }
});
// Daily check for AMC defaulters (can be called by a cron job)
router.post('/check-amc-defaulters', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const gracePeriodEnd = new Date(currentYear, 0, 15); // Jan 15th
        if (today > gracePeriodEnd) {
            const defaulters = await prisma_1.default.member.updateMany({
                where: {
                    amcApplicable: true,
                    amcStatus: 'UNPAID',
                    accessStatus: 'ENABLED',
                },
                data: {
                    accessStatus: 'DISABLED',
                },
            });
            return res.json({ message: 'AMC defaulter check complete', updated: defaulters.count });
        }
        res.json({ message: 'Still within grace period' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
