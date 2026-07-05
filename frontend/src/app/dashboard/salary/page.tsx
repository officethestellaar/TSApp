'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import {
  IndianRupee, User, CalendarDays, Clock,
  ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { StaffSalary } from '@/types';
import { useAuth } from '@/context/AuthContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface SalaryWithAttendance extends StaffSalary {
  attendanceRecords: {
    id: number;
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
  }[];
}

export default function MySalaryPage() {
  const { user } = useAuth();
  const [salaries, setSalaries] = useState<SalaryWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchSalaries = useCallback(async () => {
    try {
      const res = await api.get('salary/my', { params: { month, year } });
      setSalaries(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800',
      PAID: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-emerald-500';
      case 'LATE': return 'bg-orange-400';
      case 'HALF_DAY': return 'bg-amber-400';
      case 'ABSENT': return 'bg-red-400';
      case 'LEAVE': return 'bg-blue-400';
      case 'HOLIDAY': return 'bg-purple-400';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
              <IndianRupee className="text-gold" size={32} />
              My Salary
            </h1>
            <p className="text-slate/60 font-semibold mt-1 text-sm">
              {user?.name} &middot; {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="flex gap-2">
            <select value={month} onChange={e => { setMonth(Number(e.target.value)); setLoading(true); }} className="px-3 py-2 bg-white border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => { setYear(Number(e.target.value)); setLoading(true); }} className="px-3 py-2 bg-white border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
        ) : salaries.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-navy/[0.04] p-16 text-center">
            <IndianRupee size={48} className="mx-auto text-navy/10 mb-4" />
            <p className="text-slate font-bold uppercase tracking-widest text-xs opacity-40">No salary records found for this period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {salaries.map(s => {
              const isExpanded = expandedId === s.id;
              return (
                <div key={s.id} className="bg-white rounded-[2rem] shadow-xl border border-navy/[0.04] overflow-hidden transition-all">
                  {/* Summary Row */}
                  <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center text-navy shadow-inner">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-navy text-lg">
                          {MONTHS[s.month - 1]} {s.year}
                        </div>
                        <div className="text-xs text-slate/50 font-semibold mt-0.5">
                          {s.attendanceDays} days &middot; {s.paidDays} paid
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-slate/40 font-semibold">Net Pay</div>
                        <div className="text-xl font-bold text-emerald-600">₹{s.netPay.toLocaleString()}</div>
                      </div>
                      {getStatusBadge(s.status)}
                      {isExpanded ? <ChevronUp size={20} className="text-navy/30" /> : <ChevronDown size={20} className="text-navy/30" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-navy/[0.04] px-6 py-5 space-y-6">
                      {/* Earnings Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-navy/[0.02] rounded-xl p-3">
                          <div className="text-[9px] font-black text-navy/40 uppercase tracking-wider">Basic Pay</div>
                          <div className="text-sm font-bold text-navy mt-1">₹{s.basicPay.toLocaleString()}</div>
                        </div>
                        <div className="bg-navy/[0.02] rounded-xl p-3">
                          <div className="text-[9px] font-black text-navy/40 uppercase tracking-wider">HRA</div>
                          <div className="text-sm font-bold text-navy mt-1">₹{s.hra.toLocaleString()}</div>
                        </div>
                        <div className="bg-navy/[0.02] rounded-xl p-3">
                          <div className="text-[9px] font-black text-navy/40 uppercase tracking-wider">Conveyance</div>
                          <div className="text-sm font-bold text-navy mt-1">₹{s.conveyance.toLocaleString()}</div>
                        </div>
                        <div className="bg-navy/[0.02] rounded-xl p-3">
                          <div className="text-[9px] font-black text-navy/40 uppercase tracking-wider">Medical Allowance</div>
                          <div className="text-sm font-bold text-navy mt-1">₹{s.medicalAllowance.toLocaleString()}</div>
                        </div>
                        <div className="bg-navy/[0.02] rounded-xl p-3">
                          <div className="text-[9px] font-black text-navy/40 uppercase tracking-wider">Special Allowance</div>
                          <div className="text-sm font-bold text-navy mt-1">₹{s.specialAllowance.toLocaleString()}</div>
                        </div>
                        <div className="bg-navy/[0.02] rounded-xl p-3">
                          <div className="text-[9px] font-black text-navy/40 uppercase tracking-wider">Other Allowances</div>
                          <div className="text-sm font-bold text-navy mt-1">₹{s.otherAllowances.toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div>
                        <h4 className="text-[9px] font-black text-red-500 uppercase tracking-wider mb-2">Deductions</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-red-50 rounded-xl p-3">
                            <div className="text-[9px] font-black text-red-400 uppercase tracking-wider">PF</div>
                            <div className="text-sm font-bold text-red-600 mt-1">₹{s.pf.toLocaleString()}</div>
                          </div>
                          <div className="bg-red-50 rounded-xl p-3">
                            <div className="text-[9px] font-black text-red-400 uppercase tracking-wider">Professional Tax</div>
                            <div className="text-sm font-bold text-red-600 mt-1">₹{s.professionalTax.toLocaleString()}</div>
                          </div>
                          {(s.esi > 0 || s.tds > 0 || s.otherDeductions > 0) && (
                            <div className="bg-red-50 rounded-xl p-3">
                              <div className="text-[9px] font-black text-red-400 uppercase tracking-wider">Other</div>
                              <div className="text-sm font-bold text-red-600 mt-1">₹{(s.esi + s.tds + s.otherDeductions).toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bonus / Reduction / Invoice */}
                      {(s.bonus > 0 || s.reduction > 0 || s.invoiceNumber) && (
                        <div className="border-t border-navy/[0.04] pt-4 space-y-2">
                          {s.bonus > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-emerald-600">Bonus</span>
                              <span className="font-bold text-emerald-600">+₹{s.bonus.toLocaleString()}</span>
                            </div>
                          )}
                          {s.reduction > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-red-500">Reduction</span>
                              <span className="font-bold text-red-500">-₹{s.reduction.toLocaleString()}</span>
                            </div>
                          )}
                          {s.invoiceNumber && (
                            <div className="flex items-center gap-2 text-xs text-navy/50 font-semibold">
                              <FileText size={12} />
                              Invoice: {s.invoiceNumber}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Final Net Pay */}
                      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex justify-between items-center">
                        <div>
                          <div className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Net Payable</div>
                          {(s.bonus > 0 || s.reduction > 0) && (
                            <div className="text-[10px] text-emerald-600 mt-0.5">
                              {s.bonus > 0 && `Bonus: +₹${s.bonus} `}
                              {s.reduction > 0 && `Reduction: -₹${s.reduction}`}
                            </div>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-emerald-700">₹{s.netPay.toLocaleString()}</div>
                      </div>

                      {/* Attendance Report */}
                      {s.attendanceRecords && s.attendanceRecords.length > 0 && (
                        <div>
                          <h4 className="text-[9px] font-black text-navy/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <CalendarDays size={12} /> Monthly Attendance ({s.attendanceRecords.length} days)
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {s.attendanceRecords.map(att => (
                              <div key={att.id} className="group relative">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-bold text-white ${getAttendanceColor(att.status)}`}>
                                  {new Date(att.date).getDate()}
                                </div>
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-navy text-white text-[9px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 shadow-lg">
                                  {new Date(att.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  <br />
                                  {att.status} {att.checkIn && `| In: ${new Date(att.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                                  {att.checkOut && ` | Out: ${new Date(att.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-4 mt-3 text-[10px] font-semibold text-navy/50">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500"></span> Present</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-400"></span> Late</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400"></span> Half Day</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400"></span> Absent</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400"></span> Leave</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-400"></span> Holiday</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
