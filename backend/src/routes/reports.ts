import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import cache from '../lib/cache';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { createAuditLog } from '../lib/audit';
import { emitEvent } from '../lib/socket';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Import Historical Revenue Data
router.post('/import/revenue', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    const results = { total: data.length, imported: 0, errors: [] as string[] };

    for (const row of data) {
      try {
        const amount = Number(row['Amount'] || 0);
        const date = new Date(row['Date'] || Date.now());
        const dept = String(row['Department'] || 'MEMBERSHIP').toUpperCase();
        const invoiceNo = String(row['InvoiceNo'] || `HIST-${Date.now()}-${results.imported}`);

        await prisma.invoice.create({
          data: {
            invoiceNumber: invoiceNo,
            department: dept,
            amount: amount * 0.82, // Base
            gst: amount * 0.18,    // Tax
            total: amount,
            status: 'PAID',
            dueDate: date,
            createdAt: date,
            // Link to a generic "Legacy Import" member or create if needed
            member: {
              connectOrCreate: {
                where: { membershipNumber: 'LEGACY-001' },
                create: {
                  membershipNumber: 'LEGACY-001',
                  category: 'GOLD',
                  tenure: '1_YEAR',
                  nameAsAadhaar: 'Legacy Data Import',
                  gender: 'OTHER',
                  maritalStatus: 'OTHER',
                  occupation: 'SYSTEM',
                  mobileNumber: '0000000001',
                  aadhaarNumber: '000000000001',
                  residentialAddress: 'Legacy System',
                  city: 'Imported',
                  state: 'Imported',
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
                  paymentMode: 'LEGACY',
                  startDate: new Date(),
                  expiryDate: new Date(),
                  dob: new Date('1990-01-01'),
                  fatherHusbandName: 'Legacy'
                }
              }
            }
          }
        });
        results.imported++;
      } catch (err: any) {
        results.errors.push(`Error at row ${results.imported + 1}: ${err.message}`);
      }
    }

    if (results.imported > 0) {
      await createAuditLog({
        action: 'ANALYTICS_IMPORT',
        entityType: 'REVENUE',
        description: `Imported ${results.imported} historical revenue records.`,
        user: {
          userId: (req as any).user.userId,
          name: (req as any).user.name,
          role: (req as any).user.role
        }
      });
      cache.flushAll(); // Clear analytics cache
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get overall stats and Multi-Period Comparisons
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const cached = cache.get('report_stats');
    if (cached) return res.json(cached);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const yearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear(), 0, 0);

    const [
      totalMembers,
      todayRevenue,
      yesterdayRevenue,
      monthRevenue,
      lastMonthRevenue,
      yearRevenue,
      lastYearRevenue,
      todayMembers,
      yesterdayMembers,
      monthMembers,
      lastMonthMembers,
      yearMembers,
      lastYearMembers,
      todayInvoices,
      yesterdayInvoices
    ] = await Promise.all([
      // Totals
      prisma.member.count(),
      
      // Revenue Aggregates
      prisma.invoice.aggregate({ where: { status: 'PAID', updatedAt: { gte: todayStart } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { status: 'PAID', updatedAt: { gte: yesterdayStart, lt: todayStart } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { status: 'PAID', updatedAt: { gte: monthStart } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { status: 'PAID', updatedAt: { gte: lastMonthStart, lt: monthStart } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { status: 'PAID', updatedAt: { gte: yearStart } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { status: 'PAID', updatedAt: { gte: lastYearStart, lt: yearStart } }, _sum: { total: true } }),

      // Member Growth
      prisma.member.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.member.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.member.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.member.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart } } }),
      prisma.member.count({ where: { createdAt: { gte: yearStart } } }),
      prisma.member.count({ where: { createdAt: { gte: lastYearStart, lt: yearStart } } }),

      // Detailed Invoices for Breakdown
      prisma.invoice.findMany({ where: { status: 'PAID', updatedAt: { gte: todayStart } } }),
      prisma.invoice.findMany({ where: { status: 'PAID', updatedAt: { gte: yesterdayStart, lt: todayStart } } })
    ]);

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Breakdown Helper
    const summarizeInvoices = (invoices: any[]) => {
      const summary = { total: 0, RESTAURANT: 0, AMC: 0, MEMBERSHIP: 0, SALON: 0, GYM: 0, OTHERS: 0 };
      invoices.forEach(inv => {
        const amt = Number(inv.total);
        summary.total += amt;
        const dept = inv.department;
        if (['RESTAURANT', 'AMC', 'MEMBERSHIP', 'SALON', 'GYM'].includes(dept)) {
          // @ts-ignore
          summary[dept] += amt;
        } else {
          summary.OTHERS += amt;
        }
      });
      return summary;
    };

    const todaySummary = summarizeInvoices(todayInvoices || []);
    const yesterdaySummary = summarizeInvoices(yesterdayInvoices || []);

    const responseData = {
      totalMembers,
      totalRevenue: yearRevenue._sum.total || 0, // Fallback for reports page
      today: todaySummary,
      yesterday: yesterdaySummary,
      revenue: {
        today: todayRevenue._sum.total || 0,
        yesterday: yesterdayRevenue._sum.total || 0,
        month: monthRevenue._sum.total || 0,
        lastMonth: lastMonthRevenue._sum.total || 0,
        year: yearRevenue._sum.total || 0,
        lastYear: lastYearRevenue._sum.total || 0,
        growth: {
          day: calculateGrowth(todayRevenue._sum.total || 0, yesterdayRevenue._sum.total || 0),
          month: calculateGrowth(monthRevenue._sum.total || 0, lastMonthRevenue._sum.total || 0),
          year: calculateGrowth(yearRevenue._sum.total || 0, lastYearRevenue._sum.total || 0)
        }
      },
      members: {
        today: todayMembers,
        yesterday: yesterdayMembers,
        month: monthMembers,
        lastMonth: lastMonthMembers,
        year: yearMembers,
        lastYear: lastYearMembers,
        growth: {
          day: calculateGrowth(todayMembers, yesterdayMembers),
          month: calculateGrowth(monthMembers, lastMonthMembers),
          year: calculateGrowth(yearMembers, lastYearMembers)
        }
      }
    };

    cache.set('report_stats', responseData, 300); // 5 min cache
    res.json(responseData);
  } catch (error) {
    console.error('Reports stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get revenue data for charts (last 6 months)
router.get('/revenue-chart', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cached = cache.get('report_revenue_chart');
    if (cached) return res.json(cached);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const invoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: sixMonthsAgo }
      },
      select: {
        total: true,
        createdAt: true,
        department: true
      }
    });

    // Group by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData: any = {};

    invoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
      
      if (!chartData[monthYear]) {
        chartData[monthYear] = { month: monthYear, total: 0, restaurant: 0, membership: 0, others: 0 };
      }
      
      const total = Number(inv.total);
      chartData[monthYear].total += total;
      
      if (inv.department === 'RESTAURANT') {
        chartData[monthYear].restaurant += total;
      } else if (inv.department === 'MEMBERSHIP' || inv.department === 'AMC') {
        chartData[monthYear].membership += total;
      } else {
        chartData[monthYear].others += total;
      }
    });

    const responseData = Object.values(chartData);
    cache.set('report_revenue_chart', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Revenue chart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get membership distribution
router.get('/membership-distribution', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cached = cache.get('report_member_dist');
    if (cached) return res.json(cached);

    const distribution = await prisma.member.groupBy({
      by: ['category'],
      _count: {
        _all: true
      }
    });

    const formattedData = distribution.map(d => ({
      name: d.category,
      value: d._count._all
    }));

    cache.set('report_member_dist', formattedData);
    res.json(formattedData);
  } catch (error) {
    console.error('Membership distribution error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Daily Sales Summary (Last 24h)
router.get('/daily-summary', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: yesterday },
        status: 'PAID'
      },
      include: { member: { select: { nameAsAadhaar: true } } }
    });

    const summary = invoices.reduce((acc: any, inv) => {
      const dept = inv.department;
      if (!acc[dept]) acc[dept] = { count: 0, total: 0 };
      acc[dept].count++;
      acc[dept].total += inv.total;
      return acc;
    }, {});

    res.json({ invoices, summary });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// AMC Defaulter List
router.get('/amc-defaulters', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const defaulters = await prisma.member.findMany({
      where: {
        amcApplicable: true,
        amcStatus: 'UNPAID',
        isActive: true
      },
      select: {
        id: true,
        membershipNumber: true,
        nameAsAadhaar: true,
        mobileNumber: true,
        category: true,
        expiryDate: true
      }
    });
    res.json(defaulters);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GST Filing Helper (Tax Summary)
router.get('/gst-summary', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cached = cache.get('report_gst_summary');
    if (cached) return res.json(cached);

    const invoices = await prisma.invoice.findMany({
      where: { status: 'PAID' }
    });

    const gstSummary = {
      fivePercent: { taxable: 0, gst: 0 },
      eighteenPercent: { taxable: 0, gst: 0 }
    };

    invoices.forEach(inv => {
      if (inv.department === 'RESTAURANT') {
        gstSummary.fivePercent.taxable += inv.amount;
        gstSummary.fivePercent.gst += inv.gst;
      } else {
        gstSummary.eighteenPercent.taxable += inv.amount;
        gstSummary.eighteenPercent.gst += inv.gst;
      }
    });

    cache.set('report_gst_summary', gstSummary);
    res.json(gstSummary);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Table Turnaround Report
router.get('/table-turnaround', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cached = cache.get('report_table_turnaround');
    if (cached) return res.json(cached);

    const closedOrders = await prisma.order.findMany({
      where: { status: 'PAID' },
      include: { table: true }
    });

    const tableStats: any = {};

    closedOrders.forEach(order => {
      const duration = (new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / 60000; // minutes
      const tableNum = order.table.number;

      if (!tableStats[tableNum]) {
        tableStats[tableNum] = { table: tableNum, avgDuration: 0, orderCount: 0, totalDuration: 0 };
      }

      tableStats[tableNum].orderCount++;
      tableStats[tableNum].totalDuration += duration;
      tableStats[tableNum].avgDuration = Math.round(tableStats[tableNum].totalDuration / tableStats[tableNum].orderCount);
    });

    const responseData = Object.values(tableStats);
    cache.set('report_table_turnaround', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Table turnaround error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Submit Immediate Feedback
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { memberId, memberName, rating, comments, department } = req.body;
    
    const feedback = await prisma.feedback.create({
      data: {
        memberId: memberId || null,
        memberName: memberName || 'Guest',
        rating: Number(rating),
        comments,
        department
      }
    });

    // Immediate Alert Engine for Guest Relations Manager
    if (rating <= 3) {
      console.log(`[ALERT] Immediate Intervention Required: ${memberName} gave a ${rating}-star rating.`);
      // Emit real-time alert to concierge/managers
      emitEvent('new_announcement', {
        title: `URGENT: ${rating}-Star Review from ${memberName || 'Guest'}`,
        targetAudience: 'STAFF',
        createdAt: new Date()
      });
    }

    res.status(201).json(feedback);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to submit feedback' });
  }
});

// Get Feedback requiring intervention
router.get('/feedback/alerts', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const alerts = await prisma.feedback.findMany({
      where: {
        rating: { lte: 3 },
        isResolved: false
      },
      orderBy: { createdAt: 'desc' },
      include: { member: { select: { mobileNumber: true } } }
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all feedback
router.get('/feedback', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { department, rating } = req.query;
    const where: Record<string, unknown> = {};
    if (department) where.department = department;
    if (rating) where.rating = Number(rating);

    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { member: { select: { mobileNumber: true } } }
    });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Resolve feedback
router.patch('/feedback/:id/resolve', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await prisma.feedback.update({
      where: { id: Number(id) },
      data: { isResolved: true }
    });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
