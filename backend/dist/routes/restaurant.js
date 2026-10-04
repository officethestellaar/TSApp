"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const cache_1 = require("../lib/cache");
const audit_1 = require("../lib/audit");
const ledger_1 = require("../lib/ledger");
const router = express_1.default.Router();
// Create a Table Reservation (Member or Staff)
router.post('/table-reservation', auth_1.authenticateToken, async (req, res) => {
    try {
        const { date, time, paxCount, notes } = req.body;
        const memberId = req.user?.userId;
        const affiliateId = req.user?.affiliateId;
        if (!memberId)
            return res.status(401).json({ message: 'User not identified' });
        const reservation = await prisma_1.default.tableReservation.create({
            data: {
                memberId,
                affiliateId: affiliateId || null,
                date: new Date(date),
                time,
                paxCount,
                notes
            }
        });
        res.status(201).json({ message: 'Restaurant reservation requested successfully', reservation });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to request reservation' });
    }
});
// Admin: Get all pending table reservations
router.get('/table-reservations/pending', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'RESTAURANT_MANAGER'), (0, auth_1.authorizePermission)('restaurant-pos', 'read'), async (req, res) => {
    try {
        const requests = await prisma_1.default.tableReservation.findMany({
            where: { status: 'PENDING' },
            include: { member: { select: { nameAsAadhaar: true, membershipNumber: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Admin: Process table reservation (Approve/Reject)
router.patch('/table-reservation/:id/process', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'RESTAURANT_MANAGER'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;
        const reservation = await prisma_1.default.tableReservation.update({
            where: { id },
            data: { status }
        });
        res.json({ message: `Reservation ${status.toLowerCase()} successfully`, reservation });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to process reservation' });
    }
});
// Request cancellation of table reservation
router.patch('/table-reservation/:id/cancel', auth_1.authenticateToken, async (req, res) => {
    try {
        const reservationId = Number(req.params.id);
        const memberId = req.user?.userId;
        const affiliateId = req.user?.affiliateId;
        const reservation = await prisma_1.default.tableReservation.findUnique({
            where: { id: reservationId }
        });
        if (!reservation || reservation.memberId !== memberId || reservation.affiliateId !== (affiliateId || null)) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        const updated = await prisma_1.default.tableReservation.update({
            where: { id: reservationId },
            data: { status: 'CANCELLED' }
        });
        res.json({ message: 'Table reservation cancelled successfully', updated });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Failed to cancel reservation' });
    }
});
// Get member's table reservations
router.get('/my-table-reservations', auth_1.authenticateToken, async (req, res) => {
    try {
        const memberId = req.user?.userId;
        const affiliateId = req.user?.affiliateId;
        const reservations = await prisma_1.default.tableReservation.findMany({
            where: {
                memberId,
                affiliateId: affiliateId || null
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reservations);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get all tables
router.get('/tables', auth_1.authenticateToken, (0, auth_1.authorizePermissionOrMember)('restaurant-pos', 'read'), async (req, res) => {
    try {
        const tables = await prisma_1.default.restaurantTable.findMany({
            include: {
                orders: {
                    where: { status: { in: ['OPEN', 'BILLED'] } },
                    include: { items: { include: { menuItem: true } }, invoice: true }
                }
            },
            orderBy: { number: 'asc' }
        });
        res.json(tables);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create table (SUPER_ADMIN, ADMIN, CLUB_MANAGER)
router.post('/tables', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), async (req, res) => {
    try {
        const { number, capacity, floor } = req.body;
        if (!number || !capacity) {
            return res.status(400).json({ message: 'Table number and capacity are required.' });
        }
        const table = await prisma_1.default.restaurantTable.create({
            data: { number: String(number), capacity: Number(capacity), floor: floor || 'Main Floor' },
        });
        res.status(201).json(table);
    }
    catch (error) {
        if (error.code === 'P2002')
            return res.status(409).json({ message: 'Table number already exists.' });
        res.status(400).json({ message: error.message || 'Failed to create table' });
    }
});
// Update table (SUPER_ADMIN, ADMIN, CLUB_MANAGER)
router.put('/tables/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { number, capacity, floor } = req.body;
        const table = await prisma_1.default.restaurantTable.update({
            where: { id },
            data: { number: number ? String(number) : undefined, capacity: capacity ? Number(capacity) : undefined, floor: floor ?? undefined },
        });
        res.json(table);
    }
    catch (error) {
        if (error.code === 'P2002')
            return res.status(409).json({ message: 'Table number already exists.' });
        res.status(400).json({ message: error.message || 'Failed to update table' });
    }
});
// Delete table (SUPER_ADMIN only)
router.delete('/tables/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const table = await prisma_1.default.restaurantTable.findUnique({ where: { id }, include: { orders: { where: { status: { in: ['OPEN', 'BILLED'] } } } } });
        if (!table)
            return res.status(404).json({ message: 'Table not found.' });
        if (table.orders.length > 0)
            return res.status(400).json({ message: 'Cannot delete a table with active orders or an unpaid bill.' });
        await prisma_1.default.restaurantTable.delete({ where: { id } });
        res.json({ message: `Table ${table.number} deleted.` });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to delete table' });
    }
});
// Get menu items (optional ?department= filter)
router.get('/menu', auth_1.authenticateToken, async (req, res) => {
    try {
        const { department } = req.query;
        const where = { isAvailable: true, department: 'RESTAURANT' };
        if (department && department !== 'ALL')
            where.department = String(department);
        const menu = await prisma_1.default.menuItem.findMany({
            where,
            orderBy: { category: 'asc' }
        });
        res.json(menu);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get member's own orders
router.get('/my-orders', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const affiliateId = req.user?.affiliateId;
        const orders = await prisma_1.default.order.findMany({
            where: {
                memberId: userId,
                affiliateId: affiliateId || null
            },
            include: { table: true, items: { include: { menuItem: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create or update order (KOT)
router.post('/order', auth_1.authenticateToken, async (req, res) => {
    try {
        const { tableId, memberId: providedMemberId, paxCount, items } = req.body;
        const authUserId = req.user?.userId;
        const affiliateId = req.user?.affiliateId;
        let order = await prisma_1.default.order.findFirst({
            where: { tableId, status: 'OPEN' },
            include: { table: true }
        });
        if (!order) {
            // A generated-but-unpaid bill keeps the table locked. Refuse to start a new KOT
            // until the existing invoice is paid, otherwise the table would go double-seated.
            const pendingBillOrder = await prisma_1.default.order.findFirst({
                where: { tableId, status: 'BILLED' },
                select: {
                    id: true,
                    invoice: { select: { id: true, invoiceNumber: true, status: true, total: true } },
                },
            });
            if (pendingBillOrder) {
                return res.status(409).json({
                    message: 'Table has an unpaid bill. Record payment before starting a new order.',
                    pendingBill: pendingBillOrder,
                });
            }
            const count = await prisma_1.default.order.count();
            order = await prisma_1.default.order.create({
                data: {
                    orderNumber: `KOT-${new Date().getFullYear()}-${1000 + count + 1}`,
                    tableId,
                    memberId: providedMemberId || null,
                    affiliateId: affiliateId || null,
                    paxCount,
                    status: 'OPEN'
                },
                include: { table: true }
            });
            // Mark table as occupied
            await prisma_1.default.restaurantTable.update({
                where: { id: tableId },
                data: { status: 'OCCUPIED' },
            });
        }
        // Add items to order (KOT)
        // Create order items (SQLite doesn't support createMany)
        const newItems = await Promise.all(items.map((item) => {
            const isCustom = Boolean(item.isCustom);
            if (isCustom) {
                if (!item.customName || item.customPrice === undefined || item.customPrice === null) {
                    throw new Error('Custom items require customName and customPrice');
                }
                return prisma_1.default.orderItem.create({
                    data: {
                        orderId: order.id,
                        isCustom: true,
                        customName: String(item.customName).trim(),
                        customPrice: Number(item.customPrice),
                        quantity: item.quantity,
                        notes: item.notes,
                    },
                    include: { menuItem: true },
                });
            }
            if (!item.menuItemId) {
                throw new Error('Menu item is required for non-custom items');
            }
            return prisma_1.default.orderItem.create({
                data: {
                    orderId: order.id,
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    notes: item.notes,
                },
                include: { menuItem: true },
            });
        }));
        // Real-time notification for kitchen
        (0, socket_1.emitEvent)('new_kot', {
            orderNumber: order.orderNumber,
            tableNumber: order.table.number
        });
        res.status(201).json({ order, items: newItems });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to process KOT' });
    }
});
// Phase 5: Waiter Verification Loop
// Get unverified QR orders
router.get('/unverified', auth_1.authenticateToken, (0, auth_1.authorizePermission)('restaurant-pos', 'read'), async (req, res) => {
    try {
        const orders = await prisma_1.default.order.findMany({
            where: {
                status: 'UNVERIFIED',
                isVerified: false
            },
            include: {
                table: true,
                items: { include: { menuItem: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Verify QR order and push to KDS
router.patch('/order/:id/verify', auth_1.authenticateToken, async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const order = await prisma_1.default.order.update({
            where: { id: orderId },
            data: {
                isVerified: true,
                status: 'OPEN'
            },
            include: { table: true }
        });
        // Push to kitchen now that waiter has verified
        (0, socket_1.emitEvent)('new_kot', {
            orderNumber: order.orderNumber,
            tableNumber: order.table.number
        });
        res.json(order);
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Verification failed' });
    }
});
// Final Billing with Discount Logic
router.post('/order/:id/bill', auth_1.authenticateToken, async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const order = await prisma_1.default.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { menuItem: true } }, member: true, table: true, invoice: true },
        });
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        // Idempotency: one bill per order. If this order was already billed, return the
        // existing invoice instead of creating a second one (which would also duplicate
        // the ledger entry and re-lock the table).
        if (order.invoiceId && order.invoice) {
            return res.json({
                invoice: order.invoice,
                discountAbsolute: Number(order.invoice.discount),
                alreadyExists: true,
            });
        }
        // Claim the order before writing anything. Two concurrent bill requests would
        // otherwise both read `invoiceId: null`, both create an invoice, and the loser's
        // invoice would be orphaned. `status` is a free-form string, so BILLING works as
        // a lock without a schema change.
        const claim = await prisma_1.default.order.updateMany({
            where: { id: orderId, invoiceId: null, status: 'OPEN' },
            data: { status: 'BILLING' },
        });
        if (claim.count === 0) {
            const current = await prisma_1.default.order.findUnique({
                where: { id: orderId },
                include: { invoice: true },
            });
            if (current?.invoice) {
                return res.json({
                    invoice: current.invoice,
                    discountAbsolute: Number(current.invoice.discount),
                    alreadyExists: true,
                });
            }
            return res.status(409).json({ message: 'This order is already being billed. Please retry in a moment.' });
        }
        // Phase 3: Dynamic Menus & Taxes
        let subtotalFood = 0;
        let subtotalSalon = 0;
        for (const item of order.items) {
            const price = item.isCustom ? Number(item.customPrice) : Number(item.menuItem?.price || 0);
            const amount = price * item.quantity;
            const category = item.isCustom ? 'FOOD' : (item.menuItem?.category || 'FOOD');
            if (category === 'SALON' || category === 'SPA') {
                subtotalSalon += amount;
            }
            else {
                subtotalFood += amount;
            }
        }
        const subtotal = subtotalFood + subtotalSalon;
        // Member Discount Logic (Global 30% across all operational nodes)
        let discountAmount = 0;
        if (order.memberId) {
            // If the order has a memberId attached (not a walk-in guest), they get a flat 30% discount on EVERYTHING
            discountAmount = subtotal * 0.30;
        }
        const taxableFood = subtotalFood - (subtotalFood * (discountAmount / subtotal || 0));
        const taxableSalon = subtotalSalon - (subtotalSalon * (discountAmount / subtotal || 0));
        const gstFood = taxableFood * 0.05; // 5% GST for Food
        const gstSalon = taxableSalon * 0.18; // 18% GST for Salon
        const gstAmount = gstFood + gstSalon;
        const totalAmount = taxableFood + taxableSalon + gstAmount;
        // Create Invoice — use a DB sequence for race-safe invoice numbers, with count fallback
        let nextSeq;
        try {
            const seqResult = await prisma_1.default.$queryRaw `
        SELECT nextval('public.invoice_number_seq') as nextval
      `;
            nextSeq = Number(seqResult[0].nextval);
        }
        catch {
            const count = await prisma_1.default.invoice.count();
            nextSeq = count + 1;
        }
        const invoiceData = {
            invoiceNumber: `INV-POS-${new Date().getFullYear()}-${10000 + nextSeq}`,
            department: 'POS',
            amount: Number(subtotal),
            discount: Number(discountAmount),
            gst: Number(gstAmount),
            total: Number(totalAmount),
            dueDate: new Date(),
            status: 'UNPAID',
            items: {
                create: order.items.map(item => ({
                    description: item.isCustom ? item.customName || 'Custom Item' : item.menuItem?.name || 'Item',
                    quantity: item.quantity,
                    unitPrice: item.isCustom ? item.customPrice : item.menuItem?.price || 0,
                    amount: Number((item.isCustom ? Number(item.customPrice) : Number(item.menuItem?.price || 0)) * item.quantity),
                })),
            },
        };
        if (order.memberId) {
            // Block bill generation if member's AMC is unpaid
            const member = await prisma_1.default.member.findUnique({
                where: { id: order.memberId },
                select: { amcStatus: true, membershipNumber: true },
            });
            if (!member || member.amcStatus !== 'PAID') {
                return res.status(403).json({
                    message: 'Member AMC is unpaid. Clear AMC dues before billing.',
                    amcStatus: member?.amcStatus ?? 'NOT_FOUND',
                    membershipNumber: member?.membershipNumber ?? 'UNKNOWN',
                });
            }
            invoiceData.memberId = order.memberId;
        }
        else {
            // Safely ensure GUEST-001 exists outside the nested create to avoid race conditions and unique constraint errors
            const guestNode = await prisma_1.default.member.upsert({
                where: { membershipNumber: 'GUEST-001' },
                update: {},
                create: {
                    membershipNumber: 'GUEST-001',
                    category: 'BLUE',
                    tenure: '1_YEAR',
                    nameAsAadhaar: 'Walk-in Guest',
                    gender: 'OTHER',
                    maritalStatus: 'SINGLE',
                    occupation: 'GUEST',
                    mobileNumber: `GUEST-${Date.now()}`, // Ensure unique mobile
                    aadhaarNumber: `GUEST-${Date.now()}`, // Ensure unique aadhaar
                    residentialAddress: 'Walk-in',
                    city: 'Club',
                    state: 'Club',
                    pincode: '000000',
                    nationality: 'INDIAN',
                    bloodGroup: 'NA',
                    emergencyContactName: 'Admin',
                    emergencyContactNumber: '0000000000',
                    offerPrice: 0,
                    membershipFee: 0,
                    registrationFee: 0,
                    discountAmount: 0,
                    netAmount: 0,
                    gstAmount: 0,
                    totalAmount: 0,
                    paymentMode: 'CASH',
                    startDate: new Date(),
                    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                    dob: new Date('1990-01-01'),
                    fatherHusbandName: 'Guest'
                }
            });
            invoiceData.memberId = guestNode.id;
        }
        let invoice;
        try {
            // Create the invoice, link it to the order, and lock the table in one
            // transaction so a failure can never leave a half-billed order behind.
            invoice = await prisma_1.default.$transaction(async (tx) => {
                const created = await tx.invoice.create({ data: invoiceData });
                await tx.order.update({
                    where: { id: orderId },
                    data: { status: 'BILLED', invoiceId: created.id },
                });
                await tx.restaurantTable.update({
                    where: { id: order.tableId },
                    data: { status: 'BILL_PENDING' },
                });
                return created;
            });
        }
        catch (err) {
            // Release the claim so the guest can retry instead of being stuck in BILLING.
            await prisma_1.default.order.updateMany({
                where: { id: orderId, status: 'BILLING', invoiceId: null },
                data: { status: 'OPEN' },
            });
            throw err;
        }
        // Create Audit Log for Bill Generation
        await (0, audit_1.createAuditLog)({
            action: 'BILL_GENERATED',
            entityType: 'INVOICE',
            entityId: invoice.invoiceNumber,
            description: `Generated POS bill for ${order.memberId ? 'Member' : 'Guest'} - Total: ₹${invoice.total}`,
            user: {
                userId: req.user?.userId || 1,
                name: req.user?.name || 'System',
                role: req.user?.role || 'SYSTEM'
            }
        });
        await (0, ledger_1.commitToLedger)({
            staffId: req.user?.userId || 1,
            staffName: req.user?.name || 'System',
            memberName: order.member?.nameAsAadhaar || 'Walk-in Guest',
            memberId: order.member?.membershipNumber || 'GUEST-001',
            amount: Number(invoice.total),
            type: 'POS_BILLING',
            description: `Gourmet POS Bill: ${invoice.invoiceNumber}. Pax: ${order.paxCount}`
        });
        // Real-time notification for Table status
        (0, socket_1.emitEvent)('table_bill_pending', {
            tableNumber: order.table.number,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
        });
        (0, socket_1.emitEvent)('new_invoice', {
            invoiceNumber: invoice.invoiceNumber,
            memberName: order.member?.nameAsAadhaar || 'Guest',
            total: invoice.total
        });
        // Return absolute discount value
        res.json({ invoice, discountAbsolute: discountAmount });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Billing failed' });
    }
});
// Record payment for a generated POS bill and release the table.
// The table stays locked as BILL_PENDING until this succeeds.
router.post('/order/:id/pay', auth_1.authenticateToken, async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const { paymentMode, transactionId, referenceNumber, amount } = req.body;
        const staffId = req.user?.userId || 1;
        const staffName = req.user?.name || 'System';
        const order = await prisma_1.default.order.findUnique({
            where: { id: orderId },
            include: { table: true, member: true, invoice: true },
        });
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        if (!order.invoice)
            return res.status(400).json({ message: 'No bill has been generated for this order yet.' });
        if (order.invoice.status === 'PAID')
            return res.status(400).json({ message: 'Invoice is already settled.' });
        if (order.invoice.status === 'CANCELLED')
            return res.status(400).json({ message: 'Invoice has been cancelled.' });
        const due = Number(order.invoice.total);
        const paidAmount = amount === undefined || amount === null || amount === '' ? due : Number(amount);
        if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount.' });
        }
        if (paidAmount < due - 0.01) {
            return res.status(409).json({ message: `Partial payment not accepted. Amount due: ₹${due.toFixed(2)}` });
        }
        const memberName = order.member?.nameAsAadhaar || 'Walk-in Guest';
        const invoiceId = order.invoice.id;
        const tableNumber = order.table.number;
        const payment = await prisma_1.default.$transaction(async (tx) => {
            const count = await tx.payment.count();
            const receiptNumber = `RCP-${new Date().getFullYear()}-${1000 + count + 1}`;
            const p = await tx.payment.create({
                data: {
                    receiptNumber,
                    invoiceId,
                    amount: paidAmount,
                    paymentMode: paymentMode || 'CASH',
                    referenceNumber: referenceNumber || null,
                    transactionId: transactionId || null,
                    receivedById: staffId,
                },
            });
            // Settle the invoice, close the order, then release the table — atomically.
            await tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'PAID' },
            });
            await tx.order.update({
                where: { id: orderId },
                data: { status: 'PAID' },
            });
            await tx.restaurantTable.update({
                where: { id: order.tableId },
                data: { status: 'AVAILABLE' },
            });
            return p;
        });
        await (0, audit_1.createAuditLog)({
            action: 'PAYMENT_RECORDED',
            entityType: 'PAYMENT',
            entityId: payment.receiptNumber,
            description: `POS payment of ₹${paidAmount} received for ${order.invoice.invoiceNumber} (Table ${tableNumber}).`,
            user: { userId: staffId, name: staffName, role: req.user?.role || 'SYSTEM' },
        });
        await (0, ledger_1.commitToLedger)({
            staffId,
            staffName,
            memberName,
            memberId: order.member?.membershipNumber || 'GUEST-001',
            amount: paidAmount,
            type: 'PAYMENT_CAPTURE',
            description: `POS bill settled: ${order.invoice.invoiceNumber}. Table ${tableNumber}. Mode: ${paymentMode || 'CASH'}.`,
        });
        // Table is genuinely free now.
        (0, socket_1.emitEvent)('table_cleared', { tableNumber });
        (0, socket_1.emitEvent)('payment_confirmed', {
            memberName,
            invoiceNumber: order.invoice.invoiceNumber,
            invoiceTotal: due,
            amountReceived: paidAmount,
            balance: 0,
        });
        (0, cache_1.clearCachePattern)('report_table_turnaround');
        res.json({ payment, tableStatus: 'AVAILABLE' });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Payment failed' });
    }
});
// Clear table / make table available or non-occupied
// Enforcement:
// 1. Table must exist.
// 2. If table is OCCUPIED with open orders without invoice:
//    Reject: Cannot clear occupied table. Please create bill and invoice first.
// 3. If table has an unpaid bill (status is BILL_PENDING or invoice status is UNPAID):
//    Reject: Cannot clear table. Bill is unpaid. Please collect payment first.
// 4. When bill is paid (or table has no active unbilled/unpaid orders):
//    Allow clearing table -> status: 'AVAILABLE', emit 'table_cleared'.
router.post('/tables/:id/clear', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'RESTAURANT_MANAGER', 'CAPTAIN', 'CASHIER', 'WAITER', 'STEWARD'), async (req, res) => {
    try {
        const tableId = Number(req.params.id);
        const table = await prisma_1.default.restaurantTable.findUnique({
            where: { id: tableId },
            include: {
                orders: {
                    where: { status: { in: ['OPEN', 'BILLING', 'BILLED'] } },
                    include: { invoice: true },
                },
            },
        });
        if (!table)
            return res.status(404).json({ message: 'Table not found' });
        // Check for open orders without invoice
        const unbilledOrder = table.orders.find(o => !o.invoice || o.status === 'OPEN' || o.status === 'BILLING');
        if (unbilledOrder) {
            return res.status(400).json({
                message: 'Cannot clear occupied table. Please create bill and invoice first.',
                code: 'BILL_NOT_CREATED',
                orderNumber: unbilledOrder.orderNumber,
            });
        }
        // Check for billed orders where invoice is unpaid
        const unpaidOrder = table.orders.find(o => o.invoice && o.invoice.status !== 'PAID');
        if (unpaidOrder) {
            return res.status(400).json({
                message: `Cannot clear table. Bill ${unpaidOrder.invoice?.invoiceNumber} is unpaid. Please collect payment first.`,
                code: 'BILL_UNPAID',
                invoiceNumber: unpaidOrder.invoice?.invoiceNumber,
                amountDue: unpaidOrder.invoice?.total,
            });
        }
        // All active orders are paid or table has no active orders -> update table to AVAILABLE
        const updated = await prisma_1.default.restaurantTable.update({
            where: { id: tableId },
            data: { status: 'AVAILABLE' },
        });
        // Mark any lingering orders as PAID
        await prisma_1.default.order.updateMany({
            where: { tableId, status: { in: ['OPEN', 'BILLED'] } },
            data: { status: 'PAID' },
        });
        (0, socket_1.emitEvent)('table_cleared', { tableNumber: table.number });
        (0, cache_1.clearCachePattern)('report_table_turnaround');
        res.json({
            message: `Table ${table.number} cleared successfully and is now available.`,
            table: updated,
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Failed to clear table' });
    }
});
// Get all active orders for KDS
router.get('/kds/active', auth_1.authenticateToken, (0, auth_1.authorizePermission)('kitchen-display', 'read'), async (req, res) => {
    try {
        const orders = await prisma_1.default.order.findMany({
            where: {
                status: 'OPEN',
                items: {
                    some: {
                        status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] }
                    }
                }
            },
            include: {
                table: true,
                member: { select: { nameAsAadhaar: true } },
                items: {
                    include: { menuItem: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update Order Item status (KDS)
router.patch('/item/:id/status', auth_1.authenticateToken, (0, auth_1.authorizePermission)('kitchen-display', 'update'), async (req, res) => {
    try {
        const { status } = req.body;
        const itemId = Number(req.params.id);
        const item = await prisma_1.default.orderItem.update({
            where: { id: itemId },
            data: { status },
            include: {
                order: {
                    include: { table: true }
                },
                menuItem: {
                    include: { recipes: true }
                }
            }
        });
        // Phase 4: Strict Standardized Recipe Management
        // If item is marked as READY, deduct exact ingredient weights from the Store
        if (status === 'READY') {
            // Custom items have no menuItem, so they have no recipe to deduct.
            const recipes = item.menuItem?.recipes || [];
            if (recipes && recipes.length > 0) {
                // Execute raw transactions to handle precise float deductions safely
                await prisma_1.default.$transaction(async (tx) => {
                    for (const recipe of recipes) {
                        // Use exactWeight (grams) if available, otherwise fallback to standard quantity
                        const deductionAmount = (recipe.exactWeight || recipe.quantity) * item.quantity;
                        await tx.inventoryItem.update({
                            where: { id: recipe.inventoryItemId },
                            data: {
                                currentStock: { decrement: deductionAmount }
                            }
                        });
                        await tx.inventoryLog.create({
                            data: {
                                itemId: recipe.inventoryItemId,
                                change: -deductionAmount,
                                type: 'USAGE',
                                description: `Order ${item.order.orderNumber} - ${item.menuItem?.name || item.customName || 'Custom Item'} (${deductionAmount} deduced)`,
                                performedById: req.user?.userId || 1
                            }
                        });
                    }
                });
                // Check for low stock alerts post-deduction
                for (const recipe of recipes) {
                    const invItem = await prisma_1.default.inventoryItem.findUnique({ where: { id: recipe.inventoryItemId } });
                    if (invItem && invItem.currentStock <= invItem.minStockLevel) {
                        (0, socket_1.emitEvent)('low_stock_alert', {
                            name: invItem.name,
                            currentStock: invItem.currentStock,
                            unit: invItem.unit
                        });
                    }
                }
            }
        }
        // Real-time notification for servers
        (0, socket_1.emitEvent)('order_item_updated', {
            orderId: item.orderId,
            tableNumber: item.order.table.number,
            itemName: item.menuItem?.name || item.customName || 'Custom Item',
            status: item.status
        });
        res.json(item);
    }
    catch (error) {
        console.error('KDS update error:', error);
        res.status(400).json({ message: 'Failed to update status' });
    }
});
// Update entire Order status
router.patch('/order/:id/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await prisma_1.default.order.update({
            where: { id: Number(req.params.id) },
            data: { status },
            include: { table: true }
        });
        if (status === 'READY') {
            (0, socket_1.emitEvent)('order_ready', {
                orderNumber: order.orderNumber,
                tableNumber: order.table.number
            });
        }
        res.json(order);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update order status' });
    }
});
exports.default = router;
