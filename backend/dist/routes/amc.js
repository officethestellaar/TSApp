"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const socket_1 = require("../lib/socket");
const audit_1 = require("../lib/audit");
const n8n_1 = require("../lib/n8n");
const ledger_1 = require("../lib/ledger");
const router = express_1.default.Router();
// Multer setup for payment proof uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/amc-proofs';
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'AMC-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        if (mimetype && extname)
            return cb(null, true);
        cb(new Error('Only images and PDFs are allowed'));
    }
});
// Member: Submit AMC payment proof
router.post('/submit', auth_1.authenticateToken, upload.single('proof'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        if (role !== 'MEMBER') {
            return res.status(403).json({ message: 'Only members can submit payment proofs' });
        }
        const { amount, transactionRef, paymentDate } = req.body;
        // Requirement: Either transactionRef or photo proof must be provided
        if (!transactionRef && !req.file) {
            return res.status(400).json({
                message: 'EVIDENCE_REQUIRED: You must provide either a Transaction Reference ID or upload a Photo Proof of the payment.'
            });
        }
        const amcRequest = await prisma_1.default.aMCPaymentRequest.create({
            data: {
                memberId: userId,
                amount: Number(amount),
                transactionRef: transactionRef || null,
                paymentDate: new Date(paymentDate || new Date()),
                proofUrl: req.file ? req.file.path : null,
                status: 'PENDING'
            }
        });
        // Update member status to reflect a pending update
        await prisma_1.default.member.update({
            where: { id: userId },
            data: { amcStatus: 'PENDING_APPROVAL' }
        });
        // Notify admins
        (0, socket_1.emitEvent)('new_amc_approval_request', {
            requestId: amcRequest.id,
            memberId: userId,
            amount
        });
        res.status(201).json(amcRequest);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to submit request' });
    }
});
// Admin: List all pending AMC requests
router.get('/pending', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), async (req, res) => {
    try {
        const requests = await prisma_1.default.aMCPaymentRequest.findMany({
            where: { status: 'PENDING' },
            include: { member: { select: { nameAsAadhaar: true, membershipNumber: true, mobileNumber: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Admin: Approve/Reject AMC request
router.patch('/:id/process', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        const { status, rejectionReason } = req.body; // status: APPROVED or REJECTED
        const processorId = req.user?.userId;
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const amcRequest = await prisma_1.default.aMCPaymentRequest.findUnique({
            where: { id: requestId },
            include: { member: true }
        });
        if (!amcRequest)
            return res.status(404).json({ message: 'Request not found' });
        const updatedRequest = await prisma_1.default.aMCPaymentRequest.update({
            where: { id: requestId },
            data: {
                status,
                rejectionReason,
                processedById: processorId,
                processedAt: new Date()
            }
        });
        if (status === 'APPROVED') {
            const currentYear = String(new Date().getFullYear());
            await prisma_1.default.$transaction(async (tx) => {
                // 1. Update member status
                await tx.member.update({
                    where: { id: amcRequest.memberId },
                    data: {
                        amcStatus: 'PAID',
                        amcYear: currentYear,
                        accessStatus: 'ENABLED'
                    }
                });
                // 2. Generate paid invoice for financial records
                const count = await tx.invoice.count();
                const invoiceNumber = `AMC-${currentYear}-${1000 + count + 1}`;
                const invoice = await tx.invoice.create({
                    data: {
                        invoiceNumber,
                        memberId: amcRequest.memberId,
                        department: 'AMC',
                        amount: amcRequest.amount,
                        gst: amcRequest.amount * 0.18, // standard 18% GST for AMC
                        total: amcRequest.amount * 1.18,
                        status: 'PAID',
                        dueDate: new Date(),
                        items: {
                            create: {
                                description: `Annual Maintenance Charge - Year ${currentYear}`,
                                quantity: 1,
                                unitPrice: amcRequest.amount,
                                amount: amcRequest.amount
                            }
                        },
                        payments: {
                            create: {
                                receiptNumber: `RCP-AMC-${Date.now()}`,
                                amount: amcRequest.amount * 1.18,
                                paymentMode: 'OFFLINE_VERIFIED',
                                transactionId: amcRequest.transactionRef || 'UPLOADED_PROOF',
                                receivedById: processorId
                            }
                        }
                    }
                });
                // 3. Log to audit
                await (0, audit_1.createAuditLog)({
                    action: 'AMC_APPROVED',
                    entityType: 'MEMBER',
                    entityId: String(amcRequest.memberId),
                    description: `Approved AMC payment of ₹${amcRequest.amount} (Total w/ GST: ₹${(amcRequest.amount * 1.18).toFixed(2)}) for ${amcRequest.member.nameAsAadhaar}`,
                    user: {
                        userId: processorId,
                        name: req.user.name,
                        role: req.user.role
                    }
                });
                // 4. Commit to secondary ledger
                await (0, ledger_1.commitToLedger)({
                    staffId: processorId,
                    staffName: req.user.name,
                    memberName: amcRequest.member.nameAsAadhaar,
                    memberId: amcRequest.member.membershipNumber,
                    amount: amcRequest.amount * 1.18,
                    type: 'AMC_SETTLEMENT',
                    description: `AMC Settlement Approved: ${invoice.invoiceNumber}. Ref: ${amcRequest.transactionRef || 'Photo Proof'}`
                });
                // 5. Trigger automation
                (0, n8n_1.triggerWorkflow)('amc-approved', {
                    memberId: amcRequest.memberId,
                    memberName: amcRequest.member.nameAsAadhaar,
                    amount: amcRequest.amount,
                    reference: amcRequest.transactionRef,
                    date: new Date()
                });
            });
        }
        else {
            // Revert member status to UNPAID if rejected
            await prisma_1.default.member.update({
                where: { id: amcRequest.memberId },
                data: { amcStatus: 'UNPAID' }
            });
        }
        // Notify member via socket (if connected)
        (0, socket_1.emitEvent)('amc_request_processed', {
            requestId,
            status,
            message: status === 'APPROVED' ? 'Your AMC payment has been verified.' : `Your AMC payment was rejected: ${rejectionReason}`
        });
        // Notify finance real-time
        (0, socket_1.emitEvent)('new_invoice', { action: 'AMC_RECORDED' });
        res.json(updatedRequest);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Serve the proof files
router.get('/proof/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), async (req, res) => {
    try {
        const request = await prisma_1.default.aMCPaymentRequest.findUnique({
            where: { id: Number(req.params.id) }
        });
        if (!request || !request.proofUrl)
            return res.status(404).json({ message: 'Evidence node not found.' });
        const filePath = path_1.default.resolve(request.proofUrl);
        if (fs_1.default.existsSync(filePath)) {
            res.sendFile(filePath);
        }
        else {
            res.status(404).json({ message: 'File not found on server' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
