'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { CreditCard, Download, Receipt, Clock, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import AMCPaymentModal from '@/components/billing/AMCPaymentModal';
import SettlePaymentModal from '@/components/billing/SettlePaymentModal';

interface Invoice {
  id: number;
  invoiceNumber: string;
  department: string;
  total: number;
  status: string;
  cancellationStatus?: string | null;
  createdAt: string;
  dueDate: string;
  items: any[];
}

export default function MemberBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAMCInvoice, setSelectedAMCInvoice] = useState<Invoice | null>(null);
  const [selectedSettleInvoice, setSelectedSettleInvoice] = useState<Invoice | null>(null);
  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [unenrollReason, setUnenrollReason] = useState('');
  const [isSubmittingUnenroll, setIsSubmittingUnenroll] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.get('billing/my-invoices');
      setInvoices(response.data);
    } catch {
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRequestCancellation = async (id: number) => {
    if (!confirm('Are you sure you want to request cancellation for this invoice? Staff will review your request.')) return;
    try {
      await api.post(`billing/invoice/${id}/request-cancellation`);
      toast.success('Cancellation request sent');
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Request failed');
    }
  };

  const submitUnenrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUnenroll(true);
    try {
      await api.post('members/me/unenroll', { reason: unenrollReason });
      toast.success('Cancellation request submitted successfully.');
      setShowUnenrollModal(false);
      setUnenrollReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit unenrollment request.');
    } finally {
      setIsSubmittingUnenroll(false);
    }
  };

  const handleOpenSettle = (invoice: Invoice) => {
    setSelectedSettleInvoice(invoice);
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <ProtectedRoute allowedRoles={['MEMBER']}>
      <div className="max-w-6xl mx-auto px-6 pb-32 space-y-12">
        <div className="space-y-4 px-4 flex flex-col md:flex-row justify-between items-start md:items-center">
           <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gold/30 text-[9px] font-black uppercase tracking-[0.4em] text-gold mb-2 shadow-sm">
                <CreditCard size={12} />
                Billing
              </div>
              <h1 className="text-5xl font-serif font-bold text-navy tracking-tight">My Bills</h1>
              <p className="text-slate/40 text-xs font-black uppercase tracking-[0.2em]">Invoices & Payments</p>
           </div>
           
           <button 
             onClick={() => setShowUnenrollModal(true)}
             className="mt-4 md:mt-0 px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
           >
              Cancel Membership
            </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
          ) : invoices.length === 0 ? (
            <div className="bg-white rounded-[3.5rem] py-32 border border-slate/5 text-center shadow-xl shadow-navy/5 flex flex-col items-center gap-8">
              <div className="p-8 bg-gold/5 rounded-full border border-gold/10 text-gold/20">
                 <Receipt size={80} />
              </div>
              <p className="text-slate/40 font-bold uppercase tracking-widest text-[10px]">No bills found.</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-[3rem] p-10 border border-slate/5 shadow-2xl shadow-navy/5 flex flex-col lg:flex-row justify-between items-center group hover:border-gold/30 transition-all duration-500">
                <div className="flex items-center gap-10">
                  <div className={`w-20 h-20 rounded-[1.8rem] flex items-center justify-center shadow-inner transition-all duration-500 group-hover:scale-110 ${invoice.status === 'PAID' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {invoice.status === 'PAID' ? <CheckCircle size={36} /> : <AlertCircle size={36} />}
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-gold uppercase tracking-[0.4em] block">{invoice.department}</span>
                    <h3 className="text-2xl font-serif font-bold text-navy leading-none group-hover:text-gold transition-colors duration-500">{invoice.invoiceNumber}</h3>
                    <div className="flex items-center gap-5 text-slate/40 font-bold text-[10px] uppercase tracking-widest pt-1">
                       <span className="flex items-center gap-2 bg-slate/5 px-3 py-1 rounded-lg"><Clock size={12} className="text-gold" /> Issued: {new Date(invoice.createdAt).toLocaleDateString()}</span>
                       <span className="flex items-center gap-2 bg-slate/5 px-3 py-1 rounded-lg"><Receipt size={12} className="text-gold" /> {invoice.items.length} Items</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-5 mt-8 lg:mt-0 w-full lg:w-auto pt-8 lg:pt-0 border-t lg:border-t-0 border-slate/5">
                  <p className="text-4xl font-black text-navy tracking-tighter">₹ {Number(invoice.total).toLocaleString()}</p>
                  
                  {invoice.cancellationStatus === 'PENDING' && (
                    <div className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                       <Clock size={12} className="animate-pulse" /> Cancellation Pending Review
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                     {invoice.status === 'UNPAID' && !invoice.cancellationStatus && (
                       <>
                         <button 
                           onClick={() => handleRequestCancellation(invoice.id)}
                           className="text-[9px] font-black text-slate/40 uppercase tracking-widest hover:text-red-500 transition-colors"
                         >
                            Request Cancellation
                         </button>
                         <div className="w-px h-8 bg-slate/10"></div>
                         {invoice.department === 'AMC' ? (
                          <button 
                            onClick={() => setSelectedAMCInvoice(invoice)}
                            className="px-6 py-2.5 bg-navy text-gold rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-2"
                          >
                            <Upload size={14} /> Upload Proof
                          </button>
                          ) : (
                           <button 
                             onClick={() => handleOpenSettle(invoice)}
                             className="px-6 py-2.5 bg-gold text-navy rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-gold transition-all shadow-xl flex items-center gap-2"
                           >
                             Settle Dues
                           </button>
                          )}
                       </>
                     )}
                     <span className={`inline-flex items-center px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border shadow-xl transition-all duration-500 ${
                       invoice.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200 group-hover:bg-green-100' : 
                       invoice.status === 'PENDING_APPROVAL' || invoice.cancellationStatus === 'PENDING' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                       invoice.status === 'CANCELLED' ? 'bg-gray-50 text-gray-400 border-gray-200' :
                       'bg-red-50 text-red-700 border-red-200 group-hover:bg-red-100'
                     }`}>
                       {invoice.status.replace('_', ' ')}
                     </span>
                     <button className="p-3 bg-navy text-gold rounded-xl hover:bg-navy/90 transition-all shadow-lg">
                        <Download size={18} />
                     </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedAMCInvoice && (
        <AMCPaymentModal 
          invoice={selectedAMCInvoice} 
          onClose={() => setSelectedAMCInvoice(null)} 
          onSuccess={fetchInvoices} 
        />
      )}

      {selectedSettleInvoice && (
        <SettlePaymentModal
          invoice={selectedSettleInvoice}
          onClose={() => setSelectedSettleInvoice(null)}
          onSuccess={fetchInvoices}
        />
      )}

      {showUnenrollModal && (
        <div className="fixed inset-0 bg-navy/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-red-600"></div>
            <h2 className="text-2xl font-serif font-bold text-navy mb-2">Cancel Membership</h2>
            <p className="text-xs text-slate/50 font-medium mb-6">
              Please tell us why you want to cancel. This request will be reviewed by the administration.
            </p>
            
            <form onSubmit={submitUnenrollment} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy uppercase tracking-widest block ml-1">Cancellation Reason</label>
                <textarea 
                  required
                  value={unenrollReason}
                  onChange={(e) => setUnenrollReason(e.target.value)}
                  rows={4}
                  className="w-full bg-slate/5 border border-slate/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none"
                  placeholder="Enter your detailed reason here..."
                ></textarea>
              </div>
              
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowUnenrollModal(false)}
                  className="flex-1 py-3 px-4 bg-slate/10 text-navy font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate/20 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingUnenroll || !unenrollReason.trim()}
                  className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isSubmittingUnenroll ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
