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
router.get('/table-reservations/pending', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'RESTAURANT_MANAGER'), async (req, res) => {
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
router.get('/tables', auth_1.authenticateToken, async (req, res) => {
    try {
        const tables = await prisma_1.default.restaurantTable.findMany({
            include: {
                orders: {
                    where: { status: 'OPEN' },
                    include: { items: { include: { menuItem: true } } }
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
            const count = await prisma_1.default.order.count();
            order = await prisma_1.default.order.create({
                data: {
                    orderNumber: `KOT-${new Date().getFullYear()}-${1000 + count + 1}`,
                    tableId,
                    memberId: providedMemberId || authUserId,
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
        const newItems = await Promise.all(items.map((item) => prisma_1.default.orderItem.create({
            data: {
                orderId: order.id,
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                notes: item.notes
            }
        })));
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
router.get('/unverified', auth_1.authenticateToken, async (req, res) => {
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
            include: { items: { include: { menuItem: true } }, member: true, table: true },
        });
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        // Phase 3: Dynamic Menus & Taxes
        let subtotalFood = 0;
        let subtotalSalon = 0;
        for (const item of order.items) {
            const amount = Number(item.menuItem.price) * item.quantity;
            if (item.menuItem.category === 'SALON' || item.menuItem.category === 'SPA') {
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
        // Create Invoice
        const count = await prisma_1.default.invoice.count();
        const invoiceData = {
            invoiceNumber: `INV-POS-${new Date().getFullYear()}-${1000 + count + 1}`,
            department: 'POS',
            amount: Number(subtotal),
            discount: Number(discountAmount),
            gst: Number(gstAmount),
            total: Number(totalAmount),
            dueDate: new Date(),
            status: 'UNPAID',
            items: {
                create: order.items.map(item => ({
                    description: item.menuItem.name,
                    quantity: item.quantity,
                    unitPrice: item.menuItem.price,
                    amount: Number(Number(item.menuItem.price) * item.quantity),
                })),
            },
        };
        if (order.memberId) {
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
        const invoice = await prisma_1.default.invoice.create({
            data: invoiceData
        });
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
        // Close Order and update Table
        await prisma_1.default.order.update({
            where: { id: orderId },
            data: { status: 'BILLED' },
        });
        await prisma_1.default.restaurantTable.update({
            where: { id: order.tableId },
            data: { status: 'AVAILABLE' },
        });
        // Real-time notification for Table status
        (0, socket_1.emitEvent)('table_cleared', { tableNumber: order.table.number });
        (0, socket_1.emitEvent)('new_invoice', {
            invoiceNumber: invoice.invoiceNumber,
            memberName: order.member?.nameAsAadhaar || 'Guest',
            total: invoice.total
        });
        (0, cache_1.clearCachePattern)('report_table_turnaround');
        // Return absolute discount value
        res.json({ invoice, discountAbsolute: discountAmount });
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Billing failed' });
    }
});
// Get all active orders for KDS
router.get('/kds/active', auth_1.authenticateToken, async (req, res) => {
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
router.patch('/item/:id/status', auth_1.authenticateToken, async (req, res) => {
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
            const recipes = item.menuItem.recipes;
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
                                description: `Order ${item.order.orderNumber} - ${item.menuItem.name} (${deductionAmount} deduced)`,
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
            itemName: item.menuItem.name,
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
