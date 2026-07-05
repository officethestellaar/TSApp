'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { Search, FileText, Coffee, Scissors, Dumbbell, ShieldCheck, CreditCard, Activity, AlertCircle, Edit, Save, X, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import ExportButton from '@/components/ui/ExportButton';

export default function RecordsHubPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canUpdateRecord = usePermission('records', 'update');
  const canDeleteRecord = usePermission('records', 'delete');
  const canManage = isSuperAdmin || canUpdateRecord || canDeleteRecord;

  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editTotal, setEditTotal] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const fetchRecords = useCallback(async () => {
    try {
      const response = await api.get('billing/invoices');
      setInvoices(response.data);
    } catch {
      toast.error('Failed to load system records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleUpdateInvoice = async (id: number) => {
    try {
      await api.patch(`billing/invoice/${id}`, { 
        total: Number(editTotal), 
        status: editStatus 
      });
      toast.success('Invoice updated successfully');
      setEditingInvoiceId(null);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update invoice');
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      await api.delete(`billing/invoice/${id}`);
      toast.success('Invoice deleted');
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleProcessCancellation = async (id: number, action: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`billing/invoice/${id}/process-cancellation`, { action });
      toast.success(`Cancellation request ${action.toLowerCase()}`);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const filteredRecords = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
      (inv.member?.nameAsAadhaar || '').toLowerCase().includes(search.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'RESTAURANT') {
      matchesTab = inv.department === 'RESTAURANT' || inv.department === 'POS';
    } else if (activeTab === 'SALON') {
      matchesTab = inv.department === 'SALON' || inv.department === 'SPA';
    } else if (activeTab !== 'ALL') {
      matchesTab = inv.department === activeTab;
    }

    return matchesSearch && matchesTab;
  });

  const exportHeaders = useMemo(() => ['Transaction ID', 'Date', 'Entity / Member', 'Department', 'Value', 'Status'], []);
  const exportRows = useMemo(() => filteredRecords.map(r => [
    r.invoiceNumber,
    new Date(r.createdAt).toLocaleDateString(),
    r.member?.nameAsAadhaar ?? 'Walk-in Guest',
    r.department,
    String(r.total),
    r.status,
  ]), [filteredRecords]);

  const TABS = [
    { id: 'ALL', label: 'All Records', icon: FileText },
    { id: 'RESTAURANT', label: 'Restaurant & POS', icon: Coffee },
    { id: 'MEMBERSHIP', label: 'Memberships', icon: ShieldCheck },
    { id: 'AMC', label: 'AMC Dues', icon: CreditCard },
    { id: 'SALON', label: 'Salon & Spa', icon: Scissors },
    { id: 'GYM', label: 'Gymnasium', icon: Dumbbell },
    { id: 'PENALTY', label: 'Penalties', icon: AlertCircle },
  ];

  return (
    <div className="p-8 md:p-12 space-y-10 max-w-7xl mx-auto">
      <header className="flex justify-between items-end border-b border-navy/5 pb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-navy italic">Records</h1>
          <p className="text-slate font-bold uppercase tracking-[0.3em] text-[10px] opacity-60 mt-2">
            Invoices & Transactions
          </p>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-3">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isActive 
                  ? 'bg-navy text-gold shadow-xl shadow-navy/20' 
                  : 'bg-white text-slate/60 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-gold' : 'text-slate/40'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by ID or Name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-gold/20 outline-none transition-all shadow-sm font-bold text-navy"
            />
          </div>
          <ExportButton filename="records" headers={exportHeaders} rows={exportRows} />
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest">Transaction ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest">Entity / Member</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest">Department</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest text-right">Value (₹)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest">Status</th>
                {canManage && <th className="px-8 py-5 text-[10px] font-black text-slate/40 uppercase tracking-widest text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                    <td colSpan={canManage ? 7 : 6} className="px-8 py-20 text-center">
                      <Activity className="animate-pulse text-gold mx-auto mb-4" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-navy/40">Loading...</p>
                  </td>
                </tr>
                ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-8 py-20 text-center">
                    <p className="text-sm font-medium text-slate/40 italic">No records found.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-8 py-6 font-mono text-[10px] font-bold text-navy/60">{record.invoiceNumber}</td>
                    <td className="px-8 py-6 text-xs font-bold text-slate">{new Date(record.createdAt).toLocaleDateString()}</td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-navy">{record.member?.nameAsAadhaar || 'Walk-in Guest'}</p>
                      <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">{record.member?.membershipNumber || 'GUEST-001'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[9px] font-black text-navy px-3 py-1 bg-navy/5 rounded-full uppercase tracking-tighter">
                        {record.department}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right font-serif font-bold text-lg text-navy">
                      {editingInvoiceId === record.id ? (
                        <input
                          type="number"
                          value={editTotal}
                          onChange={(e) => setEditTotal(e.target.value)}
                          className="w-24 p-2 text-sm border rounded outline-none text-right"
                        />
                      ) : (
                        Number(record.total).toLocaleString()
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        {editingInvoiceId === record.id ? (
                          <select 
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="p-2 text-xs border rounded outline-none"
                          >
<option value="UNPAID">Unpaid</option>
<option value="PAID">Paid</option>
<option value="CANCELLED">Cancelled</option>
                          </select>
                        ) : (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                            record.status === 'PAID' ? 'bg-green-50 text-green-600 border-green-100' : 
                            record.status === 'CANCELLED' ? 'bg-gray-50 text-gray-400 border-gray-100' :
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {record.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                        )}
                        {record.cancellationStatus === 'PENDING' && (
                          <div className="flex items-center gap-1.5 text-[8px] font-black text-orange-500 uppercase tracking-widest mt-1.5 animate-pulse">
                             <Clock size={10} /> Cancellation Requested
                          </div>
                        )}
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingInvoiceId === record.id ? (
                            <>
                              <button onClick={() => handleUpdateInvoice(record.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-xl" title="Save"><Save size={16} /></button>
                              <button onClick={() => setEditingInvoiceId(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl" title="Cancel"><X size={16} /></button>
                            </>
                          ) : (
                            <>
                              {canUpdateRecord && record.cancellationStatus === 'PENDING' && (
                                <div className="flex gap-1 mr-2">
                                   <button onClick={() => handleProcessCancellation(record.id, 'APPROVED')} className="px-3 py-1 bg-green-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-black transition-all">Approve Cancel</button>
                                   <button onClick={() => handleProcessCancellation(record.id, 'REJECTED')} className="px-3 py-1 bg-red-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-black transition-all">Reject Cancel</button>
                                </div>
                              )}
                              {canUpdateRecord && (
                                <button 
                                  onClick={() => {
                                    setEditingInvoiceId(record.id);
                                    setEditTotal(record.total.toString());
                                    setEditStatus(record.status);
                                  }} 
                                  className="p-2 text-blue-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                                  title="Edit Bill"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              {canDeleteRecord && (
                                <button 
                                  onClick={() => handleDeleteInvoice(record.id)} 
                                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                                  title="Delete Record"
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
