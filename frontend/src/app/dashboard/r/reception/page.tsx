'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Users, UserPlus, CreditCard, Search, Receipt, Calendar, MessageSquare, Inbox, Bell, FileText } from 'lucide-react';
import { DashHeader, QuickAction, StatCard, DashboardStats } from '../_components/shared';

export default function ReceptionistDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { api.get('reports/stats').then(r => setStats(r.data)).catch(() => {}); }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Front Desk" />
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Total Members" value={stats?.totalMembers.toLocaleString() || '—'} icon={Users} sub="Registry" />
        <StatCard label="New Today" value={stats?.members.today.toString() || '0'} icon={UserPlus} sub="Enrolments" />
        <StatCard label="Today's Revenue" value={`₹${(stats?.revenue.today || 0).toLocaleString()}`} icon={CreditCard} sub="Collections" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/dashboard/members" icon={Search} label="Find Member" />
        <QuickAction href="/dashboard/members/new" icon={UserPlus} label="New Registration" />
        <QuickAction href="/dashboard/billing/new" icon={Receipt} label="Create Invoice" />
        <QuickAction href="/dashboard/activities" icon={Calendar} label="Activities" />
        <QuickAction href="/dashboard/complaints" icon={MessageSquare} label="Concierge" />
        <QuickAction href="/dashboard/requests" icon={Inbox} label="Requests" />
        <QuickAction href="/dashboard/announcements" icon={Bell} label="Notices" />
        <QuickAction href="/dashboard/records" icon={FileText} label="Records" />
      </div>
    </div>
  );
}
