"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const member_1 = __importDefault(require("./member"));
const prisma_1 = __importDefault(require("../lib/prisma"));
// Mock the middleware
vitest_1.vi.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { userId: 1, role: 'ADMIN', name: 'Test Admin' };
        next();
    },
    authorizeRoles: () => (req, res, next) => next(),
    authorizePermission: () => (req, res, next) => next(),
}));
// Mock Prisma
vitest_1.vi.mock('../lib/prisma', () => ({
    default: {
        member: {
            count: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
            findFirst: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
        },
        auditLog: {
            create: vitest_1.vi.fn(),
        },
        $transaction: vitest_1.vi.fn(async (cb) => {
            if (typeof cb === 'function')
                return await cb(prisma_1.default);
            return cb;
        }),
    },
}));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/members', member_1.default);
(0, vitest_1.describe)('Member Routes AMC Logic', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should automatically waive AMC for Blue membership during registration', async () => {
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
        vitest_1.vi.mocked(prisma_1.default.member.count).mockResolvedValue(100);
        vitest_1.vi.mocked(prisma_1.default.member.create).mockResolvedValue({ ...memberData, id: 1, amcApplicable: false, amcStatus: 'PAID' });
        const response = await (0, supertest_1.default)(app)
            .post('/api/members')
            .send(memberData);
        (0, vitest_1.expect)(response.status).toBe(201);
        // Check if prisma.member.create was called with amcApplicable: false
        const createCall = vitest_1.vi.mocked(prisma_1.default.member.create).mock.calls[0][0];
        (0, vitest_1.expect)(createCall.data.amcApplicable).toBe(false);
        (0, vitest_1.expect)(createCall.data.amcStatus).toBe('PAID');
    });
    (0, vitest_1.it)('should NOT waive AMC for Gold membership during registration', async () => {
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
        vitest_1.vi.mocked(prisma_1.default.member.count).mockResolvedValue(100);
        vitest_1.vi.mocked(prisma_1.default.member.create).mockResolvedValue({ ...memberData, id: 2, amcApplicable: true, amcStatus: 'UNPAID' });
        const response = await (0, supertest_1.default)(app)
            .post('/api/members')
            .send(memberData);
        (0, vitest_1.expect)(response.status).toBe(201);
        const createCall = vitest_1.vi.mocked(prisma_1.default.member.create).mock.calls[0][0];
        // AMC should be applicable by default (or at least not forced to false)
        (0, vitest_1.expect)(createCall.data.amcApplicable).not.toBe(false);
    });
    (0, vitest_1.it)('should allow superadmin to update membership status', async () => {
        vitest_1.vi.mocked(prisma_1.default.member.findUnique).mockResolvedValue({ id: 1, nameAsAadhaar: 'John Doe', status: 'PENDING' });
        vitest_1.vi.mocked(prisma_1.default.member.update).mockResolvedValue({ id: 1, nameAsAadhaar: 'John Doe', status: 'APPROVED', accessStatus: 'ENABLED' });
        const response = await (0, supertest_1.default)(app)
            .patch('/api/members/1/status')
            .send({ status: 'APPROVED' });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.status).toBe('APPROVED');
    });
    (0, vitest_1.it)('should allow superadmin to settle AMC status from UNPAID to PAID by generating an AMC bill', async () => {
        const mockMember = { id: 1, nameAsAadhaar: 'Jane Doe', membershipNumber: 'STEL-1001-1', amcStatus: 'UNPAID', amcAmount: 5000 };
        vitest_1.vi.mocked(prisma_1.default.member.findUnique).mockResolvedValue(mockMember);
        vitest_1.vi.mocked(prisma_1.default.member.update).mockResolvedValue({ ...mockMember, amcStatus: 'PAID', amcYear: '2026', accessStatus: 'ENABLED' });
        // Mock invoice creation inside transaction
        prisma_1.default.invoice = {
            count: vitest_1.vi.fn().mockResolvedValue(10),
            create: vitest_1.vi.fn().mockResolvedValue({
                id: 1,
                invoiceNumber: 'AMC-2026-1011',
                department: 'AMC',
                amount: 5000,
                gst: 900,
                total: 5900,
                status: 'PAID',
            }),
        };
        const response = await (0, supertest_1.default)(app)
            .patch('/api/members/1/amc-status')
            .send({ amcStatus: 'PAID', paymentMode: 'CASH', amount: 5000, notes: 'Direct SuperAdmin Settle' });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.message).toContain('AMC Status updated to PAID');
        (0, vitest_1.expect)(response.body.member.amcStatus).toBe('PAID');
        (0, vitest_1.expect)(response.body.invoice.department).toBe('AMC');
    });
});
