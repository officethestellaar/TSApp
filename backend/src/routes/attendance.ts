import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { emitEvent } from '../lib/socket';

const router = express.Router();

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'HOUSEKEEPING_EXECUTIVE', 'ACCOUNTANT', 'HOUSEKEEPING_SUPERVISOR', 'SALON_MANAGER', 'RESTAURANT_MANAGER', 'RECEPTIONIST'];

function determineStatus(actualTime: Date, defaultCheckIn: string) {
  const [h, m] = defaultCheckIn.split(':').map(Number);
  const expected = new Date(actualTime);
  expected.setHours(h, m, 0, 0);
  const diffMinutes = (actualTime.getTime() - expected.getTime()) / 60000;
  if (diffMinutes >= 10) return 'LATE';
  return 'PRESENT';
}

router.get('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'ACCOUNTANT', 'HOUSEKEEPING_SUPERVISOR', 'SALON_MANAGER', 'RESTAURANT_MANAGER', 'RECEPTIONIST'), async (req: any, res) => {
  try {
    const { userId, month, year, date } = req.query;
    const where: any = {};
    if (userId) where.userId = Number(userId);
    if (date) {
      const d = new Date(date as string);
      where.date = { gte: new Date(d.setHours(0,0,0,0)), lte: new Date(d.setHours(23,59,59,999)) };
    }
    if (month && year) {
      const y = Number(year);
      const m = Number(month);
      where.date = { gte: new Date(y, m-1, 1), lte: new Date(y, m, 0, 23, 59, 59, 999) };
    }
    const records = await prisma.staffAttendance.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
    });
    res.json(records);
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'ACCOUNTANT', 'HOUSEKEEPING_SUPERVISOR', 'SALON_MANAGER', 'RESTAURANT_MANAGER', 'RECEPTIONIST'), async (req: any, res) => {
  try {
    const { userId, date, checkIn, checkOut, status, overtimeHours, remarks } = req.body;
    if (!userId || !date) return res.status(400).json({ message: 'userId and date are required' });
    const record = await prisma.staffAttendance.create({
      data: {
        userId,
        date: new Date(date),
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'PRESENT',
        overtimeHours: overtimeHours || 0,
        remarks,
      },
    });
    res.status(201).json(record);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ message: 'Attendance already marked for this date' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'ACCOUNTANT', 'HOUSEKEEPING_SUPERVISOR', 'SALON_MANAGER', 'RESTAURANT_MANAGER', 'RECEPTIONIST'), async (req: any, res) => {
  try {
    const { checkIn, checkOut, status, overtimeHours, remarks } = req.body;
    const record = await prisma.staffAttendance.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(checkIn !== undefined && { checkIn: checkIn ? new Date(checkIn) : null }),
        ...(checkOut !== undefined && { checkOut: checkOut ? new Date(checkOut) : null }),
        ...(status !== undefined && { status }),
        ...(overtimeHours !== undefined && { overtimeHours }),
        ...(remarks !== undefined && { remarks }),
      },
    });
    res.json(record);
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.delete('/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  try {
    await prisma.staffAttendance.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Attendance record deleted' });
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/bulk', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), async (req: any, res) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records)) return res.status(400).json({ message: 'records array required' });
    const created = [];
    for (const r of records) {
      try {
        const rec = await prisma.staffAttendance.create({
          data: {
            userId: r.userId,
            date: new Date(r.date),
            status: r.status || 'PRESENT',
            overtimeHours: r.overtimeHours || 0,
            remarks: r.remarks,
          },
        });
        created.push(rec);
      } catch { /* skip duplicates */ }
    }
    res.status(201).json({ created: created.length, records: created });
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.get('/summary', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req: any, res) => {
  try {
    const { month, year } = req.query;
    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    const start = new Date(y, m-1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    const users = await prisma.user.findMany({
      where: { status: 'APPROVED', role: { name: { not: 'MEMBER' } } },
      select: { id: true, name: true, email: true, role: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    const records = await prisma.staffAttendance.findMany({
      where: { date: { gte: start, lte: end } },
    });
    const summary = users.map(u => {
      const userRecords = records.filter(r => r.userId === u.id);
      const present = userRecords.filter(r => r.status === 'PRESENT').length;
      const absent = userRecords.filter(r => r.status === 'ABSENT').length;
      const halfDay = userRecords.filter(r => r.status === 'HALF_DAY').length;
      const leave = userRecords.filter(r => r.status === 'LEAVE').length;
      const holiday = userRecords.filter(r => r.status === 'HOLIDAY').length;
      const totalOvertime = userRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
      return { ...u, present, absent, halfDay, leave, holiday, totalOvertime, totalDays: userRecords.length };
    });
    res.json(summary);
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.get('/today-status', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const record = await prisma.staffAttendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pin: true } });
    res.json({ marked: !!record, hasPin: !!user?.pin, record });
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/mark-with-pin', authenticateToken, async (req: any, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.userId;

    if (!pin || pin.length !== 4) return res.status(400).json({ message: '4-digit PIN is required' });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pin: true, defaultCheckIn: true, role: { select: { name: true } } } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role.name === 'MEMBER') return res.status(403).json({ message: 'Members cannot mark attendance' });

    if (!user.pin) {
      return res.status(400).json({ message: 'No PIN set. Please set your PIN from your profile.', needsSetup: true });
    }

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) return res.status(401).json({ message: 'Invalid PIN' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await prisma.staffAttendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });
    if (existing) return res.json({ message: 'Attendance already marked', record: existing });

    const now = new Date();
    const status = determineStatus(now, user.defaultCheckIn || '09:00');
    const record = await prisma.staffAttendance.create({
      data: { userId, date: now, checkIn: now, status },
    });

    emitEvent('attendance_update', { action: 'MARKED', userId, record });
    res.status(201).json({ message: 'Attendance marked successfully', record });
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/check-out', authenticateToken, async (req: any, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.userId;

    if (!pin || pin.length !== 4) return res.status(400).json({ message: '4-digit PIN is required' });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pin: true, role: { select: { name: true } } } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role.name === 'MEMBER') return res.status(403).json({ message: 'Members cannot mark check-out' });

    if (!user.pin) return res.status(400).json({ message: 'No PIN set.', needsSetup: true });

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) return res.status(401).json({ message: 'Invalid PIN' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await prisma.staffAttendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });
    if (!record) return res.status(400).json({ message: 'No attendance record found for today' });
    if (record.checkOut) return res.json({ message: 'Already checked out', record });

    const updated = await prisma.staffAttendance.update({
      where: { id: record.id },
      data: { checkOut: new Date() },
    });

    emitEvent('attendance_update', { action: 'CHECKED_OUT', userId, record: updated });
    res.json({ message: 'Check-out marked successfully', record: updated });
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

export default router;
