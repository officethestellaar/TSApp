import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles, authorizePermission, AuthRequest } from '../middleware/auth';
import { emitEvent } from '../lib/socket';
import { sendPushNotification, getTokensForUser } from '../lib/push';
import { clearCachePattern } from '../lib/cache';
import { createAuditLog } from '../lib/audit';
import { commitToLedger } from '../lib/ledger';
import { sendPaymentConfirmation } from '../lib/whatsapp';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/payment-proofs';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'PAY-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});
const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    if (allowed.test(file.mimetype) || allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});

const router = express.Router();

// Get all invoices
router.get('/invoices', authenticateToken, authorizePermission('billing', 'read'), async (req: AuthRequest, res) => {
  try {
    const { search, status } = req.query;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const where: any = {};
    
    // RLS: Members only see their own
    if (role === 'MEMBER') {
      where.memberId = userId;
    }

    if (status && status !== 'ALL') where.status = status;

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search) } },
        { member: { nameAsAadhaar: { contains: String(search), mode: 'insensitive' } } },
        { walkInGuest: { name: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        member: true,
        walkInGuest: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get member's own invoices
router.get('/my-invoices', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const invoices = await prisma.invoice.findMany({
      where: { memberId: userId },
      include: {
        member: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Member: Request Invoice Cancellation
router.post('/invoice/:id/request-cancellation', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user?.userId;
    const role = req.user?.role;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { member: true, walkInGuest: true }
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    
    if (role === 'MEMBER' && invoice.memberId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (invoice.status === 'CANCELLED' || invoice.status === 'PAID') {
      return res.status(400).json({ message: 'Only unpaid active invoices can be requested for cancellation.' });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { cancellationStatus: 'PENDING' }
    });

    // Notify Admins
    const customerName = invoice.member?.nameAsAadhaar || invoice.walkInGuest?.name || 'Unknown';
    emitEvent('new_notification', {
      title: 'Cancellation Request',
      message: `${customerName} has requested to cancel invoice ${invoice.invoiceNumber}.`,
      type: 'invoice',
      role: 'ADMIN'
    });

    await createAuditLog({
      action: 'CANCELLATION_REQUESTED',
      entityType: 'INVOICE',
      entityId: invoice.invoiceNumber,
      description: `${customerName} requested cancellation of invoice.`,
      user: { userId: userId!, name: req.user!.name, role: req.user!.role }
    });

    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: Process Cancellation Request
router.patch('/invoice/:id/process-cancellation', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { action } = req.body; // APPROVED or REJECTED
    const userId = req.user?.userId;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { member: true }
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const data: any = { cancellationStatus: action };
    if (action === 'APPROVED') {
      data.status = 'CANCELLED';
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data
    });

    await createAuditLog({
      action: action === 'APPROVED' ? 'CANCELLATION_APPROVED' : 'CANCELLATION_REJECTED',
      entityType: 'INVOICE',
      entityId: invoice.invoiceNumber,
      description: `Cancellation request ${action.toLowerCase()} by ${req.user!.name}.`,
      user: { userId: userId!, name: req.user!.name, role: req.user!.role }
    });

    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single invoice
router.get('/invoice/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const invoiceId = Number(req.params.id);

    const invoice = await prisma.invoice.findUnique({
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

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // RLS Check
    if (role === 'MEMBER' && invoice.memberId !== userId) {
      return res.status(403).json({ message: 'Access denied to this treasury node' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create invoice for a member
router.post('/invoice', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'DATA_OPERATOR', 'ACCOUNTANT'), authorizePermission('billing', 'create'), async (req: AuthRequest, res) => {
  try {
    const { memberId, department, items, isMember } = req.body;
    
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
    
    let resolvedMemberId: number | null = null;
    let resolvedWalkInGuestId: number | null = null;
    let customerName = '';
    let discount = 0;

    if (isMember === false) {
      if (req.body.guestName) {
        const existing = await prisma.walkInGuest.findFirst({
          where: { name: { equals: req.body.guestName, mode: 'insensitive' } },
        });
        if (existing) {
          resolvedWalkInGuestId = existing.id;
          customerName = existing.name;
          if (req.body.guestContact && !existing.contact) {
            await prisma.walkInGuest.update({
              where: { id: existing.id },
              data: { contact: req.body.guestContact },
            });
          }
        } else {
          const created = await prisma.walkInGuest.create({
            data: { name: req.body.guestName, contact: req.body.guestContact || null },
          });
          resolvedWalkInGuestId = created.id;
          customerName = created.name;
        }
      } else {
        customerName = 'Walk-in Guest';
      }
    } else {
      resolvedMemberId = Number(memberId);
      const member = await prisma.member.findUnique({ where: { id: resolvedMemberId } });
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

    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${1000 + count + 1}`;

    const invoice = await prisma.invoice.create({
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
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            amount: Number(item.unitPrice * item.quantity),
          })),
        },
      },
      include: { items: true, member: true, walkInGuest: true },
    });

    emitEvent('new_invoice', { 
      invoiceNumber: invoice.invoiceNumber, 
      memberName: customerName,
      total: invoice.total 
    });

    if (resolvedMemberId) {
      const memberTokens = getTokensForUser(undefined, resolvedMemberId);
      for (const token of memberTokens) {
        sendPushNotification(token, 'New Invoice', `Invoice ${invoice.invoiceNumber} for ₹${invoice.total}`, {
          screen: '/(member)/billing',
          id: invoice.id,
        });
      }
    }

    await createAuditLog({
      action: 'INVOICE_GENERATED',
      entityType: 'INVOICE',
      entityId: invoice.invoiceNumber,
      description: `New ${department} invoice generated for ${customerName}. Amount: ₹${invoice.total}`,
      user: {
        userId: req.user!.userId,
        name: req.user!.name || 'System',
        role: req.user!.role
      }
    });

    await commitToLedger({
      staffId: req.user!.userId,
      staffName: req.user!.name || 'System',
      memberName: customerName,
      memberId: isMember && resolvedMemberId ? `MEMBER-${resolvedMemberId}` : `WALKIN-${resolvedWalkInGuestId}`,
      amount: Number(invoice.total),
      type: 'INVOICE_GENERATION',
      description: `Generated ${department} invoice: ${invoice.invoiceNumber}`
    });

    clearCachePattern('report_');

    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to create invoice' });
  }
});

// Record payment
router.post('/payment', authenticateToken, uploadProof.single('proof'), async (req: AuthRequest, res) => {
  try {
    const { invoiceId, amount, paymentMode, transactionId, referenceNumber } = req.body;
    const userId = req.user?.userId;
    const proofUrl = req.file ? req.file.path : null;

    if (!userId) return res.status(401).json({ message: 'User not identified' });

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount.' });
    }

    if (!transactionId && !referenceNumber && !proofUrl) {
      return res.status(400).json({ message: 'Provide a Transaction ID, Cheque No., or upload a payment screenshot.' });
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: Number(invoiceId) } });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    if (invoice.status === 'PAID') return res.status(400).json({ message: 'Invoice is already settled.' });
    if (invoice.status === 'CANCELLED') return res.status(400).json({ message: 'Invoice has been cancelled.' });

    const count = await prisma.payment.count();
    const receiptNumber = `RCP-${new Date().getFullYear()}-${1000 + count + 1}`;

    const isMemberPayment = req.user?.role === 'MEMBER';

    const payment = await prisma.$transaction(async (tx) => {
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
      
      if (!updatedInvoice) throw new Error('Invoice not found');

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

      emitEvent('payment_received', { 
        invoiceNumber: updatedInvoice.invoiceNumber, 
        memberName: customerName,
        amount,
        balance: remainingBalance > 0 ? remainingBalance : 0
      });

      await createAuditLog({
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: p.receiptNumber,
        description: `Payment of ₹${amount} recorded for ${customerName} (Invoice: ${updatedInvoice.invoiceNumber})`,
        user: {
          userId,
          name: req.user!.name || 'System',
          role: req.user!.role
        }
      });

      await commitToLedger({
        staffId: userId,
        staffName: req.user!.name || 'System',
        memberName: customerName,
        memberId: updatedInvoice.member?.membershipNumber || `WALKIN-${updatedInvoice.walkInGuestId}` || 'GUEST',
        amount: Number(amount),
        type: 'PAYMENT_CAPTURE',
        description: `Recorded payment for ${updatedInvoice.invoiceNumber}. Mode: ${paymentMode}. TxID: ${transactionId || 'N/A'}`
      });

      clearCachePattern('report_');

      return p;
    });

    res.status(201).json(payment);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Payment failed' });
  }
});

// Get payments pending approval (STAFF ONLY)
router.get('/payments/pending', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
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
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Approve pending payment (STAFF ONLY)
router.post('/payment/:id/approve', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const paymentId = parseInt(req.params.id!, 10);
    if (isNaN(paymentId)) {
      return res.status(400).json({ message: 'Invalid payment ID.' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { member: true, walkInGuest: true } } },
    });

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.invoice.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ message: 'Invoice is not pending approval.' });
    }

    const memberName = payment.invoice.member?.nameAsAadhaar || payment.invoice.walkInGuest?.name || 'Unknown';
    const balance = payment.invoice.total - payment.amount;

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: 'PAID' },
      });

      if (payment.invoice.department === 'AMC' && payment.invoice.memberId) {
        await tx.member.update({
          where: { id: payment.invoice.memberId! },
          data: { amcStatus: 'PAID', accessStatus: 'ENABLED' },
        });
      }
    });

    await createAuditLog({
      action: 'PAYMENT_APPROVED',
      entityType: 'PAYMENT',
      entityId: payment.receiptNumber,
      description: `Payment of ₹${payment.amount} for ${payment.invoice.invoiceNumber} approved by ${req.user!.name}.`,
      user: { userId: req.user!.userId, name: req.user!.name, role: req.user!.role },
    });

    emitEvent('payment_received', {
      invoiceNumber: payment.invoice.invoiceNumber,
      amount: payment.amount,
    });

    emitEvent('payment_confirmed', {
      memberName,
      invoiceNumber: payment.invoice.invoiceNumber,
      invoiceTotal: payment.invoice.total,
      amountReceived: payment.amount,
      balance: balance > 0 ? balance : 0,
    });

    const memberPhone = payment.invoice.member?.whatsappNumber || payment.invoice.member?.mobileNumber || null;
    if (memberPhone) {
      const cleanPhone = memberPhone.replace(/[^0-9]/g, '');
      sendPaymentConfirmation(cleanPhone, memberName, payment.invoice.invoiceNumber, payment.amount, balance > 0 ? balance : 0);
    }

    clearCachePattern('report_');
    res.json({ message: 'Payment approved and invoice settled.' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Approval failed' });
  }
});

// Reject pending payment (STAFF ONLY)
router.post('/payment/:id/reject', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const paymentId = parseInt(req.params.id!, 10);
    if (isNaN(paymentId)) {
      return res.status(400).json({ message: 'Invalid payment ID.' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.invoice.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ message: 'Invoice is not pending approval.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } });
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: 'UNPAID' },
      });
    });

    await createAuditLog({
      action: 'PAYMENT_REJECTED',
      entityType: 'PAYMENT',
      entityId: payment.receiptNumber,
      description: `Payment of ₹${payment.amount} for ${payment.invoice.invoiceNumber} rejected by ${req.user!.name}.`,
      user: { userId: req.user!.userId, name: req.user!.name, role: req.user!.role },
    });

    clearCachePattern('report_');
    res.json({ message: 'Payment rejected and invoice reverted to unpaid.' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Rejection failed' });
  }
});

// Edit invoice (SUPER_ADMIN ONLY)
router.patch('/invoice/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), authorizePermission('billing', 'update'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, discount, gst, total, status } = req.body;
    
    const oldInvoice = await prisma.invoice.findUnique({ where: { id } });
    
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        amount: amount ? Number(amount) : undefined,
        discount: discount ? Number(discount) : undefined,
        gst: gst ? Number(gst) : undefined,
        total: total ? Number(total) : undefined,
        status: status || undefined
      }
    });
    
    const user = req.user!;
    const fieldLabels: Record<string, string> = { amount: 'Amount', discount: 'Discount', gst: 'GST', total: 'Total', status: 'Status' };
    const changes: string[] = [];
    if (oldInvoice) {
      for (const [key, label] of Object.entries(fieldLabels)) {
        const oldVal = (oldInvoice as any)[key];
        const newVal = (invoice as any)[key];
        if (String(oldVal) !== String(newVal)) {
          changes.push(`${label}: ${oldVal ?? 'empty'} → ${newVal ?? 'empty'}`);
        }
      }
    }
    await createAuditLog({
      action: 'INVOICE_UPDATED',
      entityType: 'INVOICE',
      entityId: invoice.invoiceNumber,
      description: `${user.name} updated invoice ${invoice.invoiceNumber} — ${changes.join(', ') || 'no fields changed'}`,
      oldData: oldInvoice,
      newData: invoice,
      user: { userId: user.userId, name: user.name, role: user.role }
    });
    
    clearCachePattern('report_');
    res.json(invoice);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to update invoice', error: error.message });
  }
});

// Delete invoice (SUPER_ADMIN ONLY)
router.delete('/invoice/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), authorizePermission('billing', 'delete'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    
    const oldInvoice = await prisma.invoice.findUnique({ where: { id } });
    
    await prisma.$transaction(async (tx) => {
      // 1. Delete associated payments
      await tx.payment.deleteMany({ where: { invoiceId: id } });
      
      // 2. Delete associated items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      
      // 3. Delete the invoice itself
      await tx.invoice.delete({ where: { id } });
    });
    
    const user = req.user!;
    await createAuditLog({
      action: 'INVOICE_DELETED',
      entityType: 'INVOICE',
      entityId: oldInvoice?.invoiceNumber,
      description: `${user.name} deleted invoice ${oldInvoice?.invoiceNumber || id}`,
      oldData: oldInvoice,
      user: { userId: user.userId, name: user.name, role: user.role }
    });
    
    clearCachePattern('report_');
    res.json({ message: 'Invoice permanently deleted' });
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to delete invoice', error: error.message });
  }
});

// Daily check for AMC defaulters (can be called by a cron job)
router.post('/check-amc-defaulters', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const gracePeriodEnd = new Date(currentYear, 0, 15); // Jan 15th

    if (today > gracePeriodEnd) {
      const defaulters = await prisma.member.updateMany({
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
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
