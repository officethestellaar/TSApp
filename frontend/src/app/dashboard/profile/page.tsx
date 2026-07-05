'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User, Mail, Shield, Lock, Save, Loader2, Camera, UserCheck, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function AdminProfilePage() {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [updatingPin, setUpdatingPin] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('users/me');
        const data = response.data;
        setFormData(prev => ({ ...prev, name: data.name, email: data.email }));
        setHasPin(data.pin !== null && data.pin !== undefined);
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setUpdating(true);
    try {
      await api.patch('users/me', {
        name: formData.name,
        email: formData.email,
        password: formData.password || undefined
      });
      toast.success('Profile saved');
      // Update local auth context if needed
      // Note: we might need to handle token refresh if email changes, but for now we'll just update display
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin.length !== 4 || !/^\d{4}$/.test(pinForm.newPin)) {
      return toast.error('PIN must be exactly 4 digits');
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      return toast.error('PINs do not match');
    }
    setUpdatingPin(true);
    try {
      await api.patch('users/me/pin', {
        currentPin: hasPin ? pinForm.currentPin : undefined,
        newPin: pinForm.newPin,
      });
      toast.success('Attendance PIN updated');
      setHasPin(true);
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update PIN');
    } finally {
      setUpdatingPin(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gold" size={48} /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="flex justify-between items-end">
        <div>
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy/5 text-[9px] font-black uppercase tracking-[0.4em] text-navy mb-4">
             <Shield size={12} />
             Profile
           </div>
           <h1 className="text-5xl font-serif font-bold text-navy tracking-tight italic">Personnel Profile</h1>
           <p className="text-slate/40 text-xs font-black uppercase tracking-[0.2em]">Profile Settings</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Identity Card */}
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-navy p-10 rounded-[3rem] shadow-2xl text-center space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                 <Shield size={120} className="text-white" />
              </div>
              <div className="relative">
                 <div className="w-32 h-32 bg-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10 shadow-inner group-hover:border-gold/40 transition-colors duration-500">
                    <span className="text-5xl font-serif font-bold italic text-gold">{formData.name.charAt(0)}</span>
                 </div>
                 <button className="absolute bottom-0 right-1/2 translate-x-12 translate-y-2 p-3 bg-gold text-navy rounded-2xl shadow-xl hover:scale-110 transition-transform">
                    <Camera size={16} />
                 </button>
              </div>
              <div className="space-y-1 relative z-10">
                 <h2 className="text-2xl font-serif font-bold text-white tracking-tight">{formData.name}</h2>
                 <p className="text-[10px] font-black text-gold uppercase tracking-[0.3em]">{authUser?.role.replace('_', ' ')}</p>
              </div>
              <div className="pt-6 border-t border-white/5 flex justify-center gap-4 relative z-10">
                 <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <UserCheck size={12} className="text-green-400" /> Authorized
                 </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate/5 space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-navy px-2">Access Metrics</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-bold text-slate/40 uppercase">Status</p>
                    <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100">Active</span>
                 </div>
                 <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-bold text-slate/40 uppercase">Encryption</p>
                    <span className="text-[10px] font-black text-navy uppercase tracking-tighter">AES-256-GCM</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2">
           <div className="bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl shadow-navy/5 border border-slate/5">
              <form onSubmit={handleSubmit} className="space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-navy uppercase tracking-[0.2em] ml-1">Full Name</label>
                       <div className="relative">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/20" />
                          <input 
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-slate/5 border-none rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-gold/20 font-bold text-navy transition-all"
                            placeholder="Personnel Name..."
                          />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-navy uppercase tracking-[0.2em] ml-1">Email</label>
                       <div className="relative">
                          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/20" />
                          <input 
                            required
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-slate/5 border-none rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-gold/20 font-bold text-navy transition-all"
                            placeholder="Email Address..."
                          />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-navy uppercase tracking-[0.2em] ml-1">New Password (Optional)</label>
                       <div className="relative">
                          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/20" />
                          <input 
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            className="w-full bg-slate/5 border-none rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-gold/20 font-bold text-navy transition-all"
                            placeholder="••••••••"
                          />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-navy uppercase tracking-[0.2em] ml-1">Confirm Password</label>
                       <div className="relative">
                          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/20" />
                          <input 
                            type="password"
                            value={formData.confirmPassword}
                            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                            className="w-full bg-slate/5 border-none rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-gold/20 font-bold text-navy transition-all"
                            placeholder="••••••••"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate/5">
                    <button 
                      type="submit"
                      disabled={updating}
                      className="w-full md:w-auto px-12 py-5 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                    >
                       {updating ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Profile</>}
                    </button>
                 </div>
               </form>
            </div>

            {/* PIN Settings */}
            <div className="bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl shadow-navy/5 border border-slate/5 mt-8">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                     <KeyRound size={20} className="text-gold" />
                  </div>
                  <div>
                     <h3 className="text-lg font-bold text-navy">Attendance PIN</h3>
                     <p className="text-[10px] font-black text-slate/40 uppercase tracking-[0.2em]">4-digit verification code</p>
                  </div>
               </div>
               <form onSubmit={handlePinUpdate} className="space-y-6">
                  {hasPin && (
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-navy uppercase tracking-[0.2em] ml-1">Current PIN</label>
                        <div className="relative">
                           <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/20" />
                           <input
                             type="password"
                             inputMode="numeric"
                             maxLength={4}
                             value={pinForm.currentPin}
                             onChange={e => setPinForm(p => ({ ...p, currentPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                             className="w-full bg-slate/5 border-none rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-gold/20 font-bold text-navy transition-all tracking-[0.3em] text-center"
                             placeholder="••••"
                           />
                        </div>
                     </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-navy uppercase tracking-[0.2em] ml-1">{hasPin ? 'New PIN' : 'Create PIN'}</label>
                        <div className="relative">
                           <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/20" />
                           <input
                             type="password"
                             inputMode="numeric"
                             maxLength={4}
                             value={pinForm.newPin}
                             onChange={e => setPinForm(p => ({ ...p, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                             className="w-full bg-slate/5 border-none rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-gold/20 font-bold text-navy transition-all tracking-[0.3em] text-center"
                             placeholder="••••"
                           />
                        </div>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-navy uppercase tracking-[0.2em] ml-1">Confirm PIN</label>
                        <div className="relative">
                           <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/20" />
                           <input
                             type="password"
                             inputMode="numeric"
                             maxLength={4}
                             value={pinForm.confirmPin}
                             onChange={e => setPinForm(p => ({ ...p, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                             className="w-full bg-slate/5 border-none rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-gold/20 font-bold text-navy transition-all tracking-[0.3em] text-center"
                             placeholder="••••"
                           />
                        </div>
                     </div>
                  </div>
                  <div className="pt-2">
                     <button
                       type="submit"
                       disabled={updatingPin}
                       className="w-full md:w-auto px-8 py-4 bg-gold text-navy rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-gold/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                     >
                        {updatingPin ? <Loader2 className="animate-spin" size={16} /> : <><KeyRound size={16} /> {hasPin ? 'Update PIN' : 'Set PIN'}</>}
                     </button>
                  </div>
               </form>
            </div>
         </div>
       </div>
     </div>
   );
 }
