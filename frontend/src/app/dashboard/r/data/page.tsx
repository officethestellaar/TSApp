'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, Users, FileText, Calendar, BookOpen, Package, ShieldCheck, Inbox } from 'lucide-react';
import { DashHeader, QuickAction } from '../_components/shared';

export default function DataOperatorDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Data Entry Console" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/dashboard/members/new" icon={UserPlus} label="Add Member" screenKey="members" />
        <QuickAction href="/dashboard/members" icon={Users} label="Member Records" screenKey="members" />
        <QuickAction href="/dashboard/records" icon={FileText} label="Records" screenKey="records" />
        <QuickAction href="/dashboard/activities" icon={Calendar} label="Activities" screenKey="activities" />
        <QuickAction href="/dashboard/menu" icon={BookOpen} label="Menu Management" screenKey="menu-hub" />
        <QuickAction href="/dashboard/inventory" icon={Package} label="Inventory" screenKey="inventory" />
        <QuickAction href="/dashboard/assets" icon={ShieldCheck} label="Assets" screenKey="assets" />
        <QuickAction href="/dashboard/requests" icon={Inbox} label="Requests" screenKey="requests" />
      </div>
    </div>
  );
}
