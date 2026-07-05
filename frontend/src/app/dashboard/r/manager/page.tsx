'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Users, PiggyBank, Utensils, Receipt, Inbox, Calendar, BarChart3, BookOpen, MessageSquare } from 'lucide-react';
import { DashHeader, QuickAction, StatCard, DashboardStats } from '../_components/shared';

export default function ClubManagerDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tables, setTables] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    api.get('reports/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('restaurant/tables').then(r => setTables(r.data || [])).catch(() => {});
  }, []);

  const activeOrders = tables.filter(t => t.orders?.length > 0).length;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Club Operations" />
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Total Members" value={stats?.totalMembers.toLocaleString() || '—'} icon={Users} sub="Registered" />
        <StatCard label="Today's Revenue" value={`₹${(stats?.revenue.today || 0).toLocaleString()}`} icon={PiggyBank} sub="Collections" />
        <StatCard label="Active Restaurant Tables" value={activeOrders.toString()} icon={Utensils} sub="With Orders" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/dashboard/members" icon={Users} label="Members" />
        <QuickAction href="/dashboard/billing" icon={Receipt} label="Billing" />
        <QuickAction href="/dashboard/restaurant" icon={Utensils} label="Restaurant POS" />
        <QuickAction href="/dashboard/requests" icon={Inbox} label="Requests" />
        <QuickAction href="/dashboard/activities" icon={Calendar} label="Activities" />
        <QuickAction href="/dashboard/reports" icon={BarChart3} label="Reports" />
        <QuickAction href="/dashboard/menu" icon={BookOpen} label="Menus" />
        <QuickAction href="/dashboard/complaints" icon={MessageSquare} label="Concierge" />
      </div>
    </div>
  );
}
