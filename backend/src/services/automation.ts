import cron from 'node-cron';
import prisma from '../lib/prisma';
import { emitEvent } from '../lib/socket';
import { createAuditLog } from '../lib/audit';

export const scheduleJobs = () => {
  // Run daily at 01:00 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('[Automation] Initiating daily AMC and Registry scan...');
    try {
      await autoGenerateAMCInvoices();
      await checkDefaulters();
    } catch (error) {
      console.error('[Automation] Critical failure in daily cycle:', error);
    }
  });

  // Run every 15 minutes for housekeeping reminders
  cron.schedule('*/15 * * * *', async () => {
    try {
      await checkHousekeepingReminders();
    } catch (error) {
      console.error('[Automation] Housekeeping reminder error:', error);
    }
  });
  
  console.log('[Automation] Background worker nodes initialized.');
};

/**
 * Automatically generates AMC invoices based on validity rules.
 * Generates AMC between Dec 30 and Jan 15 every year.
 * Stops generating when total AMCs = Tenure - 1.
 */
async function autoGenerateAMCInvoices() {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  let targetYear = currentYear;
  if (today.getMonth() === 11 && today.getDate() >= 30) {
    targetYear = currentYear + 1; // Dec 30 onwards -> bill for next year
  } else if (today.getMonth() === 0 && today.getDate() <= 15) {
    targetYear = currentYear;     // Jan 1 to 15 -> bill for current year
  } else {
    return; // Outside the AMC generation window
  }

  const membersDue = await prisma.member.findMany({
    where: {
      amcApplicable: true,
      category: { in: ['SILVER', 'GOLD'] },
      isActive: true,
      OR: [
        { amcYear: { not: String(targetYear) } },
        { amcYear: null }
      ]
    }
  });

  for (const member of membersDue) {
    // Rule: AMC will always be 1 less than tenure
    const tenureYears = parseInt(member.tenure); // "3_YEAR" -> 3
    const maxAmcs = tenureYears > 0 ? tenureYears - 1 : 0;
    
    if (maxAmcs > 0) {
      // Count total AMC invoices generated for this member
      const amcCount = await prisma.invoice.count({
        where: {
          memberId: member.id,
          department: 'AMC'
        }
      });
      
      if (amcCount < maxAmcs) {
        await generateInvoiceForMember(member, targetYear);
      }
    }
  }
}

async function generateInvoiceForMember(member: any, targetYear: number) {
  try {
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        memberId: member.id,
        department: 'AMC',
        invoiceNumber: { contains: `AUTO-AMC-${targetYear}` }
      }
    });

    if (existingInvoice) return;

    const subtotal = member.amcAmount || (member.category === 'GOLD' ? 5000 : 2500);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    const invoiceCount = await prisma.invoice.count();
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `AUTO-AMC-${targetYear}-${1000 + invoiceCount + 1}`,
        memberId: member.id,
        department: 'AMC',
        amount: subtotal,
        gst: gst,
        total: total,
        dueDate: new Date(targetYear, 0, 15), // Due by Jan 15th
        status: 'UNPAID',
        items: {
          create: [{
            description: `Annual Maintenance Charge (${targetYear})`,
            quantity: 1,
            unitPrice: subtotal,
            amount: subtotal
          }]
        }
      }
    });

    await prisma.member.update({
      where: { id: member.id },
      data: { amcStatus: 'UNPAID' }
    });

    emitEvent('new_announcement', {
      title: `AMC Invoice Generated: ${invoice.invoiceNumber}`,
      targetAudience: 'MEMBER',
      createdAt: new Date()
    });

    console.log(`[Automation] Generated AMC Invoice ${invoice.invoiceNumber} for ${member.nameAsAadhaar}`);
  } catch (err) {
    console.error(`[Automation] Failed to process AMC for member ${member.id}:`, err);
  }
}

/**
 * PHASE 2: AUTO-LOCK PROTOCOL
 * Disables access status for members who haven't paid AMC by Jan 15th of the current year.
 * Applies to SILVER and GOLD tiers as per business rules.
 */
async function checkDefaulters() {
  const today = new Date();
  const currentYear = String(today.getFullYear());
  
  // Rule: After Jan 15th, we strictly LOCK if AMC for current year is not paid.
  if (today.getMonth() === 0 && today.getDate() >= 15 || today.getMonth() > 0) { 
    console.log(`[Automation] Enforcing Jan 15th Lock Rule for Year ${currentYear}...`);
    
    const candidates = await prisma.member.findMany({
      where: {
        category: { in: ['SILVER', 'GOLD'] },
        amcApplicable: true,
        accessStatus: 'ENABLED',
        isActive: true,
        OR: [
          { amcYear: { not: currentYear } }, // Hasn't paid for this year
          { amcYear: null },                 // Has never paid
          { amcStatus: 'UNPAID' }            // Explicitly unpaid
        ]
      }
    });

    let lockCount = 0;

    for (const member of candidates) {
      const tenureYears = parseInt(member.tenure);
      const maxAmcs = tenureYears > 0 ? tenureYears - 1 : 0;
      
      if (maxAmcs > 0) {
        const paidAmcs = await prisma.invoice.count({
          where: {
            memberId: member.id,
            department: 'AMC',
            status: 'PAID'
          }
        });
        
        // If they've paid the max required AMCs, skip locking
        if (paidAmcs >= maxAmcs) {
          continue; 
        }
      }

      // Lock defaulter
      await prisma.member.update({
        where: { id: member.id },
        data: { accessStatus: 'DISABLED' }
      });

      await createAuditLog({
        action: 'ACCOUNT_FROZEN',
        entityType: 'MEMBER',
        entityId: member.membershipNumber,
        description: `Automated lock: AMC for ${currentYear} remains unpaid after Jan 15th deadline.`,
        user: { userId: 0, name: 'SYSTEM_NODE', role: 'SYSTEM' }
      });

      lockCount++;
    }

    if (lockCount > 0) {
      console.log(`[Automation][CRITICAL] Frozen ${lockCount} SILVER/GOLD nodes for non-payment of AMC.`);
      
      emitEvent('new_announcement', {
        title: `Security Update: ${lockCount} accounts restricted due to AMC non-compliance.`,
        targetAudience: 'STAFF',
        createdAt: new Date()
      });
    }
  }
}

// ─── HOUSEKEEPING REMINDERS & ESCALATION ─────────────────────

async function checkHousekeepingReminders() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const pendingInstances = await prisma.housekeepingTaskInstance.findMany({
    where: { status: 'PENDING' },
    include: {
      task: true,
      employee: { select: { id: true, name: true, email: true } },
    },
  });

  // Get supervisor and Ops Manager emails for escalation
  const supervisors = await prisma.user.findMany({
    where: { role: { name: { in: ['ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER'] } } },
    select: { name: true, email: true, role: { select: { name: true } } },
  });

  const opsManagers = supervisors.filter(s => s.role.name === 'OPERATIONS_MANAGER');

  for (const instance of pendingInstances) {
    if (!instance.dueTime) continue;

    const [dueH, dueM] = instance.dueTime.split(':').map(Number);
    const dueDate = new Date(instance.assignedAt);
    dueDate.setHours(dueH, dueM, 0, 0);

    const diffMs = now.getTime() - dueDate.getTime();
    const diffMin = Math.round(diffMs / 60000);

    // Reminder 15 min before due
    if (diffMin >= -15 && diffMin < 0) {
      emitEvent('housekeeping_reminder', {
        type: 'UPCOMING',
        message: `Task "${instance.task.name}" in ${instance.floor}/${instance.area} is due in ${-diffMin} minutes`,
        employeeId: instance.employeeId,
        employeeName: instance.employee.name,
        taskId: instance.id,
      });
    }

    // At due time (0-5 min past)
    if (diffMin >= 0 && diffMin < 5) {
      const message = `Task "${instance.task.name}" in ${instance.floor}/${instance.area} is due now (assigned to ${instance.employee.name})`;
      emitEvent('housekeeping_reminder', {
        type: 'DUE_NOW',
        message,
        employeeId: instance.employeeId,
        taskId: instance.id,
      });
      for (const sup of supervisors) {
        emitEvent('housekeeping_reminder', {
          type: 'SUPERVISOR_ALERT',
          message: `[SUPERVISOR] ${message}`,
          email: sup.email,
        });
      }
    }

    // Escalate 1 hour past due (60-65 min)
    if (diffMin >= 60 && diffMin < 65) {
      const message = `[ESCALATION] Task "${instance.task.name}" in ${instance.floor}/${instance.area} is 1 hour overdue (assigned to ${instance.employee.name})`;
      for (const ops of opsManagers) {
        emitEvent('housekeeping_reminder', {
          type: 'ESCALATION',
          message,
          email: ops.email,
        });
      }
    }

    // Mark as overdue if past due by 30+ min
    if (diffMin >= 30 && instance.status === 'PENDING') {
      await prisma.housekeepingTaskInstance.update({
        where: { id: instance.id },
        data: { status: 'OVERDUE' },
      });
    }
  }
}
