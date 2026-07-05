'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const ROLE_PATHS: Record<string, string> = {
  SUPER_ADMIN: '/dashboard/r/admin',
  ADMIN: '/dashboard/r/admin',
  CLUB_MANAGER: '/dashboard/r/manager',
  OPERATIONS_MANAGER: '/dashboard/r/operations',
  DATA_OPERATOR: '/dashboard/r/data',
  SALES_EXECUTIVE: '/dashboard/r/sales',
  ACCOUNTANT: '/dashboard/r/finance',
  RESTAURANT_MANAGER: '/dashboard/r/restaurant',
  SALON_MANAGER: '/dashboard/r/salon',
  HOUSEKEEPING_SUPERVISOR: '/dashboard/r/housekeeping',
  HOUSEKEEPING_EXECUTIVE: '/dashboard/r/housekeeping',
  RECEPTIONIST: '/dashboard/r/reception',
  WAITER: '/dashboard/r/waiter',
  CHEF: '/dashboard/r/chef',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('auth/login', { email, password });
      const { token, user } = response.data;
      login(token, user);
      
      // Role-based redirection
      if (user.role === 'MEMBER') {
        router.push('/member/dashboard');
      } else {
        router.push(ROLE_PATHS[user.role] || '/dashboard/r/admin');
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen premium-gradient px-4">
      <div className="w-full max-w-md p-10 space-y-8 glass-panel rounded-[2.5rem] shadow-2xl border border-white/20">
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="relative w-72 h-32 mb-2">
            <Image 
              src="/Logo_no_Back.png" 
              alt="The Stellaar Logo" 
              fill
              sizes="(max-width: 768px) 100vw, 288px"
              className="object-contain"
              priority
            />
          </div>
          <p className="text-navy/60 text-[10px] font-black uppercase tracking-[0.4em]">Private Access Portal</p>
        </div>

        {error && (
          <div className="p-4 text-xs font-bold text-red-600 bg-red-500/10 rounded-xl border border-red-500/20 animate-pulse text-center uppercase tracking-widest">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-navy/60 uppercase tracking-[0.3em] block ml-1" htmlFor="email">
              Identity (Email or Mobile)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-navy/40">
                <Mail size={18} />
              </span>
              <input
                id="email"
                type="text"
                required
                className="block w-full pl-12 pr-4 py-4 bg-navy/5 border border-navy/10 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all text-navy font-bold placeholder:text-navy/20"
                placeholder="admin@stellaar.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[9px] font-black text-navy/60 uppercase tracking-[0.3em] block" htmlFor="password">
                Security Key
              </label>
              <Link href="/forgot-password" className="text-[9px] font-black text-gold uppercase tracking-[0.3em] hover:text-navy transition-colors">
                Forgot Key?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-navy/40">
                <Lock size={18} />
              </span>
              <input
                id="password"
                type="password"
                required
                className="block w-full pl-12 pr-4 py-4 bg-navy/5 border border-navy/10 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all text-navy font-bold placeholder:text-navy/20"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 px-6 bg-navy text-gold font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:bg-navy/90 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-10"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Authenticating...
              </>
            ) : (
              'Enter Estate'
            )}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-[10px] text-navy/40 font-bold uppercase tracking-widest">
            Don&apos;t have an estate account?{' '}
            <Link href="/register" className="text-navy hover:text-gold transition-colors font-black border-b border-navy/10">
              Request Enrollment
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
