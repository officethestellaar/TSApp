'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, TrendingUp, PiggyBank, Receipt, BookOpen, AlertCircle, BarChart3, Utensils, Scissors, Dumbbell } from 'lucide-react';
import { DashHeader, QuickAction, StatCard, DashboardStats } from '../_components/shared';

export default function AccountantDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { api.get('reports/stats').then(r => setStats(r.data)).catch(() => {}); }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Finance Terminal" />
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Today's Collection" value={`₹${(stats?.revenue.today || 0).toLocaleString()}`} icon={CreditCard} sub="Revenue" />
        <StatCard label="Month Collection" value={`₹${(stats?.revenue.month || 0).toLocaleString()}`} icon={TrendingUp} sub="MTD" />
        <StatCard label="Yesterday" value={`₹${(stats?.revenue.yesterday || 0).toLocaleString()}`} icon={PiggyBank} sub="Previous Day" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/dashboard/billing" icon={Receipt} label="Billing" />
        <QuickAction href="/dashboard/billing/new" icon={CreditCard} label="New Invoice" />
        <QuickAction href="/dashboard/ledger" icon={BookOpen} label="Ledger" />
        <QuickAction href="/dashboard/amc-approvals" icon={AlertCircle} label="AMC Approvals" />
        <QuickAction href="/dashboard/reports" icon={BarChart3} label="Reports" />
        <QuickAction href="/dashboard/billing/new?department=RESTAURANT" icon={Utensils} label="Restaurant Bill" />
        <QuickAction href="/dashboard/billing/new?department=SALON" icon={Scissors} label="Salon Bill" />
        <QuickAction href="/dashboard/billing/new?department=GYM" icon={Dumbbell} label="Gym Bill" />
      </div>
    </div>
  );
}
