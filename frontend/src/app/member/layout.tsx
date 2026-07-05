'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Clock, CreditCard, LogOut, User, MessageSquare, ChevronRight, Home, Bell, Utensils } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import NotificationCenter from '@/components/layout/NotificationCenter';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  const navItems = [
    { href: '/member/dashboard', icon: Home, label: 'Passport' },
    { href: '/member/announcements', icon: Bell, label: 'Notices' },
    { href: '/member/activities', icon: Calendar, label: 'Curations' },
    { href: '/member/restaurant', icon: Utensils, label: 'Dining' },
    { href: '/member/reservations', icon: Clock, label: 'Registry' },
    { href: '/member/billing', icon: CreditCard, label: 'Treasury', primaryOnly: true },
    { href: '/member/complaints', icon: MessageSquare, label: 'Concierge' },
  ];

  const filteredNavItems = navItems.filter(item => !item.primaryOnly || !user?.affiliateId);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getBreadcrumb = () => {
    const item = navItems.find(i => i.href === pathname);
    return item ? item.label : 'Estate';
  };

  return (
    <div className="min-h-screen marble-overlay flex relative bg-[#F8F9FA] overflow-x-hidden">
      {/* Persistent Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[40%] rounded-full bg-gold/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[40%] rounded-full bg-navy/20 blur-[120px]"></div>
      </div>

      {/* 🟢 PREMIUM SIDEBAR (Desktop Only) */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-24 bg-navy z-[120] flex-col items-center py-10 shadow-2xl border-r border-white/5 group transition-all duration-500 hover:w-64">
         <div className="relative w-12 h-12 mb-16 shrink-0 group-hover:scale-110 transition-transform duration-500">
            <Image 
               src="/Logo_no_Back.png" 
               alt="" 
               fill 
               className="object-contain" 
               style={{ filter: 'brightness(0) saturate(100%) invert(85%) sepia(35%) saturate(1313%) hue-rotate(353deg) brightness(96%) contrast(92%)' }} 
            />
         </div>

         <nav className="flex-1 w-full px-4 space-y-4">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 group/nav ${
                    isActive ? 'bg-gold text-navy shadow-lg shadow-gold/20' : 'text-white/30 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={20} className={`shrink-0 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover/nav:scale-110'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {item.label}
                  </span>
                </Link>
              );
            })}
         </nav>

         <div className="w-full px-4 pt-8 border-t border-white/5 space-y-4">
            <Link 
               href="/member/profile" 
               className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${
                  pathname === '/member/profile' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'
               }`}
            >
               <User size={20} className="shrink-0" />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Profile</span>
            </Link>
            <button 
               onClick={logout}
               className="flex items-center gap-4 p-4 w-full rounded-2xl text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-all duration-500"
            >
               <LogOut size={20} className="shrink-0" />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Logout</span>
            </button>
         </div>
      </aside>

      {/* ⚪️ CONTEXTUAL TOP BAR (Desktop + Mobile) */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`fixed top-0 right-0 z-[100] transition-all duration-700 ${
          isScrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate/5 py-4' : 'bg-transparent py-8'
        } ${'left-0 lg:left-24'}`}>
           <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
              {/* Breadcrumb / Section Identity */}
              <div className="flex items-center gap-3">
                 <Link href="/member/dashboard" className="text-navy/40 hover:text-navy transition-colors">
                    <Home size={16} />
                 </Link>
                 <ChevronRight size={14} className="text-slate/20" />
                 <span className="text-[10px] font-black text-navy uppercase tracking-[0.3em]">{getBreadcrumb()}</span>
              </div>

              {/* Utility Node */}
              <div className="flex items-center gap-6 lg:gap-10">
                 <div className="bg-[#0f172a] rounded-full p-1 flex items-center gap-1 shadow-lg border border-white/5">
                    <NotificationCenter />
                 </div>

                 <Link href="/member/profile" className="flex items-center gap-4 bg-white shadow-sm border border-slate/10 p-1.5 pr-6 rounded-full hover:shadow-md transition-all duration-500 group">
                    <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold font-serif font-bold italic group-hover:scale-105 transition-transform">
                       {user?.name?.charAt(0)}
                    </div>
                    <div className="hidden sm:block text-left">
                       <p className="text-[9px] font-black text-navy uppercase tracking-widest leading-none">{user?.name?.split(' ')[0]}</p>
                       <p className="text-[7px] font-black text-gold/60 uppercase tracking-tighter mt-1">Verified Member</p>
                    </div>
                 </Link>
              </div>
           </div>
        </header>

        {/* 🟣 MAIN CONTENT AREA */}
        <main className={`flex-1 pt-32 lg:pt-40 px-4 md:px-8 ${'lg:ml-24'}`}>
           <div className="max-w-7xl mx-auto">
              {children}
           </div>
        </main>

        {/* 📱 MOBILE BOTTOM NAV (Floating Action Node) */}
        <div className="lg:hidden fixed bottom-8 left-0 right-0 z-[120] px-6">
           <nav className="bg-navy/95 backdrop-blur-3xl rounded-[2.5rem] p-2 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 ring-1 ring-white/5">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={`relative p-5 rounded-[2rem] transition-all duration-500 flex flex-col items-center gap-1 ${
                      isActive ? 'bg-gold text-navy shadow-xl scale-110 -translate-y-2' : 'text-white/30'
                    }`}
                  >
                    <item.icon size={20} />
                    {isActive && <span className="absolute -bottom-1 w-1 h-1 bg-navy rounded-full"></span>}
                  </Link>
                )
              })}
              <button 
                 onClick={logout}
                 className="p-5 text-red-400/40 hover:text-red-400 transition-colors"
              >
                 <LogOut size={20} />
              </button>
           </nav>
        </div>

        {/* Spacing for mobile bottom nav */}
        <div className="h-32 lg:hidden"></div>
      </div>
    </div>
  );
}
