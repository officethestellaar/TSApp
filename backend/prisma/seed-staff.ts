import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALL_SCREENS = [
  'overview', 'requests', 'records', 'activities', 'members', 'concierge',
  'notices', 'billing', 'amc-approvals', 'ledger', 'restaurant-pos',
  'kitchen-display', 'inventory', 'assets', 'salon-menu', 'housekeeping',
  'housekeeping-tasks', 'housekeeping-allocations', 'housekeeping-deep-cleaning',
  'housekeeping-reports', 'reports', 'audit-logs', 'users', 'leave',
  'system-init', 'staff-attendance', 'staff-salary',
];

const STAFF_ACCOUNTS: { email: string; name: string; role: string; screens: string[] }[] = [
  {
    email: 'operations.manager@thestellaar.com',
    name: 'Operations Manager',
    role: 'OPERATIONS_MANAGER',
    screens: ['overview', 'requests', 'records', 'activities', 'members', 'concierge', 'notices', 'billing', 'restaurant-pos', 'kitchen-display', 'inventory', 'assets', 'salon-menu', 'housekeeping', 'housekeeping-tasks', 'housekeeping-reports', 'reports', 'leave'],
  },
  {
    email: 'club.manager@thestellaar.com',
    name: 'Club Manager',
    role: 'CLUB_MANAGER',
    screens: ['overview', 'requests', 'records', 'activities', 'members', 'concierge', 'notices', 'billing', 'amc-approvals', 'restaurant-pos', 'kitchen-display', 'inventory', 'assets', 'salon-menu', 'housekeeping', 'housekeeping-tasks', 'housekeeping-allocations', 'housekeeping-deep-cleaning', 'housekeeping-reports', 'reports', 'staff-attendance', 'leave'],
  },
  {
    email: 'data.operator@thestellaar.com',
    name: 'Data Operator',
    role: 'DATA_OPERATOR',
    screens: ['overview', 'requests', 'records', 'members', 'billing', 'inventory', 'assets', 'reports', 'leave'],
  },
  {
    email: 'sales.executive@thestellaar.com',
    name: 'Sales Executive',
    role: 'SALES_EXECUTIVE',
    screens: ['overview', 'members', 'billing', 'reports', 'leave'],
  },
  {
    email: 'chef@thestellaar.com',
    name: 'Chef',
    role: 'CHEF',
    screens: ['kitchen-display', 'leave'],
  },
  {
    email: 'waiter@thestellaar.com',
    name: 'Waiter',
    role: 'WAITER',
    screens: ['restaurant-pos', 'leave'],
  },
  {
    email: 'housekeeping.executive@thestellaar.com',
    name: 'Housekeeping Executive',
    role: 'HOUSEKEEPING_EXECUTIVE',
    screens: ['housekeeping', 'housekeeping-tasks', 'leave'],
  },
  {
    email: 'accountant@thestellaar.com',
    name: 'Accountant',
    role: 'ACCOUNTANT',
    screens: ['overview', 'billing', 'reports', 'audit-logs', 'leave'],
  },
  {
    email: 'receptionist@thestellaar.com',
    name: 'Receptionist',
    role: 'RECEPTIONIST',
    screens: ['overview', 'members', 'concierge', 'activities', 'leave'],
  },
  {
    email: 'housekeeping.supervisor@thestellaar.com',
    name: 'Housekeeping Supervisor',
    role: 'HOUSEKEEPING_SUPERVISOR',
    screens: ['overview', 'housekeeping', 'housekeeping-tasks', 'housekeeping-allocations', 'housekeeping-deep-cleaning', 'housekeeping-reports', 'leave'],
  },
  {
    email: 'salon.manager@thestellaar.com',
    name: 'Salon Manager',
    role: 'SALON_MANAGER',
    screens: ['overview', 'salon-menu', 'leave'],
  },
  {
    email: 'restaurant.manager@thestellaar.com',
    name: 'Restaurant Manager',
    role: 'RESTAURANT_MANAGER',
    screens: ['overview', 'restaurant-pos', 'kitchen-display', 'inventory', 'leave'],
  },
];

async function main() {
  const password = await bcrypt.hash('TheStellaarStaff', 10);

  for (const account of STAFF_ACCOUNTS) {
    const role = await prisma.role.findUnique({ where: { name: account.role } });
    if (!role) {
      console.log(`Role ${account.role} not found, skipping...`);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, roleId: role.id },
      create: {
        email: account.email,
        password,
        name: account.name,
        roleId: role.id,
      },
    });

    // Assign screen permissions
    for (const screenKey of account.screens) {
      await prisma.userScreenAccess.upsert({
        where: { userId_screenKey: { userId: user.id, screenKey } },
        update: {},
        create: { userId: user.id, screenKey },
      });
    }

    console.log(`✓ ${account.email} (${account.role}) — ${account.screens.length} screens`);
  }

  // Remove members except mohammedareebalishivji@gmail.com
  const keepEmail = 'mohammedareebalishivji@gmail.com';
  const deleted = await prisma.member.deleteMany({
    where: { NOT: { email: keepEmail } },
  });
  console.log(`\n🗑 Deleted ${deleted.count} members (kept ${keepEmail})`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
