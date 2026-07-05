'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Inbox, CheckCircle, XCircle, User, Utensils, UserMinus, AlertTriangle, Image as ImageIcon, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffRequestsPage() {
  const [familyRequests, setFamilyRequests] = useState<any[]>([]);
  const [unenrollRequests, setUnenrollRequests] = useState<any[]>([]);
  const [tableRequests, setTableRequests] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [famRes, tableRes, payRes] = await Promise.all([
        api.get('members/family-requests/pending'),
        api.get('restaurant/table-reservations/pending'),
        api.get('billing/payments/pending')
      ]);
      setFamilyRequests(famRes.data);
      setTableRequests(tableRes.data);
      setPendingPayments(payRes.data);
      
      const unenRes = await api.get('members/unenroll-requests/pending');
      setUnenrollRequests(unenRes.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to access the Requests Center. Please contact an administrator.');
      } else {
        console.error('Failed to load requests center data', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProcessFamily = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`members/family-requests/${id}/process`, { status });
      toast.success(`Family request ${status.toLowerCase()}`);
      fetchData();
    } catch {
      toast.error('Failed to process family request');
    }
  };

  const handleProcessTable = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`restaurant/table-reservation/${id}/process`, { status });
      toast.success(`Table request ${status.toLowerCase()}`);
      fetchData();
    } catch {
      toast.error('Failed to process table request');
    }
  };

  const handleApprove = async (paymentId: number) => {
    setApprovingId(paymentId);
    try {
      await api.post(`billing/payment/${paymentId}/approve`);
      toast.success('Payment approved');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (paymentId: number) => {
    if (!confirm('Reject this payment? The invoice will revert to unpaid.')) return;
    setApprovingId(paymentId);
    try {
      await api.post(`billing/payment/${paymentId}/reject`);
      toast.success('Payment rejected');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="p-8 space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Inbox className="text-blue-600" /> Administrative Requests Center
        </h1>
        <p className="text-gray-500 mt-2">Manage all pending member actions and enrollments</p>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="text-red-400 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500 max-w-md">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Family Enrollment Requests */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 px-2">
              <User className="text-gold" size={20} /> Family Affiliations ({familyRequests.length})
            </h2>
            <div className="space-y-4">
              {familyRequests.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-2xl border border-dashed text-center text-gray-400">No pending family requests</div>
              ) : (
                familyRequests.map((req) => (
                  <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">Request for {req.member.nameAsAadhaar}</span>
                      </div>
                      <h4 className="font-bold text-gray-900">{req.name}</h4>
                      <p className="text-xs text-gray-500">{req.relation} • {req.gender} • DOB: {new Date(req.dob).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleProcessFamily(req.id, 'APPROVED')} className="p-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl border border-green-100 transition-all"><CheckCircle size={18}/></button>
                      <button onClick={() => handleProcessFamily(req.id, 'REJECTED')} className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl border border-red-100 transition-all"><XCircle size={18}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Table Reservation Requests */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 px-2">
              <Utensils className="text-gold" size={20} /> Restaurant Tables ({tableRequests.length})
            </h2>
            <div className="space-y-4">
              {tableRequests.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-2xl border border-dashed text-center text-gray-400">No pending table requests</div>
              ) : (
                tableRequests.map((req) => (
                  <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Table for {req.member.nameAsAadhaar}</p>
                      <h4 className="font-bold text-gray-900">{new Date(req.date).toLocaleDateString()} @ {req.time}</h4>
                      <p className="text-xs text-gray-500">{req.paxCount} Guests {req.notes && `• ${req.notes}`}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleProcessTable(req.id, 'APPROVED')} className="p-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl border border-green-100 transition-all"><CheckCircle size={18}/></button>
                      <button onClick={() => handleProcessTable(req.id, 'REJECTED')} className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl border border-red-100 transition-all"><XCircle size={18}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Unenrollment Requests */}
          <section className="space-y-6 xl:col-span-2">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 px-2">
              <UserMinus className="text-red-500" size={20} /> Unenrollment Requests ({unenrollRequests.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {unenrollRequests.length === 0 ? (
                <div className="col-span-full bg-gray-50 p-8 rounded-2xl border border-dashed text-center text-gray-400">No pending unenrollment requests</div>
              ) : (
                unenrollRequests.map((req) => (
                  <div key={req.id} className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-red-600"><AlertTriangle size={80} /></div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{req.member.nameAsAadhaar}</h4>
                        <p className="text-xs text-gray-500">{req.member.membershipNumber}</p>
                      </div>
                      <div className="flex gap-2">
                         <button className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all shadow-md">Confirm Departure</button>
                         <button className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-all">Dismiss</button>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                       <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Stated Reason</p>
                       <p className="text-sm text-red-900 font-medium italic">"{req.reason}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Payment Approvals */}
          <section className="space-y-6 xl:col-span-2">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 px-2">
              <ShieldCheck className="text-orange-500" size={20} /> Awaiting pending payment approvals ({pendingPayments.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingPayments.length === 0 ? (
                <div className="col-span-full bg-gray-50 p-8 rounded-2xl border border-dashed text-center text-gray-400">No pending payment approvals</div>
              ) : (
                pendingPayments.map((inv: any) => {
                  const payment = inv.payments?.[0];
                  return (
                    <div key={inv.id} className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex justify-between items-start group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded">Payment by {inv.member?.nameAsAadhaar}</span>
                        </div>
                        <h4 className="font-bold text-gray-900">₹{inv.total}</h4>
                        <p className="text-[10px] font-mono text-gray-500">{inv.invoiceNumber}</p>
                        <div className="mt-2">
                          {payment?.proofUrl ? (
                            <a href={payment.proofUrl.startsWith('/') ? payment.proofUrl : `/${payment.proofUrl}`} target="_blank" className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:underline">
                              <ImageIcon size={12} /> View Screenshot
                            </a>
                          ) : payment?.transactionId ? (
                            <span className="text-[10px] font-bold text-gray-500">TxID: {payment.transactionId}</span>
                          ) : payment?.referenceNumber ? (
                            <span className="text-[10px] font-bold text-gray-500">Cheque: {payment.referenceNumber}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(payment?.id)}
                          disabled={approvingId === payment?.id}
                          className="p-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl border border-green-100 transition-all disabled:opacity-50"
                        >
                          {approvingId === payment?.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                        </button>
                        <button
                          onClick={() => handleReject(payment?.id)}
                          disabled={approvingId === payment?.id}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl border border-red-100 transition-all disabled:opacity-50"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
