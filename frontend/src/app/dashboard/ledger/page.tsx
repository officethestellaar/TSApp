'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { BookOpen, Search, Activity, User, CreditCard, Clock, Edit, Trash2, Save, X } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import ExportButton from '@/components/ui/ExportButton';

interface Transaction {
  id: number;
  staffId: number;
  staffName: string;
  memberName: string;
  memberId: string;
  amount: number;
  type: string;
  description: string;
  timestamp: string;
}

export default function FinancialLedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canUpdateLedger = usePermission('ledger', 'update');
  const canDeleteLedger = usePermission('ledger', 'delete');
  const canManageLedger = isSuperAdmin || canUpdateLedger || canDeleteLedger;

  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchLedger = useCallback(async () => {
    try {
      const response = await api.get('system/ledger');
      setTransactions(response.data);
    } catch {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  useEffect(() => {
    if (socket) {
      socket.on('payment_received', fetchLedger);
      socket.on('new_invoice', fetchLedger);
      return () => {
        socket.off('payment_received', fetchLedger);
        socket.off('new_invoice', fetchLedger);
      };
    }
  }, [socket, fetchLedger]);

  const handleUpdate = async (id: number) => {
    try {
      await api.patch(`system/ledger/${id}`, {
        amount: Number(editAmount),
        description: editDesc
      });
      toast.success('Record updated');
      setEditingTxId(null);
      fetchLedger();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to rewrite record');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      await api.delete(`system/ledger/${id}`);
      toast.success('Record deleted');
      fetchLedger();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete record');
    }
  };

  const filtered = transactions.filter(t => 
    (t.staffName || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.memberName || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.memberId || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportHeaders = useMemo(() => ['Staff', 'Member', 'Amount', 'Type', 'Description', 'Timestamp'], []);
  const exportRows = useMemo(() => filtered.map(t => [
    t.staffName,
    t.memberName,
    String(t.amount),
    t.type,
    t.description,
    new Date(t.timestamp).toLocaleString(),
  ]), [filtered]);

  return (
    <div className="p-8 md:p-12 space-y-10 max-w-7xl mx-auto">
      <header className="flex justify-between items-end border-b border-navy/5 pb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-navy italic flex items-center gap-4">
             <BookOpen className="text-gold" size={36} /> Money Records
          </h1>
          <p className="text-slate font-bold uppercase tracking-[0.3em] text-[10px] opacity-60 mt-2">
            All Money Transactions
          </p>
        </div>
      </header>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-gold/20 outline-none transition-all shadow-sm font-bold text-navy"
            />
          </div>
          <ExportButton filename="ledger" headers={exportHeaders} rows={exportRows} />
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest">Staff</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest">Member</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest">Type</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest text-right">Value (₹)</th>
                {canManageLedger && <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={canManageLedger ? 6 : 5} className="px-8 py-20 text-center">
                      <Activity className="animate-pulse text-gold mx-auto mb-4" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-navy/40">Loading records...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManageLedger ? 6 : 5} className="px-8 py-20 text-center">
                    <p className="text-sm font-medium text-slate/40 italic">No records found.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gold/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2 text-xs font-bold text-slate">
                          <Clock size={12} className="text-slate/30" />
                          {format(new Date(t.timestamp), 'MMM dd, HH:mm:ss')}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-navy/5 flex items-center justify-center text-navy font-bold text-[10px]">
                            {(t.staffName || '?').charAt(0)}
                         </div>
                         <div>
                            <p className="font-bold text-navy text-sm">{t.staffName || 'System'}</p>
                            <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">ID: STAFF-{t.staffId}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold font-bold text-[10px]">
                            <User size={14} />
                         </div>
                         <div>
                            <p className="font-bold text-navy text-sm">{t.memberName || 'Guest'}</p>
                            <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">{t.memberId || 'N/A'}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[9px] font-black text-navy px-3 py-1 bg-navy/5 rounded-full uppercase tracking-widest">
                        {t.type.replace('_', ' ')}
                      </span>
                      {editingTxId === t.id ? (
                        <input 
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full mt-2 p-1 text-[10px] border rounded outline-none"
                        />
                      ) : (
                        <p className="text-[10px] text-slate/40 mt-1 line-clamp-1">{t.description}</p>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex flex-col items-end">
                          {editingTxId === t.id ? (
                            <input 
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-24 p-1 text-sm border rounded outline-none font-bold text-navy"
                            />
                          ) : (
                            <p className="font-serif font-bold text-lg text-navy">₹ {t.amount.toLocaleString()}</p>
                          )}
                          <div className="flex items-center gap-1 text-[8px] font-black text-green-600 uppercase tracking-widest">
                             <CreditCard size={10} /> Verified
                          </div>
                       </div>
                    </td>
                    {canManageLedger && (
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingTxId === t.id ? (
                            <>
                              <button onClick={() => handleUpdate(t.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-xl" title="Save"><Save size={16} /></button>
                              <button onClick={() => setEditingTxId(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl" title="Cancel"><X size={16} /></button>
                            </>
                          ) : (
                            <>
                              {canUpdateLedger && (
                                <button 
                                  onClick={() => {
                                    setEditingTxId(t.id);
                                    setEditAmount(t.amount.toString());
                                    setEditDesc(t.description);
                                  }} 
                                  className="p-2 text-blue-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                                  title="Edit Record"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              {canDeleteLedger && (
                                <button 
                                  onClick={() => handleDelete(t.id)} 
                                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
