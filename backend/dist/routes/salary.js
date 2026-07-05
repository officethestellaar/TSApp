"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const { userId, month, year } = req.query;
        const where = {};
        if (userId)
            where.userId = Number(userId);
        if (month)
            where.month = Number(month);
        if (year)
            where.year = Number(year);
        const records = await prisma_1.default.staffSalary.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } } },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });
        res.json(records);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const { userId, month, year, basicPay, hra, conveyance, medicalAllowance, specialAllowance, otherAllowances, pf, esi, professionalTax, tds, otherDeductions, attendanceDays, paidDays, remarks } = req.body;
        if (!userId || !month || !year)
            return res.status(400).json({ message: 'userId, month, year required' });
        const grossPay = (basicPay || 0) + (hra || 0) + (conveyance || 0) + (medicalAllowance || 0) + (specialAllowance || 0) + (otherAllowances || 0);
        const deductions = (pf || 0) + (esi || 0) + (professionalTax || 0) + (tds || 0) + (otherDeductions || 0);
        const netPay = grossPay - deductions;
        const record = await prisma_1.default.staffSalary.create({
            data: { userId, month, year, basicPay, hra, conveyance, medicalAllowance, specialAllowance, otherAllowances, grossPay, pf, esi, professionalTax, tds, otherDeductions, netPay, attendanceDays, paidDays, remarks },
        });
        res.status(201).json(record);
    }
    catch (e) {
        if (e.code === 'P2002')
            return res.status(409).json({ message: 'Salary already exists for this month/year' });
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const data = {};
        const fields = ['basicPay', 'hra', 'conveyance', 'medicalAllowance', 'specialAllowance', 'otherAllowances', 'pf', 'esi', 'professionalTax', 'tds', 'otherDeductions', 'attendanceDays', 'paidDays', 'status', 'paymentDate', 'remarks'];
        for (const f of fields) {
            if (req.body[f] !== undefined)
                data[f] = req.body[f];
        }
        if (data.paymentDate)
            data.paymentDate = new Date(data.paymentDate);
        if (data.status === 'PAID' && !data.paymentDate)
            data.paymentDate = new Date();
        if (data.basicPay !== undefined || data.hra !== undefined || data.conveyance !== undefined || data.medicalAllowance !== undefined || data.specialAllowance !== undefined || data.otherAllowances !== undefined || data.pf !== undefined || data.esi !== undefined || data.professionalTax !== undefined || data.tds !== undefined || data.otherDeductions !== undefined) {
            const existing = await prisma_1.default.staffSalary.findUnique({ where: { id: Number(req.params.id) } });
            if (existing) {
                data.grossPay = (data.basicPay ?? existing.basicPay) + (data.hra ?? existing.hra) + (data.conveyance ?? existing.conveyance) + (data.medicalAllowance ?? existing.medicalAllowance) + (data.specialAllowance ?? existing.specialAllowance) + (data.otherAllowances ?? existing.otherAllowances);
                data.netPay = data.grossPay - ((data.pf ?? existing.pf) + (data.esi ?? existing.esi) + (data.professionalTax ?? existing.professionalTax) + (data.tds ?? existing.tds) + (data.otherDeductions ?? existing.otherDeductions));
            }
        }
        const record = await prisma_1.default.staffSalary.update({ where: { id: Number(req.params.id) }, data });
        res.json(record);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        await prisma_1.default.staffSalary.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: 'Salary record deleted' });
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/calculate', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const { month, year } = req.body;
        if (!month || !year)
            return res.status(400).json({ message: 'month and year required' });
        const m = Number(month);
        const y = Number(year);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        const users = await prisma_1.default.user.findMany({
            where: { status: 'APPROVED', role: { name: { not: 'MEMBER' } } },
            select: { id: true, name: true },
        });
        const attendanceRecords = await prisma_1.default.staffAttendance.findMany({
            where: { date: { gte: start, lte: end } },
        });
        const results = [];
        for (const user of users) {
            const userRecords = attendanceRecords.filter(r => r.userId === user.id);
            const present = userRecords.filter(r => r.status === 'PRESENT').length;
            const halfDay = userRecords.filter(r => r.status === 'HALF_DAY').length;
            const paidDays = present + halfDay * 0.5;
            const totalDays = userRecords.length;
            if (totalDays === 0)
                continue;
            const existingSalary = await prisma_1.default.staffSalary.findUnique({
                where: { userId_month_year: { userId: user.id, month: m, year: y } },
            });
            if (existingSalary)
                continue;
            const dailyRate = 500;
            const basicPay = paidDays * dailyRate;
            const hra = basicPay * 0.4;
            const conveyance = 1600 * (paidDays / 26);
            const medicalAllowance = 1250 * (paidDays / 26);
            const specialAllowance = basicPay * 0.2;
            const grossPay = basicPay + hra + conveyance + medicalAllowance + specialAllowance;
            const pf = basicPay * 0.12;
            const professionalTax = 200;
            const netPay = Math.max(0, grossPay - pf - professionalTax);
            const salary = await prisma_1.default.staffSalary.create({
                data: { userId: user.id, month: m, year: y, basicPay, hra, conveyance, medicalAllowance, specialAllowance, grossPay, pf, professionalTax, netPay, attendanceDays: totalDays, paidDays: Math.round(paidDays) },
            });
            results.push(salary);
        }
        res.status(201).json({ created: results.length, salaries: results });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
