'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Clock, ShieldCheck, Fingerprint, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AttendanceGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [needsMark, setNeedsMark] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [markedAt, setMarkedAt] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkStatus = useCallback(async () => {
    if (!user || user.role === 'MEMBER') {
      setChecking(false);
      return;
    }
    try {
      const res = await api.get('attendance/today-status');
      if (!res.data.marked) {
        if (!res.data.hasPin) setNeedsSetup(true);
        setNeedsMark(true);
      }
    } catch {
    } finally {
      setChecking(false);
    }
  }, [user]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleMarkWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) { setError('Enter a 4-digit PIN'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('attendance/mark-with-pin', { pin });
      const ts = res.data.record?.checkIn || new Date().toISOString();
      setMarkedAt(ts);
      timerRef.current = setTimeout(() => setNeedsMark(false), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid PIN';
      if (err.response?.data?.needsSetup) setNeedsSetup(true);
      setError(msg);
      setSubmitting(false);
    }
  };

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPin.length !== 4 || !/^\d{4}$/.test(setupPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (setupPin !== setupConfirm) {
      setError('PINs do not match');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.patch('users/me/pin', { newPin: setupPin });
      const res = await api.post('attendance/mark-with-pin', { pin: setupPin });
      const ts = res.data.record?.checkIn || new Date().toISOString();
      setMarkedAt(ts);
      setNeedsSetup(false);
      timerRef.current = setTimeout(() => setNeedsMark(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set PIN');
      setSubmitting(false);
    }
  };

  const handlePinDigit = (d: string) => {
    if (pin.length < 4) { setPin(prev => prev + d); setError(''); }
  };

  const handleClearPin = () => { setPin(''); setError(''); };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>;
  }

  if (markedAt) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-4">
        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm mx-auto p-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-navy">Attendance Marked</h1>
          <div className="bg-navy/[0.03] rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-center gap-2 text-navy/60 text-[10px] font-black uppercase tracking-[0.2em]">
              <Clock size={12} /> Check In Time
            </div>
            <div className="text-3xl font-bold text-navy tracking-tight">{formatTime(markedAt)}</div>
            <div className="text-xs font-semibold text-navy/40">{formatDate(markedAt)}</div>
          </div>
          <p className="text-[9px] text-slate/40 font-semibold uppercase tracking-wider">Welcome, {user?.name}</p>
        </div>
      </div>
    );
  }

  if (needsMark) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-4">
        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm mx-auto p-10 text-center space-y-8">
          {needsSetup ? (
            <>
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto">
                  <KeyRound size={32} className="text-gold" />
                </div>
                <h1 className="text-2xl font-bold text-navy">Set Your PIN</h1>
                <p className="text-sm text-slate/60 font-semibold">Create a 4-digit PIN for attendance</p>
              </div>
              <form onSubmit={handleSetupPin} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-2 text-left">New PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4} value={setupPin} onChange={e => setSetupPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-4 bg-navy/[0.03] border border-navy/[0.06] rounded-2xl text-navy focus:outline-none focus:ring-2 focus:ring-gold/40" placeholder="••••" autoFocus />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-2 text-left">Confirm PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4} value={setupConfirm} onChange={e => setSetupConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-4 bg-navy/[0.03] border border-navy/[0.06] rounded-2xl text-navy focus:outline-none focus:ring-2 focus:ring-gold/40" placeholder="••••" />
                </div>
                {error && <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 rounded-xl px-4 py-3"><AlertCircle size={14} /> {error}</div>}
                <button type="submit" disabled={submitting || !setupPin || !setupConfirm} className="w-full px-6 py-4 bg-gold text-navy font-bold rounded-2xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider disabled:opacity-50">
                  {submitting ? 'Setting up...' : 'Set PIN & Mark Attendance'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto">
                  <Fingerprint size={32} className="text-gold" />
                </div>
                <h1 className="text-2xl font-bold text-navy">Mark Attendance</h1>
                <p className="text-sm text-slate/60 font-semibold">Enter your 4-digit PIN to mark your check-in time</p>
              </div>

              <form onSubmit={handleMarkWithPin} className="space-y-6">
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all ${pin.length > i ? 'bg-gold border-gold' : 'border-navy/20 bg-white'}`} />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-[220px] mx-auto">
                  {['1','2','3','4','5','6','7','8','9'].map(d => (
                    <button key={d} type="button" onClick={() => handlePinDigit(d)} className="w-16 h-16 rounded-2xl bg-navy/5 text-navy text-2xl font-bold hover:bg-navy/10 active:scale-95 transition-all shadow-sm">{d}</button>
                  ))}
                  <button type="button" onClick={handleClearPin} className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 active:scale-95 transition-all uppercase tracking-wider">Clear</button>
                  <button type="button" onClick={() => handlePinDigit('0')} className="w-16 h-16 rounded-2xl bg-navy/5 text-navy text-2xl font-bold hover:bg-navy/10 active:scale-95 transition-all shadow-sm">0</button>
                  <button type="submit" className="w-16 h-16 rounded-2xl bg-gold text-navy font-bold hover:bg-gold/90 active:scale-95 transition-all shadow-sm flex items-center justify-center" disabled={pin.length !== 4 || submitting}>
                    {submitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-navy" /> : <ShieldCheck size={20} />}
                  </button>
                </div>

                {error && <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 rounded-xl px-4 py-3 justify-center"><AlertCircle size={14} /> {error}</div>}
              </form>

              <p className="text-[9px] text-slate/40 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Clock size={10} />
                Current time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
