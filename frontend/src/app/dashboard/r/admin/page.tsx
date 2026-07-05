'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import api from '@/lib/api';
import { CreditCard, Users, ShieldCheck, Activity, Calendar } from 'lucide-react';
import { DashHeader, AnalyticCard, ComparisonNode, LoadingSpinner, DashboardStats } from '../_components/shared';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try { setStats((await api.get('reports/stats')).data); } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!socket) return;
    const h = () => fetchStats();
    socket.on('payment_received', h);
    socket.on('new_invoice', h);
    socket.on('new_member', h);
    socket.on('audit_sync', h);
    return () => { socket.off('payment_received', h); socket.off('new_invoice', h); socket.off('new_member', h); socket.off('audit_sync', h); };
  }, [socket, fetchStats]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto">
      <header className="flex justify-between items-end border-b border-navy/5 pb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-navy/40 italic">System Node Live</p>
          </div>
          <h1 className="text-6xl font-serif font-bold text-navy tracking-tighter italic">Welcome, {user?.name?.split(' ')[0]}</h1>
          <p className="text-slate font-bold uppercase tracking-[0.3em] text-[10px] opacity-60">{user?.role?.replace(/_/g, ' ')} • Authorized Access Level 5</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-serif font-bold text-navy italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          <p className="text-[10px] font-black text-slate uppercase tracking-[0.4em] mt-2 opacity-40">{currentTime.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnalyticCard title="Estate Collections" value={`₹ ${stats?.revenue.today.toLocaleString()}`} subValue="Live Revenue Today" icon={CreditCard} metric={stats?.revenue} />
        <AnalyticCard title="New Enrolments" value={stats?.members.today.toString() || '0'} subValue="Members Registered Today" icon={Users} metric={stats?.members} />
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-navy/[0.03] relative overflow-hidden text-navy group hover:-translate-y-2 transition-all duration-700">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-navy group-hover:scale-125 transition-transform duration-1000"><ShieldCheck size={160} /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gold mb-8">Registry Population</p>
          <h3 className="text-7xl font-serif font-bold italic mb-4">{stats?.totalMembers.toLocaleString()}</h3>
          <div className="flex items-center gap-3 py-4 border-t border-navy/5">
            <Activity size={16} className="text-green-500" />
            <p className="text-[9px] font-black uppercase tracking-widest text-navy/60 italic">Active Personnel & Member Nodes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-navy/[0.03]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-navy/40 mb-8 flex items-center gap-2 italic"><Activity size={14} /> Revenue Progression Pulse</h3>
          <div className="flex justify-between items-end mb-6">
            <div><p className="text-[8px] font-black text-slate uppercase tracking-widest mb-1">Today's Collection</p><p className="text-4xl font-serif font-bold text-navy">₹ {stats?.revenue.today.toLocaleString()}</p></div>
            <div className="text-right"><p className="text-[8px] font-black text-slate uppercase tracking-widest mb-1">Yesterday's Total</p><p className="text-2xl font-serif font-bold text-slate/40 italic">₹ {stats?.revenue.yesterday.toLocaleString()}</p></div>
          </div>
          <div className="w-full h-3 bg-navy/5 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-navy transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(10,25,47,0.2)]" style={{ width: `${Math.min(Math.max((stats?.revenue.today || 0) / (stats?.revenue.yesterday || 1) * 100, 5), 100)}%` }} />
          </div>
          <p className="text-[8px] font-black text-navy/30 uppercase tracking-[0.2em]">Today's performance is at {Math.round((stats?.revenue.today || 0) / (stats?.revenue.yesterday || 1) * 100)}% of yesterday's close.</p>
        </div>
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-navy/[0.03]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-navy/40 mb-8 flex items-center gap-2 italic"><Users size={14} /> Enrolment Progression Pulse</h3>
          <div className="flex justify-between items-end mb-6">
            <div><p className="text-[8px] font-black text-slate uppercase tracking-widest mb-1">Today's Enrolments</p><p className="text-4xl font-serif font-bold text-navy">{stats?.members.today}</p></div>
            <div className="text-right"><p className="text-[8px] font-black text-slate uppercase tracking-widest mb-1">Yesterday's Total</p><p className="text-2xl font-serif font-bold text-slate/40 italic">{stats?.members.yesterday}</p></div>
          </div>
          <div className="w-full h-3 bg-navy/5 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gold transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(212,175,55,0.3)]" style={{ width: `${Math.min(Math.max((stats?.members.today || 0) / (stats?.members.yesterday || 1) * 100, 5), 100)}%` }} />
          </div>
          <p className="text-[8px] font-black text-navy/30 uppercase tracking-[0.2em]">Node acquisition at {Math.round((stats?.members.today || 0) / (stats?.members.yesterday || 1) * 100)}% relative to previous cycle.</p>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] shadow-xl border border-navy/[0.03] overflow-hidden p-12">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-navy/40 mb-12 flex items-center gap-4 italic"><Calendar size={16} /> Comparative Growth Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <ComparisonNode label="Day-over-Day" growth={stats?.revenue.growth.day || 0} subtitle="Vs. Yesterday" />
          <ComparisonNode label="Month-over-Month" growth={stats?.revenue.growth.month || 0} subtitle="Vs. Previous Month" />
          <ComparisonNode label="Year-over-Year" growth={stats?.revenue.growth.year || 0} subtitle="Vs. Last Fiscal" />
        </div>
      </div>
    </div>
  );
}
