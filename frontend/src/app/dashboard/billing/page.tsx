'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Search, Plus, CreditCard, CheckCircle, Clock, Download, ShieldCheck, XCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Invoice } from '@/types';
import { useSocket } from '@/context/SocketContext';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';
import ExportButton from '@/components/ui/ExportButton';

export default function BillingDashboard() {
  const canCreate = usePermission('billing', 'create');
  const canUpdate = usePermission('billing', 'update');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tab, setTab] = useState<'ledger' | 'pending'>('ledger');
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const { socket } = useSocket();

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.get('billing/invoices', {
        params: {
          search,
          status: statusFilter === 'ALL' ? undefined : statusFilter
        }
      });
      setInvoices(response.data);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      const response = await api.get('billing/payments/pending');
      setPendingApprovals(response.data);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
    }
  }, []);

  useEffect(() => {
    if (tab === 'ledger') fetchInvoices();
    else fetchPendingApprovals();
  }, [tab, fetchInvoices, fetchPendingApprovals]);

  const handleRecordPayment = async (invoiceId: number, amount: number) => {
    const modes = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'];
    const modeInput = prompt('Enter Payment Mode:\n1: CASH\n2: UPI\n3: CARD\n4: BANK_TRANSFER', '1');
    if (!modeInput) return;
    
    const selectedMode = modes[Number(modeInput) - 1];
    if (!selectedMode) return alert('Invalid Payment Mode');

    let transactionId = null;
    if (selectedMode !== 'CASH') {
      transactionId = prompt(`Enter Transaction/Check ID for ${selectedMode}`);
      if (!transactionId) return alert('Transaction ID is required for digital payments');
    }

    const payAmountInput = prompt(`Enter Amount Received (Invoice Total: ₹${amount})`, amount.toString());
    if (!payAmountInput) return;
    const payAmount = Number(payAmountInput);

    if (!confirm(`Confirm receipt of ₹${payAmount} via ${selectedMode}? This will update the member's balance.`)) return;

    try {
      await api.post('billing/payment', {
        invoiceId,
        amount: payAmount,
        paymentMode: selectedMode,
        referenceNumber: 'OFFLINE_ADMIN',
        transactionId
      });
      toast.success('Payment Recorded');
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleApprove = async (paymentId: number) => {
    setApprovingId(paymentId);
    try {
      await api.post(`billing/payment/${paymentId}/approve`);
      toast.success('Payment approved');
      fetchPendingApprovals();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (paymentId: number) => {
    if (!confirm('Reject this payment? The bill will go back to unpaid.')) return;
    setApprovingId(paymentId);
    try {
      await api.post(`billing/payment/${paymentId}/reject`);
      toast.success('Payment rejected');
      fetchPendingApprovals();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setApprovingId(null);
    }
  };

  const exportHeaders = useMemo(() => ['Invoice No', 'Member', 'Department', 'Amount', 'Discount', 'GST', 'Total', 'Status', 'Date'], []);
  const exportRows = useMemo(() => invoices.map(inv => [
    inv.invoiceNumber,
    inv.member?.nameAsAadhaar ?? inv.walkInGuest?.name ?? 'Unknown',
    inv.department,
    String(inv.amount),
    String(inv.discount),
    String(inv.gst),
    String(inv.total),
    inv.status,
    new Date(inv.createdAt).toLocaleDateString(),
  ]), [invoices]);

  // Real-time listener
  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        if (tab === 'ledger') fetchInvoices();
        else fetchPendingApprovals();
      };
      
      socket.on('new_invoice', handleUpdate);
      socket.on('payment_received', handleUpdate);
      socket.on('audit_sync', handleUpdate);

      return () => {
        socket.off('new_invoice', handleUpdate);
        socket.off('payment_received', handleUpdate);
        socket.off('audit_sync', handleUpdate);
      };
    }
  }, [socket, fetchInvoices, fetchPendingApprovals, tab]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-serif font-bold text-navy mb-2 tracking-tight">Billing</h1>
            <p className="text-slate font-medium">Oversee membership dues, departmental revenue, and club accounts</p>
          </div>
          {canCreate && (
            <Link
              href="/dashboard/billing/new"
              className="flex items-center gap-2 gold-gradient hover:shadow-xl hover:shadow-gold/20 text-navy px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:-translate-y-1"
            >
              <Plus size={20} />
              Create Invoice
            </Link>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-navy/5 border border-slate/5">
            <h3 className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-4">Total Outstanding</h3>
            <p className="text-4xl font-serif font-bold text-red-500">₹ {invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + Number(i.total), 0).toLocaleString()}</p>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate font-medium">
              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{invoices.filter(i => i.status !== 'PAID').length} Pending</span>
              <span>Requires attention</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-navy/5 border border-slate/5">
            <h3 className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-4">Collected (MTD)</h3>
            <p className="text-4xl font-serif font-bold text-green-600">₹ {invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + Number(i.total), 0).toLocaleString()}</p>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate font-medium">
              <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full">LIVE</span>
              <span>Total Revenue</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-navy/5 border border-slate/5">
            <h3 className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-4">Department</h3>
            <p className="text-4xl font-serif font-bold text-gold">POS</p>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate font-medium">
              <span className="bg-gold/10 text-gold px-2 py-0.5 rounded-full">ACTIVE</span>
              <span>Revenue Sync</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab('ledger')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === 'ledger' ? 'bg-navy text-gold shadow-xl' : 'bg-white text-navy border border-slate/10 hover:border-gold/30'
            }`}
          >
            Bills
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              tab === 'pending' ? 'bg-navy text-gold shadow-xl' : 'bg-white text-navy border border-slate/10 hover:border-gold/30'
            }`}
          >
            <ShieldCheck size={14} />
            Pending Approvals
            {pendingApprovals.length > 0 && (
              <span className="bg-red-500 text-white text-[8px] px-2 py-0.5 rounded-full">{pendingApprovals.length}</span>
            )}
          </button>
        </div>

        {tab === 'pending' ? (
          <div className="bg-white rounded-3xl shadow-2xl shadow-navy/5 border border-slate/5 overflow-hidden">
            <div className="p-8 border-b border-slate/5 bg-navy/[0.02]">
              <h3 className="text-lg font-serif font-bold text-navy flex items-center gap-3">
                <ShieldCheck size={20} className="text-gold" />
                Payment Approvals
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-navy/5 border-b border-slate/10">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Invoice</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Member</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Amount</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Proof</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate/5">
                  {pendingApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate font-medium">No pending approvals.</td>
                    </tr>
                  ) : (
                    pendingApprovals.map((inv: any) => {
                      const payment = inv.payments?.[0];
                      return (
                        <tr key={inv.id} className="hover:bg-gold/5 transition-all">
                          <td className="px-8 py-5 font-mono text-xs font-bold text-navy/70">{inv.invoiceNumber}</td>
                          <td className="px-8 py-5 font-bold text-navy">{inv.member?.nameAsAadhaar}</td>
                          <td className="px-8 py-5 font-serif font-bold text-navy">₹ {inv.total}</td>
                          <td className="px-8 py-5">
                            {payment?.proofUrl ? (
                              <a href={`/${payment.proofUrl}`} target="_blank" className="inline-flex items-center gap-2 text-gold text-[10px] font-black uppercase tracking-widest hover:underline">
                                <ImageIcon size={14} /> View Screenshot
                              </a>
                            ) : payment?.transactionId ? (
                              <span className="text-[10px] font-bold text-navy/60">TxID: {payment.transactionId}</span>
                            ) : payment?.referenceNumber ? (
                              <span className="text-[10px] font-bold text-navy/60">Cheque: {payment.referenceNumber}</span>
                            ) : (
                              <span className="text-[10px] text-slate/40">N/A</span>
                            )}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex gap-2">
                              {canUpdate && (
                                <>
                                  <button
                                    onClick={() => handleApprove(payment?.id)}
                                    disabled={approvingId === payment?.id}
                                    className="px-4 py-1.5 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {approvingId === payment?.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(payment?.id)}
                                    disabled={approvingId === payment?.id}
                                    className="px-4 py-1.5 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <XCircle size={12} />
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl shadow-navy/5 border border-slate/5 overflow-hidden">
            <div className="p-8 border-b border-slate/5 flex justify-between items-center bg-navy/[0.02]">
              <h3 className="text-lg font-serif font-bold text-navy">Recent Bills</h3>
              <div className="flex gap-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    className="pl-11 pr-4 py-2 bg-white border border-slate/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold transition-all"
                    placeholder="Invoice #, Member..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate/10 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="ALL">All Bills</option>
                  <option value="PAID">Paid</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                </select>
                <ExportButton filename="billing-invoices" headers={exportHeaders} rows={exportRows} />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-navy/5 border-b border-slate/10">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Invoice Details</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Member</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Department</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Amount</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate uppercase tracking-[0.2em] text-right">Console</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold mx-auto"></div>
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="mb-4 flex justify-center text-gold/30">
                          <CreditCard size={48} />
                        </div>
                        <p className="text-slate font-medium">No bills found.</p>
                      </td>
                    </tr>
                  ) : (
                    invoices.filter(i => 
                      i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
                      i.member?.nameAsAadhaar.toLowerCase().includes(search.toLowerCase())
                    ).map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gold/5 transition-all duration-300">
                        <td className="px-8 py-5 font-mono text-xs font-bold text-navy/70">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-navy">{invoice.member?.nameAsAadhaar || invoice.walkInGuest?.name || 'Unknown'}</div>
                          <div className="text-[10px] text-slate font-bold">{invoice.member?.membershipNumber || (invoice.walkInGuest ? 'No Membership' : '')}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-slate uppercase tracking-wider">{invoice.department}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-serif font-bold text-navy">₹ {invoice.total}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            invoice.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-100' : 
                            invoice.status === 'PENDING_APPROVAL' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {invoice.status === 'PAID' ? <CheckCircle size={10} className="mr-1.5" /> : 
                             invoice.status === 'PENDING_APPROVAL' ? <Clock size={10} className="mr-1.5" /> :
                             <Clock size={10} className="mr-1.5" />}
                            {invoice.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-3">
                             {invoice.status === 'UNPAID' && (
                               <button 
                                 onClick={() => handleRecordPayment(invoice.id, Number(invoice.total))}
                                 className="px-4 py-1.5 bg-navy text-gold rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all"
                               >
                                 Record Settle
                               </button>
                             )}
                             <button className="text-slate/40 hover:text-navy transition-colors p-2 hover:bg-navy/5 rounded-lg">
                               <Download size={18} />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
