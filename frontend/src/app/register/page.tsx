'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Lock, Mail, User, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleName: 'DATA_OPERATOR'
  });
  const [roles, setRoles] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get('auth/roles');
        setRoles(response.data);
      } catch {
        console.error('Failed to fetch protocol roles');
      }
    };
    fetchRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        roleName: formData.roleName
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy px-4">
        <div className="w-full max-w-md p-10 bg-white/5 border border-white/10 rounded-[2.5rem] text-center space-y-8 backdrop-blur-3xl shadow-2xl">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-gold/10 text-gold rounded-full flex items-center justify-center border border-gold/20">
              <CheckCircle2 size={40} />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-serif font-bold text-gold uppercase tracking-wider">Enrollment Logged</h1>
            <p className="text-white/60 text-xs font-medium leading-relaxed">
              Your credentials are awaiting <strong className="text-gold">administrative clearance</strong>. Access will be granted upon verification.
            </p>
          </div>
          <Link
            href="/login"
            className="block w-full py-4 px-6 bg-gold text-navy font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg"
          >
            Back to Access
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-navy px-4 py-12">
      <div className="w-full max-w-lg space-y-10">
        <div className="text-center space-y-4 flex flex-col items-center">
          <div className="relative w-64 h-24">
             <Image 
               src="/Logo_no_Back.png" 
               alt="The Stellaar" 
               fill
               className="object-contain"
               priority
               sizes="(max-width: 768px) 100vw, 256px"
             />
          </div>
          <p className="text-gold/60 text-[9px] font-black uppercase tracking-[0.4em]">Establishment Enrollment</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-[11px] font-black text-red-400 uppercase tracking-wider">{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] ml-2 block" htmlFor="name">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/20">
                  <User size={18} />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-gold outline-none text-white font-bold placeholder:text-white/10"
                  placeholder="Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] ml-2 block" htmlFor="email">
                Official Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/20">
                  <Mail size={18} />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-gold outline-none text-white font-bold placeholder:text-white/10"
                  placeholder="rahul@stellaar.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] ml-2 block" htmlFor="role">
                Registry Role Node
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/20">
                  <ShieldCheck size={18} />
                </span>
                <select
                  id="role"
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-gold outline-none text-white font-bold appearance-none cursor-pointer"
                  value={formData.roleName}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                >
                  <optgroup label="Estate Administration" className="bg-navy text-white">
                    {roles.filter(r => !r.name.startsWith('MEMBER') && r.name !== 'SUPER_ADMIN').map(role => (
                      <option key={role.id} value={role.name}>{role.name.replace('_', ' ')}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Membership Tiers" className="bg-navy text-white">
                    {roles.filter(r => r.name.startsWith('MEMBER')).map(role => (
                      <option key={role.id} value={role.name}>
                        Member ({role.name.replace('MEMBER_', '')} Subscription)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] ml-2 block" htmlFor="password">
                Security Key
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/20">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-gold outline-none text-white font-bold placeholder:text-white/10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] ml-2 block" htmlFor="confirmPassword">
                Confirm Security Key
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/20">
                  <Lock size={18} />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-gold outline-none text-white font-bold placeholder:text-white/10"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 px-8 bg-gold text-navy font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                'Request Enrollment'
              )}
            </button>

            <div className="text-center pt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-[10px] text-white/40 hover:text-white uppercase font-black tracking-widest transition-colors"
              >
                <ArrowLeft size={16} />
                Return to Access
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
