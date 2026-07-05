'use client';

import React, { useState } from 'react';
import { X, Upload, IndianRupee, FileText, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AMCPaymentModalProps {
  amcAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AMCPaymentModal({ amcAmount, onClose, onSuccess }: AMCPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionRef && !proofFile) {
       toast.error('Please provide a transaction ID or upload a payment photo.');
       return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('amount', amcAmount.toString());
      formData.append('transactionRef', transactionRef);
      formData.append('paymentDate', paymentDate);
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      await api.post('amc/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Payment sent for approval.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-md bg-navy/20">
      <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl border border-white/20">
        <div className="p-10 border-b border-slate/5 bg-slate/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-serif font-bold text-navy italic">AMC Payment</h2>
            <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest mt-1 text-left">Annual Maintenance Payment</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-full transition-all text-slate/40"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-12 space-y-8">
          <div className="bg-navy/[0.02] p-6 rounded-2xl border border-navy/5 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-gold/10 text-gold rounded-xl"><IndianRupee size={20} /></div>
                <div>
                   <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Amount</p>
                   <p className="text-xl font-bold text-navy">₹ {amcAmount.toLocaleString()}</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Year</p>
                <p className="text-sm font-bold text-navy uppercase">{new Date().getFullYear()}</p>
             </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate uppercase tracking-widest">Transaction ID / UPI Reference</label>
              <input 
                className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all" 
                placeholder="E.g., UPI-123456789" 
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate uppercase tracking-widest">Payment Date</label>
              <input 
                type="date"
                className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy" 
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate uppercase tracking-widest">Upload Receipt Photo (Optional if transaction ID provided)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  accept="image/*,.pdf"
                />
                <div className="border-2 border-dashed border-navy/10 rounded-[2rem] p-12 text-center group-hover:border-gold transition-colors bg-navy/[0.01]">
                  {proofFile ? (
                    <div className="flex items-center justify-center gap-4 text-green-600 font-bold text-left">
                      <FileText size={40} />
                      <div>
                         <p className="text-sm">{proofFile.name}</p>
                         <p className="text-[10px] uppercase opacity-60">Receipt Attached</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-slate/40">
                      <Upload size={48} className="mx-auto opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Click to Attach Receipt</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 gold-gradient text-navy font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-xl shadow-gold/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
             {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-navy"></div> : <><CheckCircle size={18} /> Submit for Approval</>}
          </button>
        </form>
      </div>
    </div>
  );
}
