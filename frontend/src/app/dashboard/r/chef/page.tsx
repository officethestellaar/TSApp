'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ChefHat, Clock, AlertCircle, BookOpen, Package } from 'lucide-react';
import { DashHeader, QuickAction, StatCard, LoadingSpinner } from '../_components/shared';

export default function ChefDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const fetchOrders = useCallback(async () => {
    try { setOrders((await api.get('restaurant/kds/active')).data || []); } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalOrders = orders.length;
  const preparingOrders = orders.filter(o => o.items?.some((i: any) => i.status === 'PREPARING'));
  const pendingOrders = orders.filter(o => o.items?.some((i: any) => i.status === 'PENDING'));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Kitchen Command" />
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Active Orders" value={totalOrders.toString()} icon={ChefHat} sub="In Kitchen" />
        <StatCard label="In Preparation" value={preparingOrders.length.toString()} icon={Clock} sub="Being Cooked" />
        <StatCard label="Pending Start" value={pendingOrders.length.toString()} icon={AlertCircle} sub="Awaiting" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <QuickAction href="/dashboard/restaurant/kds" icon={ChefHat} label="Kitchen Display" />
        <QuickAction href="/dashboard/menu/restaurant" icon={BookOpen} label="Restaurant Menu" />
        <QuickAction href="/dashboard/inventory" icon={Package} label="Inventory" />
      </div>
    </div>
  );
}
