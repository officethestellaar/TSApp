'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  LayoutDashboard, Users, CreditCard, Utensils, BarChart3,
  MessageSquare, Bell, LogOut, ShieldCheck, History, HardDrive,
  Package, User, IndianRupee, Activity, LucideIcon, ChefHat,
  FileText, BookOpen, Calendar, Inbox, Settings, Building2, PiggyBank,
  CalendarClock, Scissors, Kanban, ClipboardCheck, Calculator,
  Clock, DoorOpen, Coffee, AlertCircle, CheckCircle2,
  Dumbbell, Waves, UserCheck, Wallet
} from 'lucide-react';

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
  screenKey?: string;
}

interface MenuSection {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
}

const ALL_ADMINS = ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'DATA_OPERATOR', 'SALES_EXECUTIVE', 'ACCOUNTANT', 'RESTAURANT_MANAGER', 'SALON_MANAGER', 'HOUSEKEEPING_SUPERVISOR'];
const SENIOR = ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'];

const SECTIONS: MenuSection[] = [
  {
    title: 'Main',
    icon: LayoutDashboard,
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: [...ALL_ADMINS, 'RECEPTIONIST'], screenKey: 'overview' },
      { href: '/dashboard/requests', label: 'Requests', icon: Inbox, roles: ALL_ADMINS, screenKey: 'requests' },
      { href: '/dashboard/records', label: 'Records', icon: FileText, roles: ALL_ADMINS, screenKey: 'records' },
      { href: '/dashboard/activities', label: 'Activities', icon: Calendar, roles: [...ALL_ADMINS, 'RECEPTIONIST'], screenKey: 'activities' },
    ],
  },
  {
    title: 'People',
    icon: Users,
    items: [
      { href: '/dashboard/members', label: 'Members', icon: Users, roles: [...ALL_ADMINS, 'RECEPTIONIST'], screenKey: 'members' },
      { href: '/dashboard/complaints', label: 'Help Desk', icon: MessageSquare, roles: [...ALL_ADMINS, 'RECEPTIONIST'], screenKey: 'concierge' },
      { href: '/dashboard/announcements', label: 'Notices', icon: Bell, roles: ALL_ADMINS, screenKey: 'notices' },
    ],
  },
  {
    title: 'Finance',
    icon: PiggyBank,
    items: [
      { href: '/dashboard/billing', label: 'Billing', icon: CreditCard, roles: ALL_ADMINS, screenKey: 'billing' },
      { href: '/dashboard/amc-approvals', label: 'AMC Approvals', icon: IndianRupee, roles: SENIOR, screenKey: 'amc-approvals' },
      { href: '/dashboard/ledger', label: 'Money Log', icon: BookOpen, roles: ['SUPER_ADMIN'], screenKey: 'ledger' },

    ],
  },
  {
    title: 'Venue',
    icon: Building2,
    items: [
      { href: '/dashboard/restaurant', label: 'Restaurant POS', icon: Utensils, roles: [...ALL_ADMINS, 'WAITER'], screenKey: 'restaurant-pos' },
      { href: '/dashboard/restaurant/kds', label: 'Kitchen Display', icon: ChefHat, roles: [...ALL_ADMINS, 'CHEF'], screenKey: 'kitchen-display' },
      { href: '/dashboard/menu', label: 'All Menus', icon: BookOpen, roles: ALL_ADMINS, screenKey: 'menu-hub' },
      { href: '/dashboard/menu/restaurant', label: 'Restaurant Menu', icon: Utensils, roles: ALL_ADMINS, screenKey: 'restaurant-menu' },
      { href: '/dashboard/menu/salon', label: 'Salon Menu', icon: Scissors, roles: ALL_ADMINS, screenKey: 'salon-menu' },
      { href: '/dashboard/menu/gym', label: 'Gym Menu', icon: Dumbbell, roles: ALL_ADMINS, screenKey: 'gym-menu' },
      { href: '/dashboard/menu/pool', label: 'Pool Menu', icon: Waves, roles: ALL_ADMINS, screenKey: 'pool-menu' },
      { href: '/dashboard/menu/banquet', label: 'Banquet Menu', icon: Building2, roles: ALL_ADMINS, screenKey: 'banquet-menu' },
      { href: '/dashboard/menu/personal-trainer', label: 'PT Menu', icon: UserCheck, roles: ALL_ADMINS, screenKey: 'personal-trainer-menu' },
      { href: '/dashboard/inventory', label: 'Inventory', icon: Package, roles: ALL_ADMINS, screenKey: 'inventory' },
      { href: '/dashboard/assets', label: 'Assets', icon: HardDrive, roles: ALL_ADMINS, screenKey: 'assets' },
    ],
  },
  {
    title: 'Operations',
    icon: Kanban,
    items: [
      { href: '/dashboard/housekeeping', label: 'Dashboard', icon: Kanban, roles: [...ALL_ADMINS, 'HOUSEKEEPING_EXECUTIVE'], screenKey: 'housekeeping' },
      { href: '/dashboard/housekeeping/tasks', label: 'Tasks', icon: Kanban, roles: ALL_ADMINS, screenKey: 'housekeeping-tasks' },
      { href: '/dashboard/housekeeping/allocations', label: 'Allocations', icon: Kanban, roles: ALL_ADMINS, screenKey: 'housekeeping-allocations' },
      { href: '/dashboard/housekeeping/deep-cleaning', label: 'Deep Cleaning', icon: Kanban, roles: ALL_ADMINS, screenKey: 'housekeeping-deep-cleaning' },
      { href: '/dashboard/housekeeping/reports', label: 'Reports', icon: Kanban, roles: ALL_ADMINS, screenKey: 'housekeeping-reports' },
    ],
  },
  {
    title: 'Staff',
    icon: Users,
    items: [
      { href: '/dashboard/staff/attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'], screenKey: 'staff-attendance' },
      { href: '/dashboard/staff/salary', label: 'Salary Overview', icon: Calculator, roles: ['SUPER_ADMIN', 'ADMIN'], screenKey: 'staff-salary' },
      { href: '/dashboard/salary', label: 'My Salary', icon: Wallet, roles: undefined, screenKey: 'salary' },
    ],
  },
  {
    title: 'Insights',
    icon: BarChart3,
    items: [
      { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, roles: ALL_ADMINS, screenKey: 'reports' },
      { href: '/dashboard/access-logs', label: 'Activity Log', icon: History, roles: ['SUPER_ADMIN', 'ADMIN'], screenKey: 'audit-logs' },
      { href: '/dashboard/edit-logs', label: 'Edit Logs', icon: FileText, roles: ['SUPER_ADMIN'], screenKey: 'audit-logs' },
      { href: '/dashboard/export-approvals', label: 'Export Approvals', icon: ShieldCheck, roles: ['SUPER_ADMIN'], screenKey: 'audit-logs' },
    ],
  },
  {
    title: 'Admin',
    icon: Settings,
    items: [
      { href: '/dashboard/users', label: 'Users', icon: ShieldCheck, roles: ['SUPER_ADMIN'], screenKey: 'users' },
      { href: '/dashboard/leave', label: 'Leave', icon: CalendarClock, roles: SENIOR, screenKey: 'leave' },
      { href: '/dashboard/init', label: 'System Setup', icon: Activity, roles: ['SUPER_ADMIN'], screenKey: 'system-init' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'choice' | 'pin' | 'success'>('choice');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>([]);

  const isStaff = user && user.role !== 'MEMBER';

  const handleLogoutClick = () => {
    if (isStaff) {
      setShowCheckout(true);
      setCheckoutStep('choice');
    } else {
      logout();
    }
  };

  const handleBreak = () => {
    setShowCheckout(false);
    logout();
  };

  const handleLeavingOffice = () => {
    setCheckoutStep('pin');
    setPinDigits([]);
    setCheckoutError('');
  };

  const handlePinDigit = (d: string) => {
    if (pinDigits.length < 4) {
      const newDigits = [...pinDigits, d];
      setPinDigits(newDigits);
      setCheckoutError('');
      if (newDigits.length === 4) {
        submitCheckout(newDigits.join(''));
      }
    }
  };

  const clearPin = () => {
    setPinDigits([]);
    setCheckoutError('');
  };

  const submitCheckout = useCallback(async (p: string) => {
    setCheckoutSubmitting(true);
    setCheckoutError('');
    try {
      await api.post('attendance/check-out', { pin: p });
      setCheckoutStep('success');
      setTimeout(() => {
        setShowCheckout(false);
        logout();
      }, 1500);
    } catch (err: any) {
      setCheckoutError(err.response?.data?.message || 'Failed to mark check-out');
      setPinDigits([]);
      setCheckoutSubmitting(false);
    }
  }, [logout]);

  return (
    <>
      <aside className="w-64 premium-gradient text-white flex flex-col fixed inset-y-0 left-0 z-50 shadow-[10px_0_40px_rgba(0,0,0,0.2)]">
        <div className="p-6 border-b border-white/5">
          <div className="relative w-36 h-14 mb-1">
            <Image
              src="/Logo_no_Back.png"
              alt="The Stellaar"
              fill
              className="object-contain"
              priority
              sizes="144px"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => {
              const roleMatch = !item.roles || item.roles.includes(user?.role || '');
              if (!roleMatch) return false;
              if (item.screenKey && user?.screenKeys) {
                if (item.screenKey.endsWith('-billing') && user.screenKeys.includes('billing')) return true;
                return user.screenKeys.includes(item.screenKey);
              }
              return true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                <div className="flex items-center px-3 mb-2">
                  <span className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">
                    {section.title}
                  </span>
                  <div className="flex-1 ml-3 h-px bg-white/5" />
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 group ${
                          isActive
                            ? 'bg-gold/15 text-gold font-bold'
                            : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon size={14} className={`mr-3 transition-all duration-300 ${
                          isActive ? 'text-gold' : 'text-white/30 group-hover:text-white/50'
                        }`} />
                        <span className="text-[11px] font-semibold tracking-wide">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center text-gold font-serif text-sm font-bold border border-gold/20">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-white/80 truncate">{user?.name}</div>
              <div className="text-[8px] text-gold/50 font-semibold uppercase tracking-wider truncate">{user?.role?.replace(/_/g, ' ')}</div>
            </div>
          </div>
          <Link
            href="/dashboard/profile"
            className="flex items-center px-4 py-2 text-white/25 hover:text-white/60 transition-all w-full group text-[9px] font-semibold uppercase tracking-wider rounded-xl hover:bg-white/[0.04] mb-1"
          >
            <User size={12} className="mr-3 group-hover:-translate-x-0.5 transition-transform" />
            Profile
          </Link>
          <button
            onClick={handleLogoutClick}
            className="flex items-center px-4 py-2 text-white/25 hover:text-red-400 transition-all w-full group text-[9px] font-semibold uppercase tracking-wider rounded-xl hover:bg-red-400/5"
          >
            <LogOut size={12} className="mr-3 group-hover:-translate-x-0.5 transition-transform" />
            Logout
          </button>
        </div>
      </aside>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm mx-4 p-10 text-center space-y-6">
            {checkoutStep === 'success' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-navy">Checked Out</h2>
                <p className="text-xs font-semibold text-navy/40">Goodbye, {user?.name}</p>
              </>
            ) : checkoutStep === 'choice' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto">
                  <Clock size={32} className="text-gold" />
                </div>
                <h2 className="text-2xl font-bold text-navy">Before you go...</h2>
                <p className="text-sm text-slate/60 font-semibold">Are you leaving office or on a break?</p>
                <div className="space-y-3 pt-2">
                  <button onClick={handleLeavingOffice} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-navy text-white font-bold rounded-2xl hover:bg-navy/90 transition-all text-xs uppercase tracking-wider shadow-lg">
                    <DoorOpen size={16} /> Leaving Office
                  </button>
                  <button onClick={handleBreak} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gold text-navy font-bold rounded-2xl hover:bg-gold/90 transition-all text-xs uppercase tracking-wider shadow-lg shadow-gold/20">
                    <Coffee size={16} /> On a Break
                  </button>
                </div>
                <button onClick={() => { setShowCheckout(false); }} className="text-[10px] text-slate/40 font-bold uppercase tracking-wider hover:text-slate/60 transition-colors">Cancel</button>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto">
                    <DoorOpen size={32} className="text-gold" />
                  </div>
                  <h2 className="text-2xl font-bold text-navy">Check Out</h2>
                  <p className="text-sm text-slate/60 font-semibold">Enter your PIN to mark check-out time</p>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-center gap-3">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all ${pinDigits.length > i ? 'bg-gold border-gold' : 'border-navy/20 bg-white'}`} />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 max-w-[220px] mx-auto">
                    {['1','2','3','4','5','6','7','8','9'].map(d => (
                      <button key={d} type="button" onClick={() => handlePinDigit(d)} disabled={checkoutSubmitting} className="w-16 h-16 rounded-2xl bg-navy/5 text-navy text-2xl font-bold hover:bg-navy/10 active:scale-95 transition-all shadow-sm disabled:opacity-50">{d}</button>
                    ))}
                    <button type="button" onClick={clearPin} disabled={checkoutSubmitting} className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 active:scale-95 transition-all uppercase tracking-wider disabled:opacity-50">Clear</button>
                    <button type="button" onClick={() => handlePinDigit('0')} disabled={checkoutSubmitting} className="w-16 h-16 rounded-2xl bg-navy/5 text-navy text-2xl font-bold hover:bg-navy/10 active:scale-95 transition-all shadow-sm disabled:opacity-50">0</button>
                    <button type="button" disabled className="w-16 h-16 rounded-2xl opacity-0" />
                  </div>
                  {checkoutError && <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 rounded-xl px-4 py-3 justify-center"><AlertCircle size={14} /> {checkoutError}</div>}
                  {checkoutSubmitting && <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold"></div></div>}
                </div>
                <button onClick={() => { setShowCheckout(false); setCheckoutStep('choice'); setPinDigits([]); }} className="text-[10px] text-slate/40 font-bold uppercase tracking-wider hover:text-slate/60 transition-colors">Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
