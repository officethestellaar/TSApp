'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, Save, IndianRupee, Calendar, Hash } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AMCModalProps {
  invoice: {
    id: number;
    invoiceNumber: string;
    total: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function AMCPaymentModal({ invoice, onClose, onSuccess }: AMCModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    amount: invoice.total.toString(),
    transactionRef: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Please upload payment proof');

    setLoading(true);
    const data = new FormData();
    data.append('proof', file);
    data.append('amount', formData.amount);
    data.append('transactionRef', formData.transactionRef);
    data.append('paymentDate', formData.paymentDate);

    try {
      await api.post('amc/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Payment proof submitted for approval');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold shadow-inner">
                <IndianRupee size={24} />
             </div>
             <div>
                <h3 className="text-xl font-serif font-bold text-navy">Submit AMC Proof</h3>
                <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">Verify Settlement Node</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-navy/5 rounded-full transition-colors text-slate/40">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
           <div className="bg-navy/5 p-6 rounded-2xl mb-4 border border-navy/5">
              <p className="text-[10px] font-black text-navy/40 uppercase tracking-widest mb-1">Invoice Reference</p>
              <p className="text-sm font-bold text-navy">{invoice.invoiceNumber} • ₹ {invoice.total.toLocaleString()}</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Amount Paid</label>
                 <div className="relative">
                    <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" />
                    <input 
                      required
                      type="number"
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none font-bold"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Payment Date</label>
                 <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" />
                    <input 
                      required
                      type="date"
                      value={formData.paymentDate}
                      onChange={e => setFormData({...formData, paymentDate: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none font-bold"
                    />
                 </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Transaction Ref / UTR</label>
                 <div className="relative">
                    <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" />
                    <input 
                      required
                      value={formData.transactionRef}
                      onChange={e => setFormData({...formData, transactionRef: e.target.value})}
                      placeholder="Enter Bank Ref Number"
                      className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none font-bold"
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Upload Receipt (Image/PDF)</label>
              <div className="bg-navy/5 p-8 rounded-3xl border-2 border-dashed border-gold/20 text-center hover:border-gold transition-all relative group">
                 <input 
                   required
                   type="file" 
                   accept="image/*,.pdf"
                   onChange={handleFileChange}
                   className="absolute inset-0 opacity-0 cursor-pointer"
                 />
                 <Upload size={32} className="mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
                 <p className="text-sm font-bold text-navy">{file ? file.name : 'Click or Drag to Upload Proof'}</p>
                 <p className="text-[10px] text-slate/40 font-black uppercase tracking-widest mt-2">Max Size: 5MB</p>
              </div>
           </div>

           <button
             type="submit"
             disabled={loading || !file}
             className="w-full py-5 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50 mt-4"
           >
             {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Transmit for Approval</>}
           </button>
        </form>
      </div>
    </div>
  );
}
