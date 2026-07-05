'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { CheckCircle2, XCircle, Clock, Eye, Loader2, IndianRupee, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ExportButton from '@/components/ui/ExportButton';

interface AMCPaymentRequest {
  id: number;
  memberId: number;
  amount: number;
  transactionRef: string;
  paymentDate: string;
  proofUrl: string;
  status: string;
  createdAt: string;
  member: {
    nameAsAadhaar: string;
    membershipNumber: string;
    mobileNumber: string;
  };
}

export default function AMCApprovalsPage() {
  const [requests, setRequests] = useState<AMCPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AMCPaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectionModal] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await api.get('amc/pending');
      setRequests(response.data);
    } catch {
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleProcess = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      await api.patch(`amc/${id}/process`, {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined
      });
      toast.success(`Request ${status === 'APPROVED' ? 'Verified' : 'Rejected'}`);
      setShowRejectionModal(false);
      setRejectionReason('');
      fetchRequests();
    } catch {
      toast.error('Failed to process request');
    } finally {
      setProcessingId(null);
    }
  };

  const getProofUrl = (id: number) => {
    return `${process.env.NEXT_PUBLIC_API_URL}/amc/proof/${id}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AMC Approvals</h1>
          <p className="text-gray-500">Check and approve AMC payments</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            filename="amc-approvals"
            headers={['Member', 'Amount', 'Transaction Ref', 'Status', 'Created']}
            rows={requests.map(r => [
              r.member.nameAsAadhaar,
              String(r.amount),
              r.transactionRef || '',
              r.status,
              format(new Date(r.createdAt), 'MMM dd, yyyy')
            ])}
          />
          <div className="bg-navy text-gold px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">
             Verification Active
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={48} /></div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-[3rem] py-32 border border-dashed border-gray-200 text-center flex flex-col items-center gap-6">
           <div className="p-6 bg-gray-50 rounded-full text-gray-200"><ShieldCheck size={64} /></div>
           <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No pending payments found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
           {requests.map((req) => (
             <div key={req.id} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 flex flex-col lg:flex-row justify-between items-center group hover:border-gold/30 transition-all duration-500">
                <div className="flex items-center gap-8">
                   <div className="w-16 h-16 rounded-2xl bg-navy/5 flex items-center justify-center text-navy shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <IndianRupee size={28} />
                   </div>
                   <div className="space-y-2">
                      <div className="flex items-center gap-3">
                         <h3 className="text-xl font-serif font-bold text-navy">{req.member.nameAsAadhaar}</h3>
                         <span className="font-mono text-[10px] bg-navy/5 px-2 py-0.5 rounded text-navy/40 uppercase tracking-widest">{req.member.membershipNumber}</span>
                      </div>
                      <div className="flex items-center gap-6 text-[10px] font-black text-slate/40 uppercase tracking-widest">
                         <span className="flex items-center gap-1.5"><Calendar size={12} className="text-gold" /> Paid: {format(new Date(req.paymentDate), 'MMM dd, yyyy')}</span>
                         <span className="flex items-center gap-1.5"><Clock size={12} className="text-gold" /> Submitted: {format(new Date(req.createdAt), 'MMM dd, HH:mm')}</span>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col items-end gap-4 mt-6 lg:mt-0 w-full lg:w-auto">
                   <div className="text-right">
                      <p className="text-3xl font-black text-navy tracking-tighter">₹ {req.amount.toLocaleString()}</p>
                      {req.transactionRef && (
                        <p className="text-[9px] font-bold text-slate/30 uppercase tracking-widest mt-1">Ref: {req.transactionRef}</p>
                      )}
                   </div>
                   <div className="flex items-center gap-3">
                      {req.proofUrl && (
                        <>
                          <button 
                            onClick={() => window.open(getProofUrl(req.id), '_blank')}
                            className="p-3 bg-gray-50 text-navy rounded-xl hover:bg-navy hover:text-white transition-all shadow-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                          >
                            <Eye size={16} /> View Proof
                          </button>
                          <div className="h-8 w-px bg-gray-100"></div>
                        </>
                      )}
                      <button 
                        disabled={processingId === req.id}
                        onClick={() => handleProcess(req.id, 'APPROVED')}
                        className="px-6 py-2.5 bg-green-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                      >
                         {processingId === req.id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} Approve
                      </button>
                      <button 
                        disabled={processingId === req.id}
                        onClick={() => { setSelectedRequest(req); setShowRejectionModal(true); }}
                        className="px-6 py-2.5 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                      >
                         <XCircle size={14} /> Reject
                      </button>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={() => setShowRejectionModal(false)}></div>
           <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 text-center space-y-6">
                 <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto text-red-500">
                    <AlertTriangle size={40} />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-serif font-bold text-navy text-balance tracking-tight italic">Reason for Rejection</h3>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed">Tell the member why the payment was rejected.</p>
                 </div>
                 <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="E.g., Transaction reference not found in bank logs..."
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-red-400 transition-all text-sm font-medium text-navy resize-none"
                    rows={4}
                 />
                 <div className="flex gap-4">
                    <button 
                      onClick={() => setShowRejectionModal(false)}
                      className="flex-1 py-4 bg-gray-100 text-slate rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                      disabled={!rejectionReason.trim() || processingId !== null}
                      onClick={() => selectedRequest && handleProcess(selectedRequest.id, 'REJECTED')}
                      className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50"
                    >
                       Confirm Rejection
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
