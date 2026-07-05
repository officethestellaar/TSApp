import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Staff self-view — only own salary records
router.get('/my', authenticateToken, async (req: any, res) => {
  try {
    const { month, year } = req.query;
    const where: any = { userId: req.user.userId };
    if (month) where.month = Number(month);
    if (year) where.year = Number(year);
    const records = await prisma.staffSalary.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Fetch attendance summary for each record
    const salariesWithAttendance = await Promise.all(records.map(async (s) => {
      const start = new Date(s.year, s.month - 1, 1);
      const end = new Date(s.year, s.month, 0, 23, 59, 59, 999);
      const attendanceRecords = await prisma.staffAttendance.findMany({
        where: { userId: req.user.userId, date: { gte: start, lte: end } },
        orderBy: { date: 'asc' },
      });
      return { ...s, attendanceRecords };
    }));

    res.json(salariesWithAttendance);
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.get('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req: any, res) => {
  try {
    const { userId, month, year } = req.query;
    const where: any = {};
    if (userId) where.userId = Number(userId);
    if (month) where.month = Number(month);
    if (year) where.year = Number(year);
    const records = await prisma.staffSalary.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json(records);
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req: any, res) => {
  try {
    const { userId, month, year, basicPay, hra, conveyance, medicalAllowance, specialAllowance, otherAllowances, pf, esi, professionalTax, tds, otherDeductions, attendanceDays, paidDays, remarks } = req.body;
    if (!userId || !month || !year) return res.status(400).json({ message: 'userId, month, year required' });
    const grossPay = (basicPay || 0) + (hra || 0) + (conveyance || 0) + (medicalAllowance || 0) + (specialAllowance || 0) + (otherAllowances || 0);
    const deductions = (pf || 0) + (esi || 0) + (professionalTax || 0) + (tds || 0) + (otherDeductions || 0);
    const netPay = grossPay - deductions;
    const record = await prisma.staffSalary.create({
      data: { userId, month, year, basicPay, hra, conveyance, medicalAllowance, specialAllowance, otherAllowances, grossPay, pf, esi, professionalTax, tds, otherDeductions, netPay, attendanceDays, paidDays, remarks },
    });
    res.status(201).json(record);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ message: 'Salary already exists for this month/year' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req: any, res) => {
  try {
    const data: any = {};
    const fields = ['basicPay','hra','conveyance','medicalAllowance','specialAllowance','otherAllowances','pf','esi','professionalTax','tds','otherDeductions','attendanceDays','paidDays','status','paymentDate','remarks','bonus','reduction'];
    for (const f of fields) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    if (data.paymentDate) data.paymentDate = new Date(data.paymentDate);

    const existing = await prisma.staffSalary.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ message: 'Salary record not found' });

    // When paying: apply bonus/reduction and generate invoice
    if (data.status === 'PAID' && existing.status !== 'PAID') {
      const bonus = data.bonus ?? existing.bonus ?? 0;
      const reduction = data.reduction ?? existing.reduction ?? 0;
      data.netPay = existing.netPay + Number(bonus) - Number(reduction);
      data.paymentDate = data.paymentDate || new Date();
      data.invoiceNumber = `SAL-${String(existing.userId).padStart(3, '0')}/${existing.month}/${existing.year}-${Date.now().toString(36).toUpperCase()}`;
    } else if (data.bonus !== undefined || data.reduction !== undefined) {
      // Recalculate netPay when bonus/reduction change without paying
      data.netPay = existing.netPay + Number(data.bonus ?? existing.bonus ?? 0) - Number(data.reduction ?? existing.reduction ?? 0);
    }

    if (data.basicPay !== undefined || data.hra !== undefined || data.conveyance !== undefined || data.medicalAllowance !== undefined || data.specialAllowance !== undefined || data.otherAllowances !== undefined || data.pf !== undefined || data.esi !== undefined || data.professionalTax !== undefined || data.tds !== undefined || data.otherDeductions !== undefined) {
      if (existing) {
        data.grossPay = (data.basicPay ?? existing.basicPay) + (data.hra ?? existing.hra) + (data.conveyance ?? existing.conveyance) + (data.medicalAllowance ?? existing.medicalAllowance) + (data.specialAllowance ?? existing.specialAllowance) + (data.otherAllowances ?? existing.otherAllowances);
        data.netPay = data.grossPay - ((data.pf ?? existing.pf) + (data.esi ?? existing.esi) + (data.professionalTax ?? existing.professionalTax) + (data.tds ?? existing.tds) + (data.otherDeductions ?? existing.otherDeductions)) + Number(data.bonus ?? existing.bonus ?? 0) - Number(data.reduction ?? existing.reduction ?? 0);
      }
    }
    const record = await prisma.staffSalary.update({ where: { id: Number(req.params.id) }, data });
    res.json(record);
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  try {
    await prisma.staffSalary.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Salary record deleted' });
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/calculate', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req: any, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ message: 'month and year required' });
    const m = Number(month);
    const y = Number(year);
    const start = new Date(y, m-1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    const users = await prisma.user.findMany({
      where: { status: 'APPROVED', role: { name: { not: 'MEMBER' } } },
      select: { id: true, name: true },
    });
    const attendanceRecords = await prisma.staffAttendance.findMany({
      where: { date: { gte: start, lte: end } },
    });
    const results = [];
    for (const user of users) {
      const userRecords = attendanceRecords.filter(r => r.userId === user.id);
      const present = userRecords.filter(r => r.status === 'PRESENT').length;
      const halfDay = userRecords.filter(r => r.status === 'HALF_DAY').length;
      const paidDays = present + halfDay * 0.5;
      const totalDays = userRecords.length;
      if (totalDays === 0) continue;

      const existingSalary = await prisma.staffSalary.findUnique({
        where: { userId_month_year: { userId: user.id, month: m, year: y } },
      });
      if (existingSalary) continue;

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
      const salary = await prisma.staffSalary.create({
        data: { userId: user.id, month: m, year: y, basicPay, hra, conveyance, medicalAllowance, specialAllowance, grossPay, pf, professionalTax, netPay, attendanceDays: totalDays, paidDays: Math.round(paidDays) },
      });
      results.push(salary);
    }
    res.status(201).json({ created: results.length, salaries: results });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
