'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, Scissors, Users, Receipt } from 'lucide-react';
import { DashHeader, QuickAction, StatCard, DashboardStats } from '../_components/shared';

export default function SalonManagerDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { api.get('reports/stats').then(r => setStats(r.data)).catch(() => {}); }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Salon Dashboard" />
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Today's Revenue" value={`₹${(stats?.revenue.today || 0).toLocaleString()}`} icon={CreditCard} sub="Collections" />
        <StatCard label="Menu Services" value="—" icon={Scissors} sub="Active" />
        <StatCard label="Total Members" value={stats?.totalMembers.toLocaleString() || '—'} icon={Users} sub="Registry" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <QuickAction href="/dashboard/menu/salon" icon={Scissors} label="Salon Menu" />
        <QuickAction href="/dashboard/billing/new?department=SALON" icon={Receipt} label="Salon Billing" />
        <QuickAction href="/dashboard/billing" icon={CreditCard} label="Billing History" />
      </div>
    </div>
  );
}
