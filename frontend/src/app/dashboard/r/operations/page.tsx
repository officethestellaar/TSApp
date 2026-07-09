'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, Users, UserPlus, ClipboardCheck, Package, ShieldCheck, Clock, Calendar, BarChart3, Inbox } from 'lucide-react';
import { DashHeader, QuickAction, StatCard, DashboardStats, GrantedQuickActions } from '../_components/shared';

export default function OperationsManagerDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { api.get('reports/stats').then(r => setStats(r.data)).catch(() => {}); }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Operations Command" />
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Today's Revenue" value={`₹${(stats?.revenue.today || 0).toLocaleString()}`} icon={CreditCard} sub="Collections" />
        <StatCard label="Members" value={stats?.totalMembers.toLocaleString() || '—'} icon={Users} sub="Total Registry" />
        <StatCard label="New Today" value={stats?.members.today.toString() || '0'} icon={UserPlus} sub="Enrolments" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/dashboard/housekeeping" icon={ClipboardCheck} label="Housekeeping" screenKey="housekeeping" />
        <QuickAction href="/dashboard/inventory" icon={Package} label="Inventory" screenKey="inventory" />
        <QuickAction href="/dashboard/assets" icon={ShieldCheck} label="Assets" screenKey="assets" />
        <QuickAction href="/dashboard/staff/attendance" icon={Clock} label="Staff Attendance" screenKey="staff-attendance" />
        <QuickAction href="/dashboard/activities" icon={Calendar} label="Activities" screenKey="activities" />
        <QuickAction href="/dashboard/members" icon={Users} label="Members" screenKey="members" />
        <QuickAction href="/dashboard/reports" icon={BarChart3} label="Reports" screenKey="reports" />
        <QuickAction href="/dashboard/requests" icon={Inbox} label="Requests" screenKey="requests" />
      </div>
      <GrantedQuickActions />
    </div>
  );
}
