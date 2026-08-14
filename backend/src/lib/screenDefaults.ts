// Non-editable role → default screen keys (always present, cannot be removed via UI)
// Single source of truth shared by the screens API (user.ts) and the permission
// enforcement middleware (auth.ts) so role defaults are actually enforced.
export const ALL_SCREENS = [
  { key: 'overview', label: 'Overview' },
  { key: 'requests', label: 'Requests' },
  { key: 'records', label: 'Records' },
  { key: 'activities', label: 'Activities' },
  { key: 'members', label: 'Members' },
  { key: 'concierge', label: 'Concierge' },
  { key: 'notices', label: 'Notices' },
  { key: 'billing', label: 'Billing' },
  { key: 'restaurant-billing', label: 'Restaurant Billing' },
  { key: 'salon-billing', label: 'Salon Billing' },
  { key: 'gym-billing', label: 'Gym Billing' },
  { key: 'pool-billing', label: 'Pool Billing' },
  { key: 'banquet-billing', label: 'Banquet Billing' },
  { key: 'personal-trainer-billing', label: 'Personal Trainer Billing' },
  { key: 'menu-hub', label: 'Menu Hub' },
  { key: 'amc-approvals', label: 'AMC Approvals' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'restaurant-pos', label: 'Restaurant POS' },
  { key: 'kitchen-display', label: 'Kitchen Display' },
  { key: 'restaurant-menu', label: 'Restaurant Menu' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'assets', label: 'Assets' },
  { key: 'salon-menu', label: 'Salon Menu' },
  { key: 'gym-menu', label: 'Gym Menu' },
  { key: 'pool-menu', label: 'Pool Menu' },
  { key: 'banquet-menu', label: 'Banquet Menu' },
  { key: 'personal-trainer-menu', label: 'Personal Trainer Menu' },
  { key: 'housekeeping', label: 'Housekeeping Dashboard' },
  { key: 'housekeeping-tasks', label: 'Housekeeping Tasks' },
  { key: 'housekeeping-allocations', label: 'Housekeeping Allocations' },
  { key: 'housekeeping-deep-cleaning', label: 'Deep Cleaning' },
  { key: 'housekeeping-reports', label: 'Housekeeping Reports' },
  { key: 'reports', label: 'Reports' },
  { key: 'audit-logs', label: 'Audit Logs' },
  { key: 'users', label: 'Users' },
  { key: 'leave', label: 'Leave Management' },
  { key: 'system-init', label: 'System Init' },
  { key: 'staff-attendance', label: 'Staff Attendance' },
  { key: 'staff-salary', label: 'Staff Salary' },
  { key: 'salary', label: 'My Salary' },
];

export const ROLE_SCREEN_MAP: Record<string, string[]> = {
  SUPER_ADMIN: ALL_SCREENS.map(s => s.key),
  ADMIN: ALL_SCREENS.map(s => s.key),
  CLUB_MANAGER: ['members', 'billing', 'restaurant-pos', 'requests', 'activities', 'reports', 'menu-hub', 'concierge'],
  OPERATIONS_MANAGER: ['housekeeping', 'inventory', 'assets', 'staff-attendance', 'activities', 'members', 'reports', 'requests'],
  DATA_OPERATOR: ['members', 'records', 'activities', 'menu-hub', 'inventory', 'assets', 'requests', 'notices', 'leave', 'reports'],
  SALES_EXECUTIVE: ['members', 'billing'],
  ACCOUNTANT: ['billing', 'ledger', 'amc-approvals', 'reports', 'audit-logs'],
  RESTAURANT_MANAGER: ['restaurant-pos', 'kitchen-display', 'restaurant-menu', 'billing'],
  SALON_MANAGER: ['salon-menu', 'billing'],
  HOUSEKEEPING_SUPERVISOR: ['housekeeping', 'housekeeping-tasks', 'housekeeping-allocations', 'housekeeping-deep-cleaning', 'housekeeping-reports', 'staff-attendance', 'inventory', 'requests'],
  HOUSEKEEPING_EXECUTIVE: ['housekeeping', 'housekeeping-tasks', 'housekeeping-allocations', 'housekeeping-deep-cleaning', 'housekeeping-reports', 'staff-attendance', 'inventory', 'requests'],
  RECEPTIONIST: ['members', 'billing', 'activities', 'concierge', 'requests', 'notices', 'records'],
  WAITER: ['restaurant-pos', 'billing'],
  CHEF: ['kitchen-display', 'restaurant-menu', 'inventory'],
};

export const KNOWN_CHILDREN: Record<string, string[]> = {
  housekeeping: [
    'housekeeping-tasks',
    'housekeeping-allocations',
    'housekeeping-deep-cleaning',
    'housekeeping-reports',
  ],
};

export function expandChildren(keys: string[]): string[] {
  const expanded = new Set(keys);
  for (const key of keys) {
    for (const ck of KNOWN_CHILDREN[key] || []) {
      expanded.add(ck);
    }
  }
  return Array.from(expanded);
}
