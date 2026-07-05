'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Utensils, CheckCircle2, Receipt, DoorOpen } from 'lucide-react';
import { DashHeader, QuickAction, StatCard, LoadingSpinner } from '../_components/shared';

export default function WaiterDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const fetchTables = useCallback(async () => {
    try { setTables((await api.get('restaurant/tables')).data || []); } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const activeOrders = tables.filter(t => t.orders?.length > 0);
  const readyToServe = activeOrders.filter(t => t.orders?.[0]?.items?.some((i: any) => i.status === 'READY'));
  const allServed = activeOrders.filter(t => t.orders?.[0]?.items?.every((i: any) => i.status === 'SERVED'));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <DashHeader user={user} currentTime={currentTime} subtitle="Waiter Console" />
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Tables with Orders" value={activeOrders.length.toString()} icon={Utensils} sub="Active" />
        <StatCard label="Ready to Serve" value={readyToServe.length.toString()} icon={CheckCircle2} sub="Tables" />
        <StatCard label="Ready for Bill" value={allServed.length.toString()} icon={Receipt} sub="Tables" />
      </div>
      {activeOrders.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-navy/5">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-navy/40 mb-4">Your Tables</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeOrders.map((t: any) => {
              const order = t.orders?.[0];
              const itemsReady = order?.items?.filter((i: any) => i.status === 'READY').length || 0;
              const itemsServed = order?.items?.filter((i: any) => i.status === 'SERVED').length || 0;
              const totalItems = order?.items?.length || 0;
              return (
                <Link key={t.id} href={`/dashboard/restaurant/table/${t.id}`}
                  className="flex items-center gap-3 px-4 py-3 bg-navy/5 rounded-xl hover:bg-navy/10 transition-colors">
                  <div className={`p-2 rounded-lg ${itemsReady > 0 ? 'bg-green-100 text-green-700' : itemsServed === totalItems && totalItems > 0 ? 'bg-blue-100 text-blue-700' : 'bg-navy/10 text-navy'}`}>
                    <DoorOpen size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-navy">Table {t.number}</p>
                    <p className="text-[8px] text-navy/40 font-bold uppercase truncate">
                      {order?.orderNumber} • {itemsServed}/{totalItems} served
                    </p>
                  </div>
                  {itemsReady > 0 && <span className="text-[8px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{itemsReady} ready</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <QuickAction href="/dashboard/restaurant" icon={Utensils} label="All Tables" />
        <QuickAction href="/dashboard/billing/new?department=RESTAURANT" icon={Receipt} label="Restaurant Billing" />
      </div>
    </div>
  );
}
