'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import {
  CalendarClock, Check, X, Clock, Search, ChevronDown,
  ChevronUp, User, Plus, FileText, Calendar, AlertCircle
} from 'lucide-react';
import { StaffLeave } from '@/types';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import ExportButton from '@/components/ui/ExportButton';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const LEAVE_TYPES = [
  { value: 'EARNED', label: 'Earned Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'CASUAL', label: 'Casual Leave' },
  { value: 'LWP', label: 'Leave Without Pay' },
];

const POLICY_SECTIONS = [
  {
    title: '1. Working Days & Week Off',
    content: [
      'The employee shall be entitled to one weekly off as decided by the management.',
      'The weekly off day and working time schedule may be changed or rescheduled by the company as per operational requirements.',
    ],
  },
  {
    title: '2. Office Timings, Attendance & Late Mark Policy',
    content: [
      'The employee must report on or before the scheduled reporting time.',
      'A delay of more than 10 minutes from the reporting time will be considered a late mark.',
      'Three late marks in a month will result in one day\'s salary deduction or adjustment of one day off.',
      'The employee must mark attendance through biometric system / attendance register as prescribed by the company.',
      'Proxy attendance, sharing biometric access, or misuse of access credentials will be treated as serious misconduct.',
    ],
  },
  {
    title: '3. Leave Policy',
    content: [
      'Any absence other than the weekly off shall be treated as Leave Without Pay (LWP) unless approved in advance by management as paid leave.',
      'Any unapproved leave will be treated as two days\' leave deduction.',
      'Leave application must be submitted minimum 7 days in advance in writing and is subject to management approval.',
      'Repeated absenteeism or unapproved leave may result in disciplinary action or termination.',
    ],
  },
];

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [showPolicy, setShowPolicy] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const { socket } = useSocket();
  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

  const [formData, setFormData] = useState({
    leaveType: 'EARNED',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const fetchLeaves = useCallback(async () => {
    try {
      const endpoint = isAdmin ? 'leave' : 'leave/my';
      const response = await api.get(endpoint);
      setLeaves(response.data);
    } catch {
      setError('Failed to fetch leave applications');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    if (socket) {
      socket.on('staff_leave', fetchLeaves);
      return () => { socket.off('staff_leave', fetchLeaves); };
    }
  }, [socket, fetchLeaves]);

  const handleReview = async (id: number, status: LeaveStatus) => {
    if (status === 'REJECTED' && !reviewNotes.trim() && reviewingId !== id) {
      setReviewingId(id);
      return;
    }
    try {
      await api.patch(`leave/${id}/review`, { status, reviewNotes: reviewNotes || undefined });
      setLeaves(leaves.map(l => l.id === id ? { ...l, status, reviewedAt: new Date().toISOString() } : l));
      setReviewingId(null);
      setReviewNotes('');
    } catch {
      alert('Failed to update leave status');
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('leave', formData);
      setShowApplyModal(false);
      setFormData({ leaveType: 'EARNED', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch {
      alert('Failed to apply for leave');
    }
  };

  const filtered = leaves.filter(l => {
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (search && !l.user.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800',
      APPROVED: 'bg-emerald-100 text-emerald-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    const icons: Record<string, React.ReactNode> = {
      PENDING: <Clock size={12} className="mr-1" />,
      APPROVED: <Check size={12} className="mr-1" />,
      REJECTED: <X size={12} className="mr-1" />,
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {icons[status]} {status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
      </span>
    );
  };

  const inputClass = "w-full px-4 py-3 bg-navy/[0.03] border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-all";

  return (
    <div className="p-6 space-y-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
              <CalendarClock className="text-gold" size={32} />
              Leave Management
            </h1>
            <p className="text-slate/60 font-semibold mt-1 text-sm">{isAdmin ? 'Review and manage staff leave applications' : 'Apply and track your leave applications'}</p>
          </div>
          <button
            onClick={() => setShowPolicy(!showPolicy)}
            className="flex items-center gap-2 px-4 py-2.5 bg-navy/5 rounded-xl text-navy/60 hover:text-navy hover:bg-navy/10 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <FileText size={14} />
            Leave Policy
            {showPolicy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Policy Section */}
        {showPolicy && (
          <div className="bg-gradient-to-br from-navy/[0.02] to-gold/[0.02] border border-navy/[0.06] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-gold" />
              <span className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em]">Company Leave Policy</span>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {POLICY_SECTIONS.map((section) => (
                <div key={section.title} className="bg-white/60 rounded-xl p-4 border border-navy/[0.04]">
                  <h3 className="text-xs font-bold text-navy mb-2">{section.title}</h3>
                  <ul className="space-y-1.5">
                    {section.content.map((point, i) => (
                      <li key={i} className="text-[11px] leading-relaxed text-slate/70 flex gap-2">
                        <span className="text-gold mt-0.5">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {isAdmin && (
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/30" />
              <input
                type="text"
                placeholder="Search by staff name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </div>
          )}
          <div className={`flex gap-1.5 ${!isAdmin ? 'ml-auto' : ''}`}>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  statusFilter === status
                    ? 'bg-navy text-white shadow-lg'
                    : 'bg-white text-navy/40 hover:text-navy border border-navy/[0.06]'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
              </button>
            ))}
          </div>
          <ExportButton
            filename="leave"
            headers={['Employee', 'Leave Type', 'From', 'To', 'Status', 'Reason']}
            rows={filtered.map(l => [
              l.user?.name || '',
              LEAVE_TYPES.find(t => t.value === l.leaveType)?.label || l.leaveType,
              new Date(l.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              new Date(l.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              l.status,
              l.reason
            ])}
          />
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider"
          >
            <Plus size={14} /> Apply Leave
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-xl">
            <p className="text-red-700 text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-navy/[0.04] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy/[0.02] border-b border-navy/[0.05]">
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Staff</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Leave Type</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Duration</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Reason</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Status</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/[0.03]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center text-slate font-bold uppercase tracking-widest text-xs opacity-40">
                    {isAdmin ? 'No leave applications found.' : 'You have not applied for any leave yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gold/[0.02] transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-navy/5 flex items-center justify-center text-navy shadow-inner">
                          <User size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-navy text-sm">{leave.user?.name || user?.name || 'STAFF'}</div>
                          <div className="text-[9px] font-black text-slate/40 uppercase tracking-wider mt-0.5">{leave.user?.role?.name || user?.role || 'STAFF'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center px-2.5 py-1 bg-navy/5 rounded-lg text-[10px] font-bold text-navy/70 uppercase tracking-wider">
                        {LEAVE_TYPES.find(t => t.value === leave.leaveType)?.label || leave.leaveType}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-navy/70">
                        <Calendar size={12} className="text-gold/60" />
                        {new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        <span className="text-navy/20">—</span>
                        {new Date(leave.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[9px] text-slate/40 font-semibold mt-0.5">
                        {Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-xs font-semibold text-navy/80 max-w-[200px] truncate" title={leave.reason}>
                        {leave.reason}
                      </div>
                    </td>
                    <td className="px-8 py-5">{getStatusBadge(leave.status)}</td>
                    <td className="px-8 py-5 text-right">
                      {isAdmin && leave.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          {reviewingId === leave.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Review notes (optional)..."
                                value={reviewNotes}
                                onChange={e => setReviewNotes(e.target.value)}
                                className="w-36 px-2.5 py-1.5 border border-navy/10 rounded-lg text-[10px] font-semibold focus:outline-none focus:ring-1 focus:ring-gold/40"
                                autoFocus
                              />
                              <button onClick={() => handleReview(leave.id, 'REJECTED')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Confirm Reject">
                                <X size={16} />
                              </button>
                              <button onClick={() => { setReviewingId(null); setReviewNotes(''); }} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
                                <span className="text-[9px] font-bold">CANCEL</span>
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleReview(leave.id, 'APPROVED')}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => handleReview(leave.id, 'REJECTED')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-[9px] font-bold text-navy/30 uppercase tracking-wider">
                          {leave.reviewedBy ? `by ${leave.reviewedBy.name}` : '-'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg mx-4 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                <CalendarClock size={20} className="text-gold" />
                Apply for Leave
              </h2>
              <button onClick={() => setShowApplyModal(false)} className="p-2 hover:bg-navy/5 rounded-xl transition-colors">
                <X size={20} className="text-navy/40" />
              </button>
            </div>
            <form onSubmit={handleApply} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Leave Type</label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={e => setFormData(p => ({ ...p, leaveType: e.target.value }))}
                  className={inputClass}
                >
                  {LEAVE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                  className={`${inputClass} min-h-[100px] resize-none`}
                  placeholder="Please provide a detailed reason for your leave..."
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 px-6 py-3 border border-navy/10 rounded-xl text-xs font-bold text-navy/50 hover:text-navy transition-all uppercase tracking-wider">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-6 py-3 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
