'use client';

import React from 'react';
import Link from 'next/link';
import { Utensils, Scissors, Dumbbell, Waves, Building2, UserCheck, ArrowRight } from 'lucide-react';

const DEPARTMENTS = [
  {
    id: 'restaurant',
    label: 'Restaurant Menu',
    description: 'Manage gourmet dishes, appetizers, mains, desserts, and beverages',
    icon: Utensils,
    href: '/dashboard/menu/restaurant',
    color: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/20',
  },
  {
    id: 'salon',
    label: 'Salon Menu',
    description: 'Manage salon & spa services including haircuts, facials, massages',
    icon: Scissors,
    href: '/dashboard/menu/salon',
    color: 'from-purple-500 to-pink-600',
    shadow: 'shadow-purple-500/20',
  },
  {
    id: 'gym',
    label: 'Gym Menu',
    description: 'Manage memberships, PT sessions, group classes, and equipment rentals',
    icon: Dumbbell,
    href: '/dashboard/menu/gym',
    color: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/20',
  },
  {
    id: 'pool',
    label: 'Pool Menu',
    description: 'Manage swim passes, lessons, lane rentals, and childrens classes',
    icon: Waves,
    href: '/dashboard/menu/pool',
    color: 'from-cyan-500 to-blue-600',
    shadow: 'shadow-cyan-500/20',
  },
  {
    id: 'banquet',
    label: 'Banquet Menu',
    description: 'Manage venues, catering packages, decorations, and AV equipment',
    icon: Building2,
    href: '/dashboard/menu/banquet',
    color: 'from-rose-500 to-red-600',
    shadow: 'shadow-rose-500/20',
  },
  {
    id: 'personal-trainer',
    label: 'Personal Trainer Menu',
    description: 'Manage training sessions, packages, assessments, and nutrition plans',
    icon: UserCheck,
    href: '/dashboard/menu/personal-trainer',
    color: 'from-violet-500 to-indigo-600',
    shadow: 'shadow-violet-500/20',
  },
];

export default function MenuHubPage() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">Menu Management</h1>
          <p className="text-slate/60 font-semibold mt-1 text-sm">
            Select a department to manage its menu items and pricing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENTS.map((dept) => {
            const Icon = dept.icon;
            return (
              <Link
                key={dept.id}
                href={dept.href}
                className={`group relative bg-white rounded-[2.5rem] shadow-2xl border border-navy/[0.04] p-8 overflow-hidden transition-all duration-500 hover:-translate-y-1 ${dept.shadow}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${dept.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${dept.color} flex items-center justify-center shadow-lg`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-navy group-hover:text-gold transition-colors">
                        {dept.label}
                      </h2>
                      <p className="text-xs text-slate/60 font-semibold mt-1">
                        {dept.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gold text-[10px] font-black uppercase tracking-widest group-hover:gap-3 transition-all">
                    Manage Menu <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
