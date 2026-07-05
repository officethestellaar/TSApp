import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import memberRouter from './member';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

// Mock the middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { userId: 1, role: 'ADMIN', name: 'Test Admin' };
    next();
  },
  authorizeRoles: () => (req: any, res: any, next: any) => next(),
}));

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  default: {
    member: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
       if (typeof cb === 'function') return await cb(prisma);
       return cb;
    }),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/members', memberRouter);

describe('Member Routes AMC Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should automatically waive AMC for Blue membership during registration', async () => {
    const memberData = {
      nameAsAadhaar: 'Blue Member',
      category: 'BLUE',
      email: 'blue@example.com',
      mobileNumber: '1234567890',
      aadhaarNumber: '123412341234',
      residentialAddress: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      dob: '1990-01-01',
      startDate: '2026-01-01',
      expiryDate: '2027-01-01',
    };

    vi.mocked(prisma.member.count).mockResolvedValue(100);
    vi.mocked(prisma.member.create).mockResolvedValue({ ...memberData, id: 1, amcApplicable: false, amcStatus: 'PAID' } as any);

    const response = await request(app)
      .post('/api/members')
      .send(memberData);

    expect(response.status).toBe(201);
    
    // Check if prisma.member.create was called with amcApplicable: false
    const createCall = vi.mocked(prisma.member.create).mock.calls[0][0];
    expect(createCall.data.amcApplicable).toBe(false);
    expect(createCall.data.amcStatus).toBe('PAID');
  });

  it('should NOT waive AMC for Gold membership during registration', async () => {
    const memberData = {
      nameAsAadhaar: 'Gold Member',
      category: 'GOLD',
      email: 'gold@example.com',
      mobileNumber: '0987654321',
      aadhaarNumber: '432143214321',
      residentialAddress: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      dob: '1990-01-01',
      startDate: '2026-01-01',
      expiryDate: '2027-01-01',
    };

    vi.mocked(prisma.member.count).mockResolvedValue(100);
    vi.mocked(prisma.member.create).mockResolvedValue({ ...memberData, id: 2, amcApplicable: true, amcStatus: 'UNPAID' } as any);

    const response = await request(app)
      .post('/api/members')
      .send(memberData);

    expect(response.status).toBe(201);
    
    const createCall = vi.mocked(prisma.member.create).mock.calls[0][0];
    // AMC should be applicable by default (or at least not forced to false)
    expect(createCall.data.amcApplicable).not.toBe(false);
  });
});
