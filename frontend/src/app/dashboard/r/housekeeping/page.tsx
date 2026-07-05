'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ClipboardCheck, ClipboardList, Settings, Users, BarChart3, Clock, Package, Inbox } from 'lucide-react';
import { DashHeader, QuickAction, StatCard } from '../_components/shared';

export default function HousekeepingDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Housekeeping Command" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard label="Housekeeping" value="Active" icon={ClipboardCheck} sub="Dashboard" />
        <StatCard label="Tasks" value="—" icon={ClipboardList} sub="Pending" />
        <StatCard label="Deep Cleaning" value="—" icon={Settings} sub="Schedule" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/dashboard/housekeeping" icon={ClipboardCheck} label="Dashboard" />
        <QuickAction href="/dashboard/housekeeping/tasks" icon={ClipboardList} label="Tasks" />
        <QuickAction href="/dashboard/housekeeping/allocations" icon={Users} label="Allocations" />
        <QuickAction href="/dashboard/housekeeping/deep-cleaning" icon={Settings} label="Deep Cleaning" />
        <QuickAction href="/dashboard/housekeeping/reports" icon={BarChart3} label="Reports" />
        <QuickAction href="/dashboard/staff/attendance" icon={Clock} label="Staff Attendance" />
        <QuickAction href="/dashboard/inventory" icon={Package} label="Inventory" />
        <QuickAction href="/dashboard/requests" icon={Inbox} label="Requests" />
      </div>
    </div>
  );
}
