'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import {
  CalendarCheck, Check, X,
  User, Plus, Calendar, Clock, Download
} from 'lucide-react';
import { StaffAttendance, User as UserType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'HOLIDAY'] as const;

export default function StaffAttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [users, setUsers] = useState<UserType[]>([]);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StaffAttendance | null>(null);
  const [summary, setSummary] = useState<any[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedRecord, setSelectedRecord] = useState<StaffAttendance | null>(null);

  const [form, setForm] = useState({
    userId: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT' as string,
    overtimeHours: 0,
    remarks: '',
  });

  const canManage = user && ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'].includes(user.role);
  const canCreateAttendance = usePermission('staff-attendance', 'create');
  const canUpdateAttendance = usePermission('staff-attendance', 'update');
  const canManageAttendance = canCreateAttendance || canUpdateAttendance;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('users');
      setUsers(res.data.filter((u: UserType) => u.role.name !== 'MEMBER'));
    } catch {}
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await api.get('attendance', { params: { month, year } });
      setRecords(res.data);
    } catch {
      setError('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('attendance/summary', { params: { month, year } });
      setSummary(res.data);
    } catch {}
  }, [month, year]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { if (canManage) fetchSummary(); }, [fetchSummary, canManage]);

  const handleMark = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await api.patch(`attendance/${editingRecord.id}`, form);
      } else {
        await api.post('attendance', form);
      }
      setShowMarkModal(false);
      setEditingRecord(null);
      setForm({ userId: 0, date: new Date().toISOString().split('T')[0], status: 'PRESENT', overtimeHours: 0, remarks: '' });
      fetchRecords();
      fetchSummary();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleBulkMark = async () => {
    if (!confirm(`Mark all active staff as PRESENT for today?`)) return;
    try {
      const bulkRecords = users.map(u => ({ userId: u.id, date: new Date().toISOString().split('T')[0], status: 'PRESENT' }));
      await api.post('attendance/bulk', { records: bulkRecords });
      fetchRecords();
      fetchSummary();
    } catch { alert('Failed to bulk mark'); }
  };

  const openEdit = (r: StaffAttendance) => {
    setEditingRecord(r);
    setForm({
      userId: r.userId,
      date: r.date.split('T')[0],
      status: r.status,
      overtimeHours: r.overtimeHours,
      remarks: r.remarks || '',
    });
    setShowMarkModal(true);
  };

  const openDetail = (r: StaffAttendance) => {
    if (canUpdateAttendance) {
      openEdit(r);
    } else {
      setSelectedRecord(r);
    }
  };

  const formatTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '-';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      ABSENT: 'bg-red-100 text-red-700 border-red-200',
      LATE: 'bg-orange-100 text-orange-700 border-orange-200',
      HALF_DAY: 'bg-amber-100 text-amber-700 border-amber-200',
      LEAVE: 'bg-blue-100 text-blue-700 border-blue-200',
      HOLIDAY: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const inputClass = "w-full px-4 py-3 bg-navy/[0.03] border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-all";

  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleExport = (format: 'csv' | 'excel') => {
    const headers = ['Staff Name', 'Email', 'Role', 'Date', 'Check In', 'Check Out', 'Status', 'Overtime (hrs)', 'Remarks'];
    const rows = records.map(r => [
      r.user?.name || '',
      r.user?.email || '',
      r.user?.role?.name || '',
      new Date(r.date).toLocaleDateString('en-IN'),
      r.checkIn ? new Date(r.checkIn).toLocaleString('en-IN') : '',
      r.checkOut ? new Date(r.checkOut).toLocaleString('en-IN') : '',
      r.status,
      r.overtimeHours,
      r.remarks || '',
    ]);

    if (format === 'csv') {
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${MONTHS[month - 1]}_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const xsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      const blob = new Blob([xsv], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${MONTHS[month - 1]}_${year}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
              <CalendarCheck className="text-gold" size={32} />
              Staff Attendance
            </h1>
            <p className="text-slate/60 font-semibold mt-1 text-sm">{MONTHS[month - 1]} {year}</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={month} onChange={e => { setMonth(Number(e.target.value)); setLoading(true); }} className="px-3 py-2 bg-white border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => { setYear(Number(e.target.value)); setLoading(true); }} className="px-3 py-2 bg-white border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} className="px-3 py-2 bg-white border border-navy/[0.06] rounded-xl text-xs font-bold text-navy/60 hover:text-navy transition-all uppercase tracking-wider">
              {view === 'grid' ? 'List' : 'Calendar'}
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-navy/[0.06] rounded-xl text-xs font-bold text-navy/60 hover:text-navy transition-all uppercase tracking-wider">
                <Download size={14} /> Export
              </button>
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-navy/[0.04] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
                <button onClick={() => handleExport('csv')} className="w-full px-4 py-2.5 text-left text-xs font-bold text-navy/60 hover:text-navy hover:bg-navy/[0.02] transition-all">CSV</button>
                <button onClick={() => handleExport('excel')} className="w-full px-4 py-2.5 text-left text-xs font-bold text-navy/60 hover:text-navy hover:bg-navy/[0.02] transition-all">Excel (.xls)</button>
              </div>
            </div>
            {canManageAttendance && (
              <>
                {canUpdateAttendance && (
                  <button onClick={handleBulkMark} className="flex items-center gap-2 px-4 py-2.5 bg-navy/5 rounded-xl text-navy/60 hover:text-navy hover:bg-navy/10 transition-all text-xs font-bold uppercase tracking-wider">
                    <Check size={14} /> Bulk Present
                  </button>
                )}
                {canCreateAttendance && (
                  <button onClick={() => { setEditingRecord(null); setForm({ userId: 0, date: new Date().toISOString().split('T')[0], status: 'PRESENT', overtimeHours: 0, remarks: '' }); setShowMarkModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider">
                    <Plus size={14} /> Mark Attendance
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-xl"><p className="text-red-700 text-sm font-semibold">{error}</p></div>}

        {/* Summary Cards */}
          {canManage && summary.length > 0 && (
          <div className="grid grid-cols-6 gap-4 mb-6">
            {['PRESENT','ABSENT','LATE','HALF_DAY','LEAVE','HOLIDAY'].map(status => {
              const total = summary.reduce((s: number, r: any) => s + (r[status.toLowerCase()] || 0), 0);
              const colors: Record<string, string> = {
                PRESENT: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                ABSENT: 'bg-red-50 border-red-200 text-red-700',
                LATE: 'bg-orange-50 border-orange-200 text-orange-700',
                HALF_DAY: 'bg-amber-50 border-amber-200 text-amber-700',
                LEAVE: 'bg-blue-50 border-blue-200 text-blue-700',
                HOLIDAY: 'bg-purple-50 border-purple-200 text-purple-700',
              };
              return (
                <div key={status} className={`rounded-xl border p-4 ${colors[status]}`}>
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-60">{status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
                  <div className="text-2xl font-bold mt-1">{total}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
        ) : view === 'grid' ? (
          /* Calendar Grid View */
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-navy/[0.04] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-navy/[0.02] border-b border-navy/[0.05] sticky top-0">
                    <th className="px-4 py-3 text-[9px] font-black text-slate uppercase tracking-[0.3em] min-w-[150px]">Staff</th>
                    {calendarDays.map(day => (
                      <th key={day} className="px-1.5 py-3 text-[9px] font-black text-slate uppercase tracking-wider text-center w-8">
                        {day}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-[9px] font-black text-slate uppercase tracking-[0.3em] text-center w-16">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/[0.03]">
                  {(canManage ? summary : records.filter(r => r.userId === user?.id).map(r => ({ ...r, name: r.user?.name }))).map((row: any) => (
                    <tr key={row.id || row.userId} className="hover:bg-gold/[0.02] transition-all">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-navy/5 flex items-center justify-center text-navy shadow-inner"><User size={12} /></div>
                          <div className="font-bold text-navy text-xs">{row.name || row.user?.name}</div>
                        </div>
                      </td>
                      {calendarDays.map(day => {
                        const rec = canManage ? records.find(r => r.userId === row.id && new Date(r.date).getDate() === day) : null;
                        return (
                          <td key={day} className="px-1 py-2 text-center">
                            {rec ? (
                              <button
                                onClick={() => openDetail(rec)}
                                className={`w-7 h-7 rounded-lg text-[9px] font-bold border ${getStatusColor(rec.status)} cursor-pointer hover:scale-110 transition-transform`}
                                title={`${rec.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}${rec.checkIn ? ` In:${formatTime(rec.checkIn)}` : ''}${rec.overtimeHours ? ` OT:${rec.overtimeHours}h` : ''}`}
                              >
                                {rec.status === 'PRESENT' ? 'P' : rec.status === 'ABSENT' ? 'A' : rec.status === 'LATE' ? 'Lt' : rec.status === 'HALF_DAY' ? 'HD' : rec.status === 'LEAVE' ? 'L' : 'H'}
                              </button>
                            ) : (
                              <span className="text-navy/10 text-[9px]">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] font-bold text-navy/60">
                          {row.present && calendarDays.length > 0 ? Math.round((row.present / calendarDays.length) * 100) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-navy/[0.04] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy/[0.02] border-b border-navy/[0.05]">
                  <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Staff</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Date</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Check In</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Check Out</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Status</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">OT (hrs)</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Remarks</th>
                  {canManageAttendance && <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em] text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/[0.03]">
                {records.length === 0 ? (
                  <tr><td colSpan={canManage ? 8 : 7} className="px-8 py-24 text-center text-slate font-bold uppercase tracking-widest text-xs opacity-40">No attendance records found.</td></tr>
                ) : records.map(r => (
                  <tr key={r.id} className="hover:bg-gold/[0.02] transition-all">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center text-navy shadow-inner"><User size={14} /></div>
                        <div className="font-bold text-navy text-sm">{r.user?.name}</div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-xs font-semibold text-navy/70">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-8 py-4 text-xs font-semibold text-navy/60">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td className="px-8 py-4 text-xs font-semibold text-navy/60">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td className="px-8 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(r.status)}`}>{r.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span></td>
                    <td className="px-8 py-4 text-xs font-semibold text-navy/60">{r.overtimeHours > 0 ? `${r.overtimeHours}h` : '-'}</td>
                    <td className="px-8 py-4 text-xs font-semibold text-navy/40 max-w-[150px] truncate">{r.remarks || '-'}</td>
                    {canUpdateAttendance && (
                      <td className="px-8 py-4 text-right">
                        <button onClick={() => openEdit(r)} className="px-3 py-1.5 bg-navy/5 rounded-lg text-[10px] font-bold text-navy/60 hover:text-navy hover:bg-navy/10 transition-all uppercase tracking-wider">Edit</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Detail Popover */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm mx-4 p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                <Calendar size={18} className="text-gold" />
                {formatDate(selectedRecord.date)}
              </h2>
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-navy/5 rounded-xl transition-colors"><X size={20} className="text-navy/40" /></button>
            </div>
            <div className="space-y-5">
              <div className="text-center">
                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(selectedRecord.status)}`}>
                  <Clock size={12} /> {selectedRecord.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-navy/[0.03] rounded-2xl p-4 text-center">
                  <div className="text-[9px] font-black text-navy/40 uppercase tracking-[0.2em] mb-1">Check In</div>
                  <div className="text-xl font-bold text-navy">{formatTime(selectedRecord.checkIn)}</div>
                </div>
                <div className="bg-navy/[0.03] rounded-2xl p-4 text-center">
                  <div className="text-[9px] font-black text-navy/40 uppercase tracking-[0.2em] mb-1">Check Out</div>
                  <div className="text-xl font-bold text-navy">{formatTime(selectedRecord.checkOut)}</div>
                </div>
              </div>
              {selectedRecord.overtimeHours > 0 && (
                <div className="flex items-center justify-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-2.5 text-xs font-bold">
                  Overtime: {selectedRecord.overtimeHours}h
                </div>
              )}
              {selectedRecord.remarks && (
                <div className="text-xs text-navy/50 font-semibold bg-navy/[0.02] rounded-xl px-4 py-2.5">{selectedRecord.remarks}</div>
              )}
            </div>
            <button onClick={() => setSelectedRecord(null)} className="w-full mt-6 px-6 py-3 border border-navy/10 rounded-xl text-xs font-bold text-navy/50 hover:text-navy transition-all uppercase tracking-wider">Close</button>
          </div>
        </div>
      )}

      {/* Mark/Edit Attendance Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md mx-4 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                <CalendarCheck size={20} className="text-gold" />
                {editingRecord ? 'Edit Attendance' : 'Mark Attendance'}
              </h2>
              <button onClick={() => setShowMarkModal(false)} className="p-2 hover:bg-navy/5 rounded-xl transition-colors"><X size={20} className="text-navy/40" /></button>
            </div>
            <form onSubmit={handleMark} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Staff</label>
                <select value={form.userId} onChange={e => setForm(p => ({ ...p, userId: Number(e.target.value) }))} className={inputClass} required disabled={!!editingRecord}>
                  <option value={0}>Select staff...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} - {u.role.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputClass} required />
              </div>
              {editingRecord && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-navy/[0.03] rounded-2xl p-3.5 text-center">
                    <div className="text-[8px] font-black text-navy/40 uppercase tracking-[0.2em] mb-1">Check In</div>
                    <div className="text-sm font-bold text-navy flex items-center justify-center gap-1">
                      <Clock size={12} className="text-navy/30" />
                      {formatTime(editingRecord.checkIn)}
                    </div>
                  </div>
                  <div className="bg-navy/[0.03] rounded-2xl p-3.5 text-center">
                    <div className="text-[8px] font-black text-navy/40 uppercase tracking-[0.2em] mb-1">Check Out</div>
                    <div className="text-sm font-bold text-navy flex items-center justify-center gap-1">
                      <Clock size={12} className="text-navy/30" />
                      {formatTime(editingRecord.checkOut)}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputClass}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Overtime Hours</label>
                <input type="number" step="0.5" min="0" value={form.overtimeHours} onChange={e => setForm(p => ({ ...p, overtimeHours: Number(e.target.value) }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Remarks</label>
                <textarea value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} className={`${inputClass} min-h-[80px] resize-none`} placeholder="Optional remarks..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMarkModal(false)} className="flex-1 px-6 py-3 border border-navy/10 rounded-xl text-xs font-bold text-navy/50 hover:text-navy transition-all uppercase tracking-wider">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider">
                  {editingRecord ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
