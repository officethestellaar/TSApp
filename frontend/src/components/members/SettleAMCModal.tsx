'use client';

import React, { useState } from 'react';
import { X, IndianRupee, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Member } from '@/types';

interface SettleAMCModalProps {
  member: Member;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SettleAMCModal({ member, onClose, onSuccess }: SettleAMCModalProps) {
  const defaultAmount = Number(member.amcAmount) || 5000;
  const [targetStatus, setTargetStatus] = useState<'PAID' | 'UNPAID'>('PAID');
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const gstAmount = amount * 0.18;
  const totalAmount = amount + gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (targetStatus === 'PAID' && amount <= 0) {
      toast.error('AMC Base Amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      if (targetStatus === 'PAID') {
        const response = await api.patch(`members/${member.id}/amc-status`, {
          amcStatus: 'PAID',
          amount,
          paymentMode,
          transactionRef: notes.trim() || `SUPERADMIN_DIRECT_SETTLEMENT_${Date.now()}`
        });
        toast.success(response.data.message || 'AMC status set to PAID and bill settled!');
      } else {
        const response = await api.patch(`members/${member.id}/amc-status`, {
          amcStatus: 'UNPAID'
        });
        toast.success(response.data.message || 'AMC status set to UNPAID.');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('AMC status update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update AMC status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-md bg-navy/40 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl border border-gold/20">
        <div className="p-8 border-b border-navy/5 bg-navy/[0.02] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-navy italic">AMC Status & Billing</h2>
              <p className="text-[10px] font-black text-slate/50 uppercase tracking-widest mt-0.5">Superadmin Action</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-navy/5 rounded-full transition-all text-slate/40 hover:text-navy"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Member Card Summary */}
          <div className="bg-navy/[0.03] p-5 rounded-2xl border border-navy/5 flex justify-between items-center">
            <div>
              <p className="text-base font-bold text-navy">{member.nameAsAadhaar}</p>
              <p className="text-xs font-mono text-slate/60 mt-0.5">{member.membershipNumber}</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${
                member.amcStatus === 'PAID'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                Current: {member.amcStatus || 'UNPAID'}
              </span>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-navy/5 rounded-2xl">
            <button
              type="button"
              onClick={() => setTargetStatus('PAID')}
              className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                targetStatus === 'PAID'
                  ? 'bg-navy text-gold shadow-md'
                  : 'text-navy/60 hover:text-navy'
              }`}
            >
              Generate AMC Bill & Pay
            </button>
            <button
              type="button"
              onClick={() => setTargetStatus('UNPAID')}
              className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                targetStatus === 'UNPAID'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-navy/60 hover:text-navy'
              }`}
            >
              Set Status as Unpaid
            </button>
          </div>

          {targetStatus === 'PAID' ? (
            <div className="space-y-4">
              {/* Amount & Calculation */}
              <div>
                <label className="text-[10px] font-black text-slate uppercase tracking-widest block mb-2">
                  AMC Base Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate/40">
                    <IndianRupee size={18} />
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full pl-12 pr-4 py-3.5 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-gold/5 p-4 rounded-2xl border border-gold/20 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate/70">
                  <span>Base AMC Fee:</span>
                  <span>₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate/70">
                  <span>GST (18%):</span>
                  <span>₹ {gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pt-2 border-t border-gold/20 flex justify-between text-base font-bold text-navy">
                  <span>Total Bill Amount (Name: AMC):</span>
                  <span className="text-gold font-extrabold">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-[10px] font-black text-slate uppercase tracking-widest block mb-2">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-3.5 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / Online Transfer</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer / Cheque</option>
                  <option value="OFFLINE_VERIFIED">Offline Verified</option>
                  <option value="DIRECT_ADMIN">Superadmin Direct Authorization</option>
                </select>
              </div>

              {/* Reference / Notes */}
              <div>
                <label className="text-[10px] font-black text-slate uppercase tracking-widest block mb-2">
                  Transaction Ref / Note (Optional)
                </label>
                <input
                  type="text"
                  className="w-full p-3.5 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none"
                  placeholder="E.g., Direct Cash collected at club desk / Ref: TXN123456"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-4">
              <AlertCircle size={24} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-900 text-sm">Mark AMC as Unpaid</h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  This will mark the member&apos;s AMC status as UNPAID. You can later settle AMC by generating an official AMC bill.
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-navy/5 text-navy rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-navy/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                targetStatus === 'PAID'
                  ? 'gold-gradient text-navy hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.4)]'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-navy"></div>
              ) : targetStatus === 'PAID' ? (
                <>
                  <CheckCircle2 size={18} /> Generate AMC Bill & Pay
                </>
              ) : (
                <>
                  <RefreshCw size={18} /> Confirm Set Unpaid
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
