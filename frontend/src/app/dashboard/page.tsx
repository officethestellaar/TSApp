'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const ROLE_PATHS: Record<string, string> = {
  SUPER_ADMIN: '/dashboard/r/admin',
  ADMIN: '/dashboard/r/admin',
  CLUB_MANAGER: '/dashboard/r/manager',
  OPERATIONS_MANAGER: '/dashboard/r/operations',
  DATA_OPERATOR: '/dashboard/r/data',
  SALES_EXECUTIVE: '/dashboard/r/sales',
  ACCOUNTANT: '/dashboard/r/finance',
  RESTAURANT_MANAGER: '/dashboard/r/restaurant',
  SALON_MANAGER: '/dashboard/r/salon',
  HOUSEKEEPING_SUPERVISOR: '/dashboard/r/housekeeping',
  HOUSEKEEPING_EXECUTIVE: '/dashboard/r/housekeeping',
  RECEPTIONIST: '/dashboard/r/reception',
  WAITER: '/dashboard/r/waiter',
  CHEF: '/dashboard/r/chef',
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    const path = ROLE_PATHS[user.role];
    if (path) router.replace(path);
    else router.replace('/dashboard/r/admin');
  }, [user, loading, router]);

  return (
    <div className="h-full flex items-center justify-center bg-gray-50/50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={32} className="animate-spin text-navy/40" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-navy/40">Redirecting...</p>
      </div>
    </div>
  );
}
