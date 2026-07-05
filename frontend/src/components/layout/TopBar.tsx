'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import NotificationCenter from './NotificationCenter';
import api from '@/lib/api';
import { Search, ChevronDown, X, Receipt, ShieldAlert, Phone, CreditCard, Hash, ExternalLink, CheckCircle, AlertCircle, Utensils } from 'lucide-react';

interface SearchMember {
  id: number;
  membershipNumber: string;
  nameAsAadhaar: string;
  category: string;
  mobileNumber: string;
  status: string;
  amcStatus: string;
  amcApplicable: boolean;
  amcAmount: number;
  amcYear: string;
  ledgerBalance: number;
}

interface InvoiceSummary {
  id: number;
  invoiceNumber: string;
  department: string;
  total: number;
  status: string;
  dueDate: string;
  createdAt: string;
  payments?: { amount: number; paymentMode: string; createdAt: string }[];
}

export default function TopBar() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMember[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SearchMember | null>(null);
  const [memberInvoices, setMemberInvoices] = useState<InvoiceSummary[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setShowDropdown(false); return; }
    setLoading(true);
    try {
      const res = await api.get('members', { params: { search: q } });
      setResults(res.data);
      setShowDropdown(true);
    } catch { setResults([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const openMemberDetail = async (member: SearchMember) => {
    setSelectedMember(member);
    setShowDropdown(false);
    setInvoicesLoading(true);
    try {
      const res = await api.get('billing/invoices', { params: { search: member.membershipNumber } });
      setMemberInvoices(res.data);
    } catch { setMemberInvoices([]); }
    finally { setInvoicesLoading(false); }
  };

  const getAmcBadge = (m: SearchMember) => {
    if (!m.amcApplicable) return { label: 'N/A', cls: 'bg-gray-100 text-gray-500' };
    if (m.amcStatus === 'PAID') return { label: `AMC Paid${m.amcYear ? ` (${m.amcYear})` : ''}`, cls: 'bg-green-50 text-green-700' };
    if (m.amcStatus === 'PENDING_APPROVAL') return { label: 'AMC Pending', cls: 'bg-amber-50 text-amber-700' };
    return { label: `AMC Due - ₹${Number(m.amcAmount).toLocaleString()}`, cls: 'bg-red-50 text-red-700' };
  };

  const getStatusBadge = (s: string) => {
    const map: Record<string, string> = { ACTIVE: 'bg-green-50 text-green-700', INACTIVE: 'bg-gray-100 text-gray-500', EXPIRED: 'bg-red-50 text-red-700', SUSPENDED: 'bg-orange-50 text-orange-700' };
    return map[s] || 'bg-gray-100 text-gray-600';
  };

  return (
    <>
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
        <div className="flex items-center flex-1 max-w-xl" ref={searchRef}>
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gold transition-colors" size={18} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search Member by name, ID, or phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length) setShowDropdown(true); }}
              className="w-full bg-gray-50 border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-gold/20 transition-all outline-none"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X size={16} />
              </button>
            )}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-96 overflow-y-auto z-50">
                {loading ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Searching...</div>
                ) : results.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No members found</div>
                ) : (
                  results.map((m) => {
                    const amc = getAmcBadge(m);
                    return (
                      <button
                        key={m.id}
                        onClick={() => openMemberDetail(m)}
                        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center text-navy font-bold shrink-0">
                          {m.nameAsAadhaar?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-gray-900 truncate">{m.nameAsAadhaar}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(m.status)}`}>{m.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                            <span>{m.membershipNumber}</span>
                            <span>{m.category}</span>
                            <span>{m.mobileNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${amc.cls}`}>{amc.label}</span>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-gray-300 shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="bg-[#0f172a] rounded-full p-1 flex items-center gap-1 shadow-lg border border-white/5">
             <NotificationCenter />
          </div>
          <div className="h-8 w-px bg-gray-100"></div>
          <Link href="/dashboard/profile" className="flex items-center gap-4 group cursor-pointer hover:bg-navy/[0.02] p-2 rounded-2xl transition-all">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-navy uppercase tracking-widest leading-none">{user?.name}</p>
              <p className="text-[9px] text-gold font-black uppercase tracking-tighter mt-1">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-navy flex items-center justify-center text-gold font-serif text-lg font-bold border border-gold/20 group-hover:scale-105 transition-transform shadow-md">
                {user?.name?.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <ChevronDown size={14} className="text-gray-400 group-hover:text-gold transition-colors" />
          </Link>
        </div>
      </header>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-100 rounded-t-[2.5rem] flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-navy flex items-center justify-center text-gold font-serif text-2xl font-bold shadow-lg">
                  {selectedMember.nameAsAadhaar?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedMember.nameAsAadhaar}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="font-mono">{selectedMember.membershipNumber}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span>{selectedMember.category}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadge(selectedMember.status)}`}>{selectedMember.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => { setSelectedMember(null); setMemberInvoices([]); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                  <Phone size={16} className="text-gold shrink-0" />
                  <div>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Mobile</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedMember.mobileNumber}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                  <Hash size={16} className="text-gold shrink-0" />
                  <div>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Member ID</p>
                    <p className="text-sm font-semibold text-gray-800 font-mono">{selectedMember.membershipNumber}</p>
                  </div>
                </div>
              </div>

              {/* AMC Status */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ShieldAlert size={14} className="text-gold" /> AMC Status
                </h3>
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedMember.amcApplicable ? (
                        selectedMember.amcStatus === 'PAID' ? <CheckCircle size={20} className="text-green-500" /> :
                        <AlertCircle size={20} className="text-red-500" />
                      ) : <ShieldAlert size={20} className="text-gray-300" />}
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {selectedMember.amcApplicable ? `AMC ${selectedMember.amcStatus === 'PAID' ? 'Paid' : 'Due'}` : 'AMC Not Applicable'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {selectedMember.amcApplicable
                            ? selectedMember.amcStatus === 'PAID'
                              ? `Paid for ${selectedMember.amcYear || 'N/A'}`
                              : `₹${Number(selectedMember.amcAmount).toLocaleString()} due`
                            : `${selectedMember.category} category`}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                      !selectedMember.amcApplicable ? 'bg-gray-100 text-gray-500' :
                      selectedMember.amcStatus === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {selectedMember.amcApplicable ? selectedMember.amcStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Past Transactions */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Receipt size={14} className="text-gold" /> Past Transactions
                </h3>
                {invoicesLoading ? (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400 text-sm">Loading transactions...</div>
                ) : memberInvoices.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400 text-sm">No transactions found</div>
                ) : (
                  <div className="space-y-2">
                    {memberInvoices.map((inv) => (
                      <div key={inv.id} className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between group hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            inv.status === 'PAID' ? 'bg-green-100 text-green-600' :
                            inv.status === 'OVERDUE' || inv.status === 'UNPAID' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {inv.department === 'RESTAURANT' ? <Utensils size={14} /> : inv.department === 'AMC' ? <ShieldAlert size={14} /> : <CreditCard size={14} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">{inv.invoiceNumber}</span>
                              <span className="text-[9px] text-gray-400 font-mono">{inv.department}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                              <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                              {inv.payments && inv.payments.length > 0 && (
                                <span>Paid via {inv.payments[0].paymentMode.replace(/_/g, ' ')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className={`text-sm font-bold ${inv.status === 'PAID' ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{Number(inv.total).toLocaleString()}
                          </p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            inv.status === 'PAID' ? 'bg-green-50 text-green-700' :
                            inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700' :
                            inv.status === 'UNPAID' ? 'bg-orange-50 text-orange-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {inv.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white p-4 border-t border-gray-100 rounded-b-[2.5rem] flex justify-end">
              <button
                onClick={() => { setSelectedMember(null); setMemberInvoices([]); }}
                className="px-6 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

