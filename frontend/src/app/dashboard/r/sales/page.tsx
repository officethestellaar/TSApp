'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, TrendingUp, Users, Receipt } from 'lucide-react';
import { DashHeader, QuickAction, StatCard, DashboardStats } from '../_components/shared';

export default function SalesExecutiveDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { api.get('reports/stats').then(r => setStats(r.data)).catch(() => {}); }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Sales Dashboard" />
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="New Members (Today)" value={stats?.members.today.toString() || '0'} icon={UserPlus} sub="Registrations" />
        <StatCard label="Month to Date" value={stats?.members.month.toString() || '0'} icon={TrendingUp} sub="New Enrolments" />
        <StatCard label="Total Members" value={stats?.totalMembers.toLocaleString() || '—'} icon={Users} sub="Registry" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <QuickAction href="/dashboard/members/new" icon={UserPlus} label="Register Member" />
        <QuickAction href="/dashboard/members" icon={Users} label="All Members" />
        <QuickAction href="/dashboard/billing" icon={Receipt} label="Billing" />
      </div>
    </div>
  );
}
