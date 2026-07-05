'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, Hash, Banknote, Image, IndianRupee } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface SettleModalProps {
  invoice: {
    id: number;
    invoiceNumber: string;
    total: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

type ProofType = 'transactionId' | 'cheque' | 'screenshot';

export default function SettlePaymentModal({ invoice, onClose, onSuccess }: SettleModalProps) {
  const [loading, setLoading] = useState(false);
  const [proofType, setProofType] = useState<ProofType>('transactionId');
  const [transactionId, setTransactionId] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const canSubmit = proofType === 'transactionId' ? transactionId.trim()
    : proofType === 'cheque' ? chequeNo.trim()
    : file !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    const data = new FormData();
    data.append('invoiceId', String(invoice.id));
    data.append('amount', String(invoice.total));

    if (proofType === 'transactionId') {
      data.append('transactionId', transactionId);
      data.append('paymentMode', 'ONLINE');
    } else if (proofType === 'cheque') {
      data.append('referenceNumber', chequeNo);
      data.append('paymentMode', 'CHEQUE');
    } else if (file) {
      data.append('proof', file);
      data.append('paymentMode', 'ONLINE');
    }

    try {
      await api.post('billing/payment', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Payment settled successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold shadow-inner">
              <IndianRupee size={24} />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-navy">Settle Dues</h3>
              <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">Payment Verification Node</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-navy/5 rounded-full transition-colors text-slate/40">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="bg-navy/5 p-6 rounded-2xl border border-navy/5">
            <p className="text-[10px] font-black text-navy/40 uppercase tracking-widest mb-1">Invoice</p>
            <p className="text-sm font-bold text-navy">{invoice.invoiceNumber} • ₹ {invoice.total.toLocaleString()}</p>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-navy uppercase tracking-widest block px-1">Proof Method</label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'transactionId', icon: Hash, label: 'Transaction ID' },
                { key: 'cheque', icon: Banknote, label: 'Cheque No.' },
                { key: 'screenshot', icon: Image, label: 'Screenshot' },
              ] as const).map(({ key, icon: Icon, label }) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => { setProofType(key); setFile(null); }}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${
                    proofType === key
                      ? 'border-gold bg-gold/5 text-navy'
                      : 'border-slate/10 bg-white text-slate/40 hover:border-slate/30'
                  }`}
                >
                  <Icon size={20} className="mx-auto mb-1" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {proofType === 'transactionId' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Transaction / UTR ID</label>
              <input
                required
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                placeholder="Enter UPI ref / bank transaction ID"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none font-bold"
              />
            </div>
          )}

          {proofType === 'cheque' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Cheque Number</label>
              <input
                required
                value={chequeNo}
                onChange={e => setChequeNo(e.target.value)}
                placeholder="Enter cheque number"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none font-bold"
              />
            </div>
          )}

          {proofType === 'screenshot' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Upload Payment Screenshot</label>
              <div className="bg-navy/5 p-8 rounded-3xl border-2 border-dashed border-gold/20 text-center hover:border-gold transition-all relative group">
                <input
                  required
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload size={28} className="mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
                <p className="text-sm font-bold text-navy">{file ? file.name : 'Click to upload screenshot'}</p>
                <p className="text-[10px] text-slate/40 font-black uppercase tracking-widest mt-2">PNG, JPG only • Max 5MB</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full py-5 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><IndianRupee size={18} /> Settle Dues</>}
          </button>
        </form>
      </div>
    </div>
  );
}
