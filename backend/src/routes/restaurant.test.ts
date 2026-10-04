import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import restaurantRouter from './restaurant';
import prisma from '../lib/prisma';

// Mock middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { userId: 1, role: 'ADMIN', name: 'Test Staff' };
    next();
  },
  authorizeRoles: () => (req: any, res: any, next: any) => next(),
  authorizePermission: () => (req: any, res: any, next: any) => next(),
  authorizePermissionOrMember: () => (req: any, res: any, next: any) => next(),
}));

// Mock socket, cache, audit, ledger
vi.mock('../lib/socket', () => ({
  emitEvent: vi.fn(),
}));
vi.mock('../lib/cache', () => ({
  clearCachePattern: vi.fn(),
}));
vi.mock('../lib/audit', () => ({
  createAuditLog: vi.fn(),
}));
vi.mock('../lib/ledger', () => ({
  commitToLedger: vi.fn(),
}));

// Mock Prisma
vi.mock('../lib/prisma', () => {
  const mockPrisma: any = {
    restaurantTable: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    orderItem: {
      create: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      count: vi.fn(),
      create: vi.fn(),
    },
    member: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    menuItem: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === 'function') return await cb(mockPrisma);
      return cb;
    }),
  };
  return { default: mockPrisma };
});

const app = express();
app.use(express.json());
app.use('/api/restaurant', restaurantRouter);

describe('Restaurant POS Clearance and Billing Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/restaurant/tables/:id/clear', () => {
    it('should reject clearing an occupied table when no bill/invoice has been created', async () => {
      vi.mocked(prisma.restaurantTable.findUnique).mockResolvedValue({
        id: 1,
        number: 'T1',
        capacity: 4,
        floor: 'Main Floor',
        status: 'OCCUPIED',
        orders: [
          {
            id: 101,
            orderNumber: 'KOT-2026-1001',
            status: 'OPEN',
            invoice: null,
          } as any,
        ],
      } as any);

      const res = await request(app).post('/api/restaurant/tables/1/clear');
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot clear occupied table. Please create bill and invoice first.');
      expect(res.body.code).toBe('BILL_NOT_CREATED');
    });

    it('should reject clearing a table when bill is created but unpaid', async () => {
      vi.mocked(prisma.restaurantTable.findUnique).mockResolvedValue({
        id: 1,
        number: 'T1',
        capacity: 4,
        floor: 'Main Floor',
        status: 'BILL_PENDING',
        orders: [
          {
            id: 101,
            orderNumber: 'KOT-2026-1001',
            status: 'BILLED',
            invoice: {
              id: 501,
              invoiceNumber: 'INV-POS-2026-10001',
              total: 850,
              status: 'UNPAID',
            },
          } as any,
        ],
      } as any);

      const res = await request(app).post('/api/restaurant/tables/1/clear');
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('is unpaid. Please collect payment first.');
      expect(res.body.code).toBe('BILL_UNPAID');
    });

    it('should allow clearing a table when all active orders have been paid', async () => {
      vi.mocked(prisma.restaurantTable.findUnique).mockResolvedValue({
        id: 1,
        number: 'T1',
        capacity: 4,
        floor: 'Main Floor',
        status: 'OCCUPIED',
        orders: [
          {
            id: 101,
            orderNumber: 'KOT-2026-1001',
            status: 'BILLED',
            invoice: {
              id: 501,
              invoiceNumber: 'INV-POS-2026-10001',
              total: 850,
              status: 'PAID',
            },
          } as any,
        ],
      } as any);

      vi.mocked(prisma.restaurantTable.update).mockResolvedValue({
        id: 1,
        number: 'T1',
        capacity: 4,
        floor: 'Main Floor',
        status: 'AVAILABLE',
      } as any);

      const res = await request(app).post('/api/restaurant/tables/1/clear');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cleared successfully and is now available');
      expect(res.body.table.status).toBe('AVAILABLE');
      expect(prisma.restaurantTable.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'AVAILABLE' },
      });
    });

    it('should allow clearing a table with no active orders', async () => {
      vi.mocked(prisma.restaurantTable.findUnique).mockResolvedValue({
        id: 2,
        number: 'T2',
        capacity: 2,
        floor: 'Main Floor',
        status: 'AVAILABLE',
        orders: [],
      } as any);

      vi.mocked(prisma.restaurantTable.update).mockResolvedValue({
        id: 2,
        number: 'T2',
        capacity: 2,
        floor: 'Main Floor',
        status: 'AVAILABLE',
      } as any);

      const res = await request(app).post('/api/restaurant/tables/2/clear');
      expect(res.status).toBe(200);
      expect(res.body.table.status).toBe('AVAILABLE');
    });
  });

  describe('POST /api/restaurant/order/:id/bill', () => {
    it('should create bill and invoice once and lock table in BILL_PENDING status', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 101,
        orderNumber: 'KOT-2026-1001',
        tableId: 1,
        memberId: null,
        paxCount: 2,
        status: 'OPEN',
        invoiceId: null,
        invoice: null,
        table: { id: 1, number: 'T1' },
        member: null,
        items: [
          {
            id: 1,
            menuItemId: 10,
            quantity: 2,
            isCustom: false,
            menuItem: { name: 'Paneer Tikka', price: 200, category: 'FOOD' },
          },
        ],
      } as any);

      vi.mocked(prisma.member.upsert).mockResolvedValue({ id: 999, membershipNumber: 'GUEST-001' } as any);
      vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ nextval: 101n }] as any);
      vi.mocked(prisma.invoice.create).mockResolvedValue({
        id: 501,
        invoiceNumber: 'INV-POS-2026-10101',
        total: 420,
        discount: 0,
        status: 'UNPAID',
      } as any);

      const res = await request(app).post('/api/restaurant/order/101/bill');
      expect(res.status).toBe(200);
      expect(res.body.invoice.invoiceNumber).toBe('INV-POS-2026-10101');
      // Verifies table is marked BILL_PENDING (NOT available)
      expect(prisma.restaurantTable.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'BILL_PENDING' },
      });
      // Verifies order is marked BILLED with invoiceId
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { status: 'BILLED', invoiceId: 501 },
      });
    });

    it('should not create a second invoice if order has already been billed (idempotency)', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 101,
        orderNumber: 'KOT-2026-1001',
        tableId: 1,
        memberId: null,
        paxCount: 2,
        status: 'BILLED',
        invoiceId: 501,
        invoice: {
          id: 501,
          invoiceNumber: 'INV-POS-2026-10101',
          total: 420,
          discount: 0,
          status: 'UNPAID',
        },
        table: { id: 1, number: 'T1' },
        member: null,
        items: [],
      } as any);

      const res = await request(app).post('/api/restaurant/order/101/bill');
      expect(res.status).toBe(200);
      expect(res.body.alreadyExists).toBe(true);
      expect(res.body.invoice.invoiceNumber).toBe('INV-POS-2026-10101');
      // Invoice.create should NOT be called again
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/restaurant/order/:id/pay', () => {
    it('should settle invoice, close order, and release table to AVAILABLE status upon payment', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 101,
        orderNumber: 'KOT-2026-1001',
        tableId: 1,
        table: { id: 1, number: 'T1' },
        member: null,
        invoice: {
          id: 501,
          invoiceNumber: 'INV-POS-2026-10101',
          total: 420,
          status: 'UNPAID',
        },
      } as any);

      vi.mocked(prisma.payment.count).mockResolvedValue(10);
      vi.mocked(prisma.payment.create).mockResolvedValue({
        id: 1,
        receiptNumber: 'RCP-2026-1011',
        amount: 420,
      } as any);

      const res = await request(app)
        .post('/api/restaurant/order/101/pay')
        .send({ amount: 420, paymentMode: 'CASH' });

      expect(res.status).toBe(200);
      expect(res.body.tableStatus).toBe('AVAILABLE');
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 501 },
        data: { status: 'PAID' },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { status: 'PAID' },
      });
      expect(prisma.restaurantTable.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'AVAILABLE' },
      });
    });
  });
});
