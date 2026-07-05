'use client';

import React, { useState, useEffect, Suspense } from 'react';
import api from '@/lib/api';
import { Lock, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing recovery token. Please request a new link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('auth/reset-password', { token, password });
      setIsSuccess(true);
      toast.success('Password updated.');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        <p className="text-navy/60 text-[10px] font-black uppercase tracking-[0.4em]">Reset Password</p>
      </div>

      {isSuccess ? (
        <div className="space-y-8 text-center py-4">
          <div className="flex justify-center">
            <div className="p-5 bg-green-500/10 rounded-full text-green-600 border border-green-500/20">
              <ShieldCheck size={48} />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-navy italic">Password Updated</h2>
            <p className="text-xs text-navy/60 font-medium leading-relaxed">
              Your password has been updated. Redirecting to login...
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <Loader2 size={24} className="text-gold animate-spin" />
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="p-4 text-xs font-bold text-red-600 bg-red-500/10 rounded-xl border border-red-500/20 text-center uppercase tracking-widest">
              {error}
            </div>
          )}

          {!token ? (
            <div className="text-center pt-4">
              <Link href="/forgot-password" className="inline-flex items-center gap-2 text-gold font-black text-[10px] uppercase tracking-widest hover:text-navy transition-colors">
                <ArrowLeft size={14} /> Request New Reset Link
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-navy/60 uppercase tracking-[0.3em] block ml-1" htmlFor="password">
                  New Password
                </label>
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

              <div className="space-y-2">
                <label className="text-[9px] font-black text-navy/60 uppercase tracking-[0.3em] block ml-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-navy/40">
                    <Lock size={18} />
                  </span>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    className="block w-full pl-12 pr-4 py-4 bg-navy/5 border border-navy/10 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all text-navy font-bold placeholder:text-navy/20"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 px-6 bg-navy text-gold font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:bg-navy/90 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen premium-gradient px-4">
      <Suspense fallback={
        <div className="w-full max-w-md p-10 space-y-8 glass-panel rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col items-center justify-center py-20">
          <Loader2 size={48} className="text-gold animate-spin mb-4" />
          <p className="text-[10px] font-black text-navy uppercase tracking-[0.4em]">Loading...</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
