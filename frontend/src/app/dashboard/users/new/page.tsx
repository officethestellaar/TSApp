'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Save, Check } from 'lucide-react';
import Link from 'next/link';
import { Role } from '@/types';
import toast from 'react-hot-toast';

interface ScreenDef {
  key: string;
  label: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'TheStellaarStaff',
    roleId: '',
    defaultCheckIn: '09:00',
    monthlySalary: '',
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [screens, setScreens] = useState<ScreenDef[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get('users/roles');
      setRoles(response.data);
      if (response.data.length > 0) {
        setFormData(prev => ({ ...prev, roleId: response.data[0].id.toString() }));
      }
    } catch {
      console.error('Failed to fetch roles');
    }
  }, []);

  const fetchScreens = useCallback(async () => {
    try {
      const res = await api.get('users/screens');
      setScreens(res.data.allScreens);
    } catch {
      console.error('Failed to fetch screens');
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchScreens();
  }, [fetchRoles, fetchScreens]);

  const toggleScreen = (key: string) => {
    setSelectedScreens(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('users', { ...formData, defaultCheckIn: formData.defaultCheckIn || '09:00', monthlySalary: formData.monthlySalary ? Number(formData.monthlySalary) : 0 });
      const userId = res.data.id;
      // Set granular screen permissions
      const screens: Record<string, { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }> = {};
      for (const key of selectedScreens) {
        screens[key] = { canCreate: false, canRead: true, canUpdate: false, canDelete: false };
      }
      await api.put(`users/${userId}/screens/permissions`, { screens });
      toast.success('Personnel account commissioned successfully');
      router.push('/dashboard/users');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <Link
            href="/dashboard/users"
            className="flex items-center gap-2 text-slate hover:text-navy mb-6 transition-all font-bold text-sm group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Registry
          </Link>
          <h1 className="text-4xl font-serif font-bold text-navy mb-2 tracking-tight">Onboard New Personnel</h1>
          <p className="text-slate font-medium">Grant system access and assign screen permissions</p>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl shadow-navy/5 border border-slate/5 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-10">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-8 border border-red-100 font-bold text-sm">
                {error}
              </div>
            )}

            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3">Full Legal Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-3 bg-navy/5 border border-slate/10 rounded-xl focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate/30 font-bold text-navy"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3">Professional Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-5 py-3 bg-navy/5 border border-slate/10 rounded-xl focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate/30 font-bold text-navy"
                  placeholder="rahul@stellaar.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3">Secure Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-5 py-3 bg-navy/5 border border-slate/10 rounded-xl focus:ring-2 focus:ring-gold outline-none transition-all placeholder:text-slate/30 font-bold text-navy"
                  placeholder="TheStellaarStaff"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3">Operational Role</label>
                <select
                  required
                  className="w-full px-5 py-3 bg-navy/5 border border-slate/10 rounded-xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy appearance-none"
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                >
                  {roles.filter(r => r.name !== 'SUPER_ADMIN' && r.name !== 'MEMBER').map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-[10px] text-slate font-bold uppercase tracking-wider italic">
                  * Roles dictate precise permission layers across The Stellaar ecosystem.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3">Default Check-In Time</label>
                <input
                  type="time"
                  required
                  className="w-full px-5 py-3 bg-navy/5 border border-slate/10 rounded-xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy"
                  value={formData.defaultCheckIn}
                  onChange={(e) => setFormData({ ...formData, defaultCheckIn: e.target.value })}
                />
                <p className="mt-3 text-[10px] text-slate font-bold uppercase tracking-wider italic">
                  * If personnel checks in 10+ mins late, attendance auto-marked as LATE.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3">Monthly Salary (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-5 py-3 bg-navy/5 border border-slate/10 rounded-xl focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy"
                  placeholder="e.g. 25000"
                  value={formData.monthlySalary}
                  onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                />
                <p className="mt-3 text-[10px] text-slate font-bold uppercase tracking-wider italic">
                  * Base monthly salary used for auto-calculation and payroll.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-4">Screen Access Permissions</label>
                <p className="text-xs text-slate/60 mb-4">Select which screens this user can access. Unchecked screens will be hidden from the sidebar.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {screens.map((screen) => (
                    <label
                      key={screen.key}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedScreens.has(screen.key)
                          ? 'border-navy bg-navy/5'
                          : 'border-slate/10 bg-white hover:border-slate/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                        selectedScreens.has(screen.key)
                          ? 'bg-navy text-white'
                          : 'bg-slate/10 text-transparent'
                      }`}>
                        {selectedScreens.has(screen.key) && <Check size={14} />}
                      </div>
                      <span className="text-sm font-semibold text-navy">{screen.label}</span>
                      <input
                        type="checkbox"
                        checked={selectedScreens.has(screen.key)}
                        onChange={() => toggleScreen(screen.key)}
                        className="hidden"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 flex gap-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] bg-navy hover:bg-navy/90 text-gold font-bold py-4 rounded-2xl shadow-xl shadow-navy/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gold"></div>
                ) : (
                  <>
                    <Save size={20} />
                    Commission Account
                  </>
                )}
              </button>
              <Link
                href="/dashboard/users"
                className="flex-1 bg-slate/5 hover:bg-slate/10 text-slate font-bold py-4 rounded-2xl text-center transition-all active:scale-95"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
