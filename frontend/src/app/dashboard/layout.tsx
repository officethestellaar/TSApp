'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AttendanceGuard from '@/components/attendance/AttendanceGuard';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { useAuth } from '@/context/AuthContext';

export const dynamic = 'force-dynamic';

const PATH_SCREEN_MAP: Record<string, string> = {
  '/dashboard/restaurant/kds': 'kitchen-display',
  '/dashboard/restaurant/table': 'restaurant-pos',
  '/dashboard/restaurant': 'restaurant-pos',
  '/dashboard/menu/restaurant': 'restaurant-menu',
  '/dashboard/menu/salon': 'salon-menu',
  '/dashboard/menu/gym': 'gym-menu',
  '/dashboard/menu/pool': 'pool-menu',
  '/dashboard/menu/banquet': 'banquet-menu',
  '/dashboard/menu/personal-trainer': 'personal-trainer-menu',
  '/dashboard/menu': 'menu-hub',
  '/dashboard/billing': 'billing',
  '/dashboard/amc-approvals': 'amc-approvals',
  '/dashboard/ledger': 'ledger',
  '/dashboard/inventory': 'inventory',
  '/dashboard/assets': 'assets',
  '/dashboard/housekeeping/tasks': 'housekeeping-tasks',
  '/dashboard/housekeeping/allocations': 'housekeeping-allocations',
  '/dashboard/housekeeping/deep-cleaning': 'housekeeping-deep-cleaning',
  '/dashboard/housekeeping/reports': 'housekeeping-reports',
  '/dashboard/housekeeping': 'housekeeping',
  '/dashboard/reports': 'reports',
  '/dashboard/access-logs': 'audit-logs',
  '/dashboard/users': 'users',
  '/dashboard/init': 'system-init',
  '/dashboard/staff/attendance': 'staff-attendance',
  '/dashboard/staff/salary': 'staff-salary',
  '/dashboard/members': 'members',
  '/dashboard/complaints': 'concierge',
  '/dashboard/announcements': 'notices',
  '/dashboard/requests': 'requests',
  '/dashboard/records': 'records',
  '/dashboard/activities': 'activities',
  '/dashboard/leave': 'leave',
};

function ScreenGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    const path = pathname.split('?')[0];
    let requiredKey: string | undefined;

    const sortedPrefixes = Object.keys(PATH_SCREEN_MAP).sort((a, b) => b.length - a.length);
    for (const prefix of sortedPrefixes) {
      if (path.startsWith(prefix)) {
        requiredKey = PATH_SCREEN_MAP[prefix];
        break;
      }
    }

    if (!requiredKey || user.role === 'SUPER_ADMIN') return;

    const userKeys = user.screenKeys || [];
    let hasAccess = userKeys.includes(requiredKey);
    if (!hasAccess && requiredKey === 'billing') {
      hasAccess = userKeys.some((k: string) => k.endsWith('-billing'));
    }
    if (!hasAccess) {
      router.replace('/dashboard');
    }
  }, [pathname, user, loading, router]);

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AttendanceGuard>
        <ScreenGuard>
          <div className="min-h-screen bg-gray-100 flex">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
              <TopBar />
              <main className="flex-1 p-8">
                {children}
              </main>
            </div>
          </div>
        </ScreenGuard>
      </AttendanceGuard>
    </ProtectedRoute>
  );
}
