'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('auth/forgot-password', { email });
      if (response.data.tempPassword) {
        setTempPassword(response.data.tempPassword);
      }
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[Forgot Password Error]', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('Something went wrong. Please try again.');
      }
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
          <p className="text-navy/60 text-[10px] font-black uppercase tracking-[0.4em]">Reset Password</p>
        </div>

        {isSuccess ? (
          <div className="space-y-8 text-center py-4">
            <div className="flex justify-center">
              <div className="p-5 bg-green-500/10 rounded-full text-green-600 border border-green-500/20">
                <CheckCircle2 size={48} />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-serif font-bold text-navy italic">Reset Password</h2>
              <p className="text-xs text-navy/60 font-medium leading-relaxed">
                Your password has been reset to a temporary one.
              </p>
              {tempPassword && (
                <div className="p-6 bg-navy text-gold rounded-2xl font-mono text-lg font-bold shadow-lg break-all">
                  {tempPassword}
                </div>
              )}
              <p className="text-[9px] text-navy/40 font-bold uppercase tracking-widest mt-4">
                Please use this to login and update your password immediately.
              </p>
            </div>
            <Link href="/login" className="inline-flex items-center gap-2 text-gold font-black text-[10px] uppercase tracking-widest hover:text-navy transition-colors mt-4">
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-4 text-xs font-bold text-red-600 bg-red-500/10 rounded-xl border border-red-500/20 text-center uppercase tracking-widest">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-navy/60 uppercase tracking-[0.3em] block ml-1" htmlFor="email">
                  Registered Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-navy/40">
                    <Mail size={18} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    className="block w-full pl-12 pr-4 py-4 bg-navy/5 border border-navy/10 rounded-2xl focus:ring-2 focus:ring-gold outline-none transition-all text-navy font-bold placeholder:text-navy/20"
                    placeholder="member@stellaar.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    Sending...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="text-center pt-2">
                <Link href="/login" className="inline-flex items-center gap-2 text-navy/40 font-bold text-[10px] uppercase tracking-widest hover:text-navy transition-colors">
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
