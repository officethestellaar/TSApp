'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Utensils, CheckCircle2, ChefHat, CreditCard, BookOpen, Receipt, DoorOpen } from 'lucide-react';
import { DashHeader, QuickAction, StatCard, DashboardStats } from '../_components/shared';

export default function RestaurantManagerDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tables, setTables] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    api.get('restaurant/tables').then(r => setTables(r.data || [])).catch(() => {});
    api.get('reports/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const activeOrders = tables.filter(t => t.orders?.length > 0);
  const serving = activeOrders.filter(t => t.orders?.[0]?.items?.some((i: any) => i.status === 'READY'));
  const preparing = activeOrders.filter(t => t.orders?.[0]?.items?.some((i: any) => i.status === 'PREPARING'));

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Restaurant Operations" />
      <div className="grid grid-cols-4 gap-5">
        <StatCard label="Active Tables" value={activeOrders.length.toString()} icon={Utensils} sub="With Orders" />
        <StatCard label="Ready to Serve" value={serving.length.toString()} icon={CheckCircle2} sub="Tables" />
        <StatCard label="In Preparation" value={preparing.length.toString()} icon={ChefHat} sub="Tables" />
        <StatCard label="Today's Revenue" value={`₹${(stats?.revenue.today || 0).toLocaleString()}`} icon={CreditCard} sub="Collections" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/dashboard/restaurant" icon={Utensils} label="Table POS" />
        <QuickAction href="/dashboard/restaurant/kds" icon={ChefHat} label="Kitchen Display" />
        <QuickAction href="/dashboard/menu/restaurant" icon={BookOpen} label="Restaurant Menu" />
        <QuickAction href="/dashboard/billing/new?department=RESTAURANT" icon={Receipt} label="Restaurant Billing" />
      </div>
      {activeOrders.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-navy/5">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-navy/40 mb-4">Active Tables</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeOrders.slice(0, 8).map((t: any) => (
              <Link key={t.id} href={`/dashboard/restaurant/table/${t.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-navy/5 rounded-xl hover:bg-navy/10 transition-colors">
                <DoorOpen size={16} className="text-gold" />
                <div>
                  <p className="text-xs font-bold text-navy">Table {t.number}</p>
                  <p className="text-[8px] text-navy/40 font-bold uppercase">{t.orders?.[0]?.items?.length || 0} items</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
