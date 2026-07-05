'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import {
  IndianRupee, X, Search, User, Plus, Minus,
  Calculator, ChevronDown, ChevronUp, FileText, CheckCircle
} from 'lucide-react';
import { StaffSalary, User as UserType } from '@/types';
import { usePermission } from '@/hooks/usePermission';
import ExportButton from '@/components/ui/ExportButton';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function StaffSalaryPage() {
  const [salaries, setSalaries] = useState<StaffSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [calculating, setCalculating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingSalary, setEditingSalary] = useState<StaffSalary | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingSalary, setPayingSalary] = useState<StaffSalary | null>(null);
  const [paying, setPaying] = useState(false);

  const canCreateSalary = usePermission('staff-salary', 'create');
  const canUpdateSalary = usePermission('staff-salary', 'update');
  const canDeleteSalary = usePermission('staff-salary', 'delete');
  const canManageSalary = canCreateSalary || canUpdateSalary || canDeleteSalary;

  const emptyForm = () => ({
    userId: 0, basicPay: 0, hra: 0, conveyance: 0,
    medicalAllowance: 0, specialAllowance: 0, otherAllowances: 0,
    pf: 0, esi: 0, professionalTax: 0, tds: 0, otherDeductions: 0,
    attendanceDays: 0, paidDays: 0, remarks: '',
  });
  const [form, setForm] = useState(emptyForm());

  const [payForm, setPayForm] = useState({ bonus: 0, reduction: 0 });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('users');
      setUsers(res.data.filter((u: UserType) => u.role.name !== 'MEMBER'));
    } catch {}
  }, []);

  const fetchSalaries = useCallback(async () => {
    try {
      const res = await api.get('salary', { params: { month, year } });
      setSalaries(res.data);
    } catch {
      setError('Failed to fetch salary records');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  // ── Create / Edit ────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSalary) {
        await api.patch(`salary/${editingSalary.id}`, form);
      } else {
        await api.post('salary', { ...form, month, year });
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingSalary(null);
      setForm(emptyForm());
      fetchSalaries();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save');
    }
  };

  const openEdit = (s: StaffSalary) => {
    setEditingSalary(s);
    setForm({
      userId: s.userId, basicPay: s.basicPay, hra: s.hra,
      conveyance: s.conveyance, medicalAllowance: s.medicalAllowance,
      specialAllowance: s.specialAllowance, otherAllowances: s.otherAllowances,
      pf: s.pf, esi: s.esi, professionalTax: s.professionalTax,
      tds: s.tds, otherDeductions: s.otherDeductions,
      attendanceDays: s.attendanceDays, paidDays: s.paidDays,
      remarks: s.remarks || '',
    });
    setShowEditModal(true);
  };

  // ── Auto Calculate ──────────────────────────────────────

  const handleCalculate = async () => {
    if (!confirm(`Auto-calculate salaries for ${MONTHS[month - 1]} ${year} based on attendance?`)) return;
    setCalculating(true);
    try {
      const res = await api.post('salary/calculate', { month, year });
      alert(`Created ${res.data.created} salary records`);
      fetchSalaries();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  // ── Pay ──────────────────────────────────────────────────

  const openPayModal = (s: StaffSalary) => {
    setPayingSalary(s);
    setPayForm({ bonus: s.bonus, reduction: s.reduction });
    setShowPayModal(true);
  };

  const handlePaySubmit = async () => {
    if (!payingSalary) return;
    setPaying(true);
    try {
      await api.patch(`salary/${payingSalary.id}`, {
        status: 'PAID', bonus: payForm.bonus, reduction: payForm.reduction,
      });
      setShowPayModal(false);
      setPayingSalary(null);
      fetchSalaries();
    } catch {
      alert('Failed to process payment');
    } finally {
      setPaying(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this salary record?')) return;
    try {
      await api.delete(`salary/${id}`);
      fetchSalaries();
    } catch { alert('Failed to delete'); }
  };

  // ── Helpers ──────────────────────────────────────────────

  const calcGross = () =>
    form.basicPay + form.hra + form.conveyance + form.medicalAllowance +
    form.specialAllowance + form.otherAllowances;

  const calcNet = () =>
    calcGross() - form.pf - form.esi - form.professionalTax - form.tds -
    form.otherDeductions;

  const getAdjustedNet = (s: StaffSalary) => (s.netPay || 0) + (s.bonus || 0) - (s.reduction || 0);

  const filtered = salaries.filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (search && !s.user?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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

  const inputClass =
    'w-full px-4 py-3 bg-navy/[0.03] border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-all';

  const totals = {
    gross: filtered.reduce((s, r) => s + r.grossPay, 0),
    net: filtered.reduce((s, r) => s + getAdjustedNet(r), 0),
    pf: filtered.reduce((s, r) => s + r.pf, 0),
    count: filtered.length,
  };

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="p-6 space-y-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
              <IndianRupee className="text-gold" size={32} />
              Staff Salary
            </h1>
            <p className="text-slate/60 font-semibold mt-1 text-sm">{MONTHS[month - 1]} {year}</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              filename={`staff-salary-${MONTHS[month - 1]}-${year}`}
              headers={['Staff','Basic','Allowances','Gross','Deductions','Net Pay','Month','Status']}
              rows={filtered.map(s => [
                s.user?.name || '', s.basicPay,
                s.hra + s.conveyance + s.medicalAllowance + s.specialAllowance + s.otherAllowances,
                s.grossPay,
                s.pf + s.esi + s.professionalTax + s.tds + s.otherDeductions,
                s.netPay, `${MONTHS[s.month - 1]} ${s.year}`, s.status,
              ])}
            />
            <select value={month} onChange={e => { setMonth(Number(e.target.value)); setLoading(true); }}
              className="px-3 py-2 bg-white border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => { setYear(Number(e.target.value)); setLoading(true); }}
              className="px-3 py-2 bg-white border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-gold/40">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {canUpdateSalary && (
              <button onClick={handleCalculate} disabled={calculating}
                className="flex items-center gap-2 px-4 py-2.5 bg-navy/5 rounded-xl text-navy/60 hover:text-navy hover:bg-navy/10 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50">
                <Calculator size={14} /> {calculating ? 'Calculating...' : 'Auto Calculate'}
              </button>
            )}
            {canCreateSalary && (
              <button onClick={() => {
                setEditingSalary(null); setForm(emptyForm()); setShowCreateModal(true);
              }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider">
                <Plus size={14} /> Create Salary
              </button>
            )}
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-navy/[0.06] p-4">
            <div className="text-[10px] font-black text-navy/40 uppercase tracking-wider">Records</div>
            <div className="text-2xl font-bold text-navy mt-1">{totals.count}</div>
          </div>
          <div className="bg-white rounded-xl border border-navy/[0.06] p-4">
            <div className="text-[10px] font-black text-navy/40 uppercase tracking-wider">Gross Pay</div>
            <div className="text-2xl font-bold text-navy mt-1">₹{totals.gross.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl shadow-lg shadow-emerald-200 p-4 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-emerald-300/20"><IndianRupee size={48} /></div>
            <div className="text-[10px] font-black text-emerald-100 uppercase tracking-wider relative">Net Payable</div>
            <div className="text-3xl font-black text-white mt-1 relative tracking-tight">₹{totals.net.toLocaleString()}</div>
            <div className="text-[9px] text-emerald-200 mt-0.5 font-semibold relative">
              {totals.count} employee{totals.count !== 1 ? 's' : ''} &middot; ₹{totals.gross.toLocaleString()} gross
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Total PF</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">₹{totals.pf.toLocaleString()}</div>
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-xl">
            <p className="text-red-700 text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* ── Filters ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/30" />
            <input type="text" placeholder="Search by staff name..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40" />
          </div>
          <div className="flex gap-1.5">
            {['ALL', 'PENDING', 'PAID', 'CANCELLED'].map(st => (
              <button key={st} onClick={() => setStatusFilter(st)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  statusFilter === st
                    ? 'bg-navy text-white shadow-lg'
                    : 'bg-white text-navy/40 hover:text-navy border border-navy/[0.06]'
                }`}>
                {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Salary Cards ───────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-navy/[0.04] p-16 text-center">
            <IndianRupee size={48} className="mx-auto text-navy/10 mb-4" />
            <p className="text-slate font-bold uppercase tracking-widest text-xs opacity-40">
              No salary records found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const open = expandedId === s.id;
              const adjusted = getAdjustedNet(s);
              const hasAdjustment = s.bonus > 0 || s.reduction > 0;
              return (
                <div key={s.id}
                  className={`bg-white rounded-2xl shadow-lg border transition-all ${
                    s.status === 'PAID' ? 'border-emerald-200' : 'border-navy/[0.06]'
                  }`}>

                    {/* ── Summary Row ───────────────────────── */}
                    <div className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => setExpandedId(open ? null : s.id)}>
                      <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center text-navy shadow-inner flex-shrink-0">
                        <User size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-navy text-sm truncate">{s.user?.name}</div>
                        <div className="text-[9px] font-black text-slate/40 uppercase tracking-wider">
                          {s.user?.role?.name} &middot; {s.attendanceDays}/{s.paidDays} days
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 min-w-[140px]">
                        <div className={`text-[9px] font-black uppercase tracking-widest ${s.status === 'PAID' ? 'text-emerald-500' : 'text-navy/30'}`}>
                          Net Payable
                        </div>
                        <div className="relative inline-block">
                          <div className={`text-xl font-black tracking-tight ${
                            s.status === 'PAID' ? 'text-emerald-700' : 'text-emerald-600'
                          }`}>
                            ₹{adjusted.toLocaleString()}
                            {hasAdjustment && <span className="text-[9px] ml-1 text-emerald-500 font-semibold">*</span>}
                          </div>
                          <div className="text-[8px] font-semibold text-navy/30 whitespace-nowrap">
                            Gross <span className="text-navy/50">₹{s.grossPay.toLocaleString()}</span>
                            &nbsp;−&nbsp;Ded. <span className="text-red-400/70">₹{(s.pf + s.esi + s.professionalTax + s.tds + s.otherDeductions).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">{getStatusBadge(s.status)}</div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {s.status === 'PENDING' && canUpdateSalary && (
                          <button onClick={e => { e.stopPropagation(); openPayModal(s); }}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all uppercase tracking-wider shadow-sm">
                            Pay
                          </button>
                        )}
                        {s.status === 'PAID' && s.invoiceNumber && (
                          <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                            <CheckCircle size={10} /> Paid
                          </span>
                        )}
                        <button onClick={e => e.stopPropagation()}
                          className="p-1.5 hover:bg-navy/5 rounded-lg transition-colors">
                          {open ? <ChevronUp size={16} className="text-navy/30" /> : <ChevronDown size={16} className="text-navy/30" />}
                        </button>
                      </div>
                    </div>

                  {/* ── Expanded Details ──────────────────── */}
                  {open && (
                    <div className="border-t border-navy/[0.04] px-4 pb-4 pt-3 space-y-3">

                      {/* Earnings */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { label: 'Basic', value: s.basicPay, color: '' },
                          { label: 'HRA', value: s.hra, color: '' },
                          { label: 'Conveyance', value: s.conveyance, color: '' },
                          { label: 'Medical', value: s.medicalAllowance, color: '' },
                          { label: 'Special', value: s.specialAllowance, color: '' },
                          { label: 'Other', value: s.otherAllowances, color: '' },
                        ].map((item, i) => (
                          <div key={i} className="bg-navy/[0.02] rounded-xl p-2.5">
                            <div className="text-[8px] font-black text-navy/40 uppercase tracking-wider">{item.label}</div>
                            <div className="text-sm font-bold text-navy mt-0.5">₹{item.value.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>

                      {/* Deductions + Adjustments + Invoice */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Deductions */}
                        <div className="bg-red-50 rounded-xl p-3">
                          <div className="text-[8px] font-black text-red-500 uppercase tracking-wider mb-1.5">Deductions</div>
                          <div className="space-y-1">
                            {[
                              { label: 'PF', val: s.pf }, { label: 'ESI', val: s.esi },
                              { label: 'Prof. Tax', val: s.professionalTax },
                              { label: 'TDS', val: s.tds }, { label: 'Other', val: s.otherDeductions },
                            ].filter(x => x.val > 0).map(x => (
                              <div key={x.label} className="flex justify-between text-xs">
                                <span className="font-semibold text-red-600/70">{x.label}</span>
                                <span className="font-bold text-red-600">₹{x.val.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Adjustments & Invoice */}
                        <div className="space-y-2">
                          <div className={`rounded-xl p-3 border ${hasAdjustment ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200' : 'bg-amber-50 border-amber-200/60'}`}>
                            <div className={`text-[8px] font-black uppercase tracking-wider mb-1.5 ${hasAdjustment ? 'text-amber-700' : 'text-amber-600'}`}>Adjustments</div>
                            {hasAdjustment ? (
                              <div className="space-y-1">
                                {s.bonus > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                      <Plus size={10} className="text-emerald-500" /> Bonus
                                    </span>
                                    <span className="font-bold text-emerald-600">+₹{s.bonus.toLocaleString()}</span>
                                  </div>
                                )}
                                {s.reduction > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="font-semibold text-red-500 flex items-center gap-1">
                                      <Minus size={10} className="text-red-400" /> Reduction
                                    </span>
                                    <span className="font-bold text-red-500">-₹{s.reduction.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="border-t border-amber-200/60 pt-1.5 mt-1.5 flex justify-between items-center">
                                  <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider">Adjusted Net</span>
                                  <span className="text-sm font-black text-amber-800">₹{adjusted.toLocaleString()}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs font-semibold text-amber-600/60">No bonus or reduction applied</div>
                            )}
                          </div>

                          {s.invoiceNumber && (
                            <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
                              <FileText size={14} className="text-emerald-600 flex-shrink-0" />
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                Invoice: {s.invoiceNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Net Payable — Hero */}
                      <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 rounded-xl border border-emerald-200 p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Net Payable</div>
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-navy/50">
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">₹{s.grossPay.toLocaleString()} Gross</span>
                              <span className="text-navy/30">&minus;</span>
                              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded">₹{(s.pf + s.esi + s.professionalTax + s.tds + s.otherDeductions).toLocaleString()} Ded.</span>
                              {hasAdjustment && (
                                <>
                                  <span className="text-navy/30">&plusmn;</span>
                                  <span className="text-amber-600 font-bold text-xs">Adj.</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-black text-emerald-700 tracking-tight">₹{adjusted.toLocaleString()}</div>
                            <div className="text-[9px] text-emerald-500 font-semibold">
                              {s.status === 'PAID' ? 'Disbursed' : 'Payable this month'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Remarks */}
                      {s.remarks && (
                        <div className="text-xs text-navy/50 font-medium italic bg-navy/[0.01] rounded-lg px-3 py-1.5">
                          {s.remarks}
                        </div>
                      )}

                      {/* Admin Actions */}
                      {canManageSalary && (
                        <div className="flex gap-2 pt-1 border-t border-navy/[0.04]">
                          <button onClick={() => openEdit(s)}
                            className="px-3 py-1.5 bg-navy/5 rounded-lg text-[10px] font-bold text-navy/60 hover:text-navy hover:bg-navy/10 transition-all uppercase tracking-wider">
                            Edit Components
                          </button>
                          {s.status === 'PENDING' && canUpdateSalary && (
                            <button onClick={() => openPayModal(s)}
                              className="px-3 py-1.5 bg-emerald-50 rounded-lg text-[10px] font-bold text-emerald-600 hover:bg-emerald-100 transition-all uppercase tracking-wider">
                              Pay with Adjustments
                            </button>
                          )}
                          {canDeleteSalary && (
                            <button onClick={() => handleDelete(s.id)}
                              className="px-3 py-1.5 bg-red-50 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-100 transition-all uppercase tracking-wider ml-auto">
                              Delete
                            </button>
                          )}
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

      {/* ── Create Modal ─────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8"
          onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl mx-4 p-8"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                <IndianRupee size={20} className="text-gold" /> Create Salary
              </h2>
              <button onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-navy/5 rounded-xl transition-colors">
                <X size={20} className="text-navy/40" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Staff</label>
                <select value={form.userId}
                  onChange={e => setForm(p => ({ ...p, userId: Number(e.target.value) }))}
                  className={inputClass} required>
                  <option value={0}>Select staff...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} &mdash; {u.role.name}</option>)}
                </select>
              </div>
              <fieldset className="border border-navy/[0.08] rounded-2xl p-4 space-y-3">
                <legend className="text-[9px] font-black text-navy/50 uppercase tracking-[0.2em] px-2">Earnings</legend>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'basicPay', label: 'Basic Pay' },
                    { key: 'hra', label: 'HRA' },
                    { key: 'conveyance', label: 'Conveyance' },
                    { key: 'medicalAllowance', label: 'Medical Allowance' },
                    { key: 'specialAllowance', label: 'Special Allowance' },
                    { key: 'otherAllowances', label: 'Other Allowances' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[8px] font-black text-navy/40 uppercase tracking-[0.15em] mb-1">{f.label}</label>
                      <input type="number" value={(form as any)[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                        className={inputClass} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <fieldset className="border border-navy/[0.08] rounded-2xl p-4 space-y-3">
                <legend className="text-[9px] font-black text-navy/50 uppercase tracking-[0.2em] px-2">Deductions</legend>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'pf', label: 'PF' },
                    { key: 'esi', label: 'ESI' },
                    { key: 'professionalTax', label: 'Professional Tax' },
                    { key: 'tds', label: 'TDS' },
                    { key: 'otherDeductions', label: 'Other Deductions' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[8px] font-black text-navy/40 uppercase tracking-[0.15em] mb-1">{f.label}</label>
                      <input type="number" value={(form as any)[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                        className={inputClass} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Attendance Days</label>
                  <input type="number" value={form.attendanceDays}
                    onChange={e => setForm(p => ({ ...p, attendanceDays: Number(e.target.value) }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Paid Days</label>
                  <input type="number" value={form.paidDays}
                    onChange={e => setForm(p => ({ ...p, paidDays: Number(e.target.value) }))}
                    className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Remarks</label>
                <textarea value={form.remarks}
                  onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                  className={`${inputClass} min-h-[60px] resize-none`} placeholder="Optional..." />
              </div>
              <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 rounded-2xl p-4 border border-emerald-200 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="font-bold text-navy/60">Gross Earnings</span><span className="font-bold text-navy">₹{calcGross().toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="font-bold text-red-600/60">Total Deductions</span><span className="font-bold text-red-600">−₹{(form.pf + form.esi + form.professionalTax + form.tds + form.otherDeductions).toLocaleString()}</span></div>
                <div className="border-t border-emerald-200 pt-2 mt-1.5 flex justify-between items-center">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Net Payable</span>
                  <span className="text-xl font-black text-emerald-700">₹{calcNet().toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-navy/10 rounded-xl text-xs font-bold text-navy/50 hover:text-navy transition-all uppercase tracking-wider">Cancel</button>
                <button type="submit"
                  className="flex-1 px-6 py-3 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider">Create Salary</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Components Modal (earnings + deductions only) ── */}
      {showEditModal && editingSalary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8"
          onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl mx-4 p-8"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                <IndianRupee size={20} className="text-gold" /> Edit Components
              </h2>
              <button onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-navy/5 rounded-xl transition-colors">
                <X size={20} className="text-navy/40" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <fieldset className="border border-navy/[0.08] rounded-2xl p-4 space-y-3">
                <legend className="text-[9px] font-black text-navy/50 uppercase tracking-[0.2em] px-2">Earnings</legend>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'basicPay', label: 'Basic Pay' },
                    { key: 'hra', label: 'HRA' },
                    { key: 'conveyance', label: 'Conveyance' },
                    { key: 'medicalAllowance', label: 'Medical Allowance' },
                    { key: 'specialAllowance', label: 'Special Allowance' },
                    { key: 'otherAllowances', label: 'Other Allowances' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[8px] font-black text-navy/40 uppercase tracking-[0.15em] mb-1">{f.label}</label>
                      <input type="number" value={(form as any)[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                        className={inputClass} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <fieldset className="border border-navy/[0.08] rounded-2xl p-4 space-y-3">
                <legend className="text-[9px] font-black text-navy/50 uppercase tracking-[0.2em] px-2">Deductions</legend>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'pf', label: 'PF' },
                    { key: 'esi', label: 'ESI' },
                    { key: 'professionalTax', label: 'Professional Tax' },
                    { key: 'tds', label: 'TDS' },
                    { key: 'otherDeductions', label: 'Other Deductions' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[8px] font-black text-navy/40 uppercase tracking-[0.15em] mb-1">{f.label}</label>
                      <input type="number" value={(form as any)[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                        className={inputClass} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Attendance Days</label>
                  <input type="number" value={form.attendanceDays}
                    onChange={e => setForm(p => ({ ...p, attendanceDays: Number(e.target.value) }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Paid Days</label>
                  <input type="number" value={form.paidDays}
                    onChange={e => setForm(p => ({ ...p, paidDays: Number(e.target.value) }))}
                    className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Remarks</label>
                <textarea value={form.remarks}
                  onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                  className={`${inputClass} min-h-[60px] resize-none`} placeholder="Optional..." />
              </div>
              <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 rounded-2xl p-4 border border-emerald-200 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="font-bold text-navy/60">Gross Earnings</span><span className="font-bold text-navy">₹{calcGross().toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="font-bold text-red-600/60">Total Deductions</span><span className="font-bold text-red-600">−₹{(form.pf + form.esi + form.professionalTax + form.tds + form.otherDeductions).toLocaleString()}</span></div>
                <div className="border-t border-emerald-200 pt-2 mt-1.5 flex justify-between items-center">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Net Payable</span>
                  <span className="text-xl font-black text-emerald-700">₹{calcNet().toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 border border-navy/10 rounded-xl text-xs font-bold text-navy/50 hover:text-navy transition-all uppercase tracking-wider">Cancel</button>
                <button type="submit"
                  className="flex-1 px-6 py-3 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider">Update Components</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Pay Modal (bonus/reduction adjustments) ──────── */}
      {showPayModal && payingSalary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8"
          onClick={() => setShowPayModal(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg mx-4 p-8"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                <IndianRupee size={20} className="text-gold" /> Process Payment
              </h2>
              <button onClick={() => setShowPayModal(false)}
                className="p-2 hover:bg-navy/5 rounded-xl transition-colors">
                <X size={20} className="text-navy/40" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-navy/[0.02] rounded-2xl p-4 border border-navy/[0.04] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-navy/60">Employee</span>
                  <span className="font-bold text-navy">{payingSalary.user?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-navy/60">Period</span>
                  <span className="font-bold text-navy">{MONTHS[payingSalary.month - 1]} {payingSalary.year}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-navy/[0.06] pt-2">
                  <span className="font-semibold text-navy/60">Calculated Net</span>
                  <span className="font-bold text-navy">₹{payingSalary.netPay.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1">
                    <Plus size={12} className="text-emerald-600" /> Bonus (₹)
                  </label>
                  <input type="number" min="0" value={payForm.bonus}
                    onChange={e => setPayForm(p => ({ ...p, bonus: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-navy/[0.03] border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1">
                    <X size={12} className="text-red-500" /> Reduction (₹)
                  </label>
                  <input type="number" min="0" value={payForm.reduction}
                    onChange={e => setPayForm(p => ({ ...p, reduction: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-navy/[0.03] border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 shadow-lg shadow-emerald-200 relative overflow-hidden">
                <div className="absolute right-2 top-2 text-emerald-300/15"><IndianRupee size={56} /></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[9px] font-black text-emerald-100 uppercase tracking-widest">Final Payable</div>
                    <div className={`text-[10px] font-bold ${payForm.bonus - payForm.reduction >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                      Base: ₹{payingSalary.netPay.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="space-y-0.5">
                      {(payForm.bonus > 0 || payForm.reduction > 0) && (
                        <div className="flex items-center gap-2 text-[11px] text-emerald-100/90 font-semibold">
                          {payForm.bonus > 0 && <span className="bg-white/15 px-2 py-0.5 rounded">+₹{payForm.bonus.toLocaleString()} Bonus</span>}
                          {payForm.reduction > 0 && <span className="bg-red-400/30 px-2 py-0.5 rounded">−₹{payForm.reduction.toLocaleString()} Red.</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">
                      ₹{(payingSalary.netPay + payForm.bonus - payForm.reduction).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPayModal(false)}
                  className="flex-1 px-6 py-3 border border-navy/10 rounded-xl text-xs font-bold text-navy/50 hover:text-navy transition-all uppercase tracking-wider">Cancel</button>
                <button type="button" onClick={handlePaySubmit} disabled={paying}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg text-xs uppercase tracking-wider disabled:opacity-50">
                  {paying ? 'Processing...' : `Confirm Payment`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
