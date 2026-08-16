'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, LayoutDashboard, Users, CreditCard, Utensils, BarChart3, MessageSquare, Bell, ShieldCheck, BookOpen, Package, User, ChefHat, FileText, Calendar, Inbox, Settings, CalendarClock, Scissors, ClipboardCheck, Clock, AlertCircle, Dumbbell, Waves, ClipboardList, Receipt, History } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const SCREEN_ACTION_MAP: Record<string, { label: string; href: string; icon: any; color?: string }> = {
  'overview': { label: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
  'members': { label: 'Members', href: '/dashboard/members', icon: Users },
  'requests': { label: 'Requests', href: '/dashboard/requests', icon: Inbox },
  'records': { label: 'Records', href: '/dashboard/records', icon: FileText },
  'activities': { label: 'Activities', href: '/dashboard/activities', icon: Calendar },
  'concierge': { label: 'Concierge', href: '/dashboard/complaints', icon: MessageSquare },
  'notices': { label: 'Notices', href: '/dashboard/announcements', icon: Bell },
  'billing': { label: 'Billing', href: '/dashboard/billing', icon: Receipt },
  'restaurant-billing': { label: 'Restaurant Billing', href: '/dashboard/billing/new?department=RESTAURANT', icon: Utensils },
  'salon-billing': { label: 'Salon Billing', href: '/dashboard/billing/new?department=SALON', icon: Scissors },
  'gym-billing': { label: 'Gym Billing', href: '/dashboard/billing/new?department=GYM', icon: Dumbbell },
  'pool-billing': { label: 'Pool Billing', href: '/dashboard/billing/new?department=POOL', icon: Waves },
  'banquet-billing': { label: 'Banquet Billing', href: '/dashboard/billing/new?department=BANQUET', icon: Calendar },
  'personal-trainer-billing': { label: 'PT Billing', href: '/dashboard/billing/new?department=PERSONAL_TRAINER', icon: User },
  'menu-hub': { label: 'Menu Hub', href: '/dashboard/menu', icon: BookOpen },
  'amc-approvals': { label: 'AMC Approvals', href: '/dashboard/amc-approvals', icon: AlertCircle },
  'ledger': { label: 'Ledger', href: '/dashboard/ledger', icon: BookOpen },
  'restaurant-pos': { label: 'Restaurant POS', href: '/dashboard/restaurant', icon: Utensils },
  'kitchen-display': { label: 'Kitchen Display', href: '/dashboard/restaurant/kds', icon: ChefHat },
  'restaurant-menu': { label: 'Restaurant Menu', href: '/dashboard/menu/restaurant', icon: BookOpen },
  'inventory': { label: 'Inventory', href: '/dashboard/inventory', icon: Package },
  'assets': { label: 'Assets', href: '/dashboard/assets', icon: ShieldCheck },
  'salon-menu': { label: 'Salon Menu', href: '/dashboard/menu/salon', icon: Scissors },
  'gym-menu': { label: 'Gym Menu', href: '/dashboard/menu/gym', icon: Dumbbell },
  'pool-menu': { label: 'Pool Menu', href: '/dashboard/menu/pool', icon: Waves },
  'banquet-menu': { label: 'Banquet Menu', href: '/dashboard/menu/banquet', icon: Calendar },
  'personal-trainer-menu': { label: 'PT Menu', href: '/dashboard/menu/personal-trainer', icon: User },
  'housekeeping': { label: 'Housekeeping', href: '/dashboard/housekeeping', icon: ClipboardCheck },
  'housekeeping-tasks': { label: 'Tasks', href: '/dashboard/housekeeping/tasks', icon: ClipboardList },
  'housekeeping-allocations': { label: 'Allocations', href: '/dashboard/housekeeping/allocations', icon: Users },
  'housekeeping-deep-cleaning': { label: 'Deep Cleaning', href: '/dashboard/housekeeping/deep-cleaning', icon: Settings },
  'housekeeping-reports': { label: 'Housekeeping Reports', href: '/dashboard/housekeeping/reports', icon: BarChart3 },
  'reports': { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  'audit-logs': { label: 'Audit Logs', href: '/dashboard/access-logs', icon: History },
  'users': { label: 'Users', href: '/dashboard/users', icon: Users },
  'leave': { label: 'Leave', href: '/dashboard/leave', icon: CalendarClock },
  'system-init': { label: 'System Init', href: '/dashboard/init', icon: Settings },
  'staff-attendance': { label: 'Staff Attendance', href: '/dashboard/staff/attendance', icon: Clock },
  'staff-salary': { label: 'Staff Salary', href: '/dashboard/staff/salary', icon: CreditCard },
};

export interface MetricSummary { today: number; yesterday: number; month: number; lastMonth: number; year: number; lastYear: number; growth: { day: number; month: number; year: number; }; }
export interface DashboardStats { totalMembers: number; revenue: MetricSummary; members: MetricSummary; }

export function DashHeader({ user, currentTime, subtitle }: { user: any; currentTime: Date; subtitle?: string }) {
  return (
    <header className="flex justify-between items-end border-b border-navy/5 pb-8 mb-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-navy/40">{subtitle || 'System Node Live'}</p>
        </div>
        <h1 className="text-3xl font-serif font-bold text-navy">Welcome, {user?.name?.split(' ')[0]}</h1>
        <p className="text-slate font-bold uppercase tracking-[0.2em] text-[9px] opacity-60">{user?.role?.replace(/_/g, ' ')}</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-serif font-bold text-navy">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-[9px] font-black text-slate uppercase tracking-[0.3em] mt-1 opacity-40">{currentTime.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>
    </header>
  );
}

export function QuickAction({ href, icon: Icon, label, color, screenKey }: { href: string; icon: any; label: string; color?: string; screenKey?: string }) {
  const { user } = useAuth();
  if (screenKey && user?.screenKeys && !user.screenKeys.includes(screenKey) && user.role !== 'SUPER_ADMIN') {
    return null;
  }
  return (
    <Link href={href} className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-navy/5 hover:border-gold/40 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className={`p-2.5 rounded-xl ${color || 'bg-navy/5'}`}>
        <Icon size={18} className={color ? 'text-white' : 'text-navy'} />
      </div>
      <span className="text-xs font-bold text-navy">{label}</span>
    </Link>
  );
}

export function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: any; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-navy/5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-navy/40">{label}</p>
        <div className="p-2.5 bg-navy/5 rounded-xl">
          <Icon size={18} className="text-navy" />
        </div>
      </div>
      <p className="text-2xl font-serif font-bold text-navy">{value}</p>
      {sub && <p className="text-[8px] font-bold text-slate/40 uppercase tracking-wider mt-1">{sub}</p>}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50/50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-navy/40 italic">Syncing Real-time Nodes...</p>
      </div>
    </div>
  );
}

export function AnalyticCard({ title, value, subValue, icon: Icon, metric }: { title: string, value: string, subValue: string, icon: any, metric?: MetricSummary }) {
  return (
    <div className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-navy/[0.03] group hover:-translate-y-2 transition-all duration-700">
      <div className="flex justify-between items-start mb-10">
        <div className="p-5 bg-navy/5 rounded-3xl group-hover:bg-gold/10 group-hover:text-gold transition-colors duration-500">
          <Icon size={32} className="text-navy transition-colors duration-500 group-hover:text-gold" />
        </div>
        {metric && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase ${metric.growth.month >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {metric.growth.month >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(metric.growth.month)}% MTD
          </div>
        )}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-navy/40 mb-3">{title}</p>
      <h3 className="text-4xl font-serif font-bold text-navy italic mb-2 tracking-tighter">{value}</h3>
      <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">{subValue}</p>
    </div>
  );
}

export function ComparisonNode({ label, growth, subtitle }: { label: string, growth: number, subtitle: string }) {
  const isPositive = growth >= 0;
  return (
    <div className="p-8 rounded-[2.5rem] bg-navy/[0.01] border border-navy/5 hover:bg-navy/[0.02] transition-colors">
      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-navy/40 mb-6">{label}</p>
      <div className="flex items-end gap-3 mb-2">
        <span className={`text-4xl font-serif font-bold italic ${isPositive ? 'text-green-600' : 'text-red-500'}`}>{isPositive ? '+' : ''}{growth}%</span>
        <div className={`p-1 rounded-lg mb-1.5 ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
          {isPositive ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate/40">{subtitle}</p>
    </div>
  );
}

export function GrantedQuickActions() {
  const { user } = useAuth();
  if (!user?.screenKeys || user.role === 'SUPER_ADMIN') return null;
  const granted = user.screenKeys
    .map(key => SCREEN_ACTION_MAP[key])
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex(i => i.href === item.href) === index);
  if (granted.length === 0) return null;
  return (
    <>
      <div className="border-t border-navy/5 pt-6">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-navy/30 mb-4">Granted Modules</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {granted.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-navy/5 hover:border-gold/40 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="p-2.5 rounded-xl bg-navy/5">
                <item.icon size={18} className="text-navy" />
              </div>
              <span className="text-xs font-bold text-navy">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
