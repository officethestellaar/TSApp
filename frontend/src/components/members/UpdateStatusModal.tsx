'use client';

import React, { useState } from 'react';
import { X, Shield, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Member } from '@/types';

interface UpdateStatusModalProps {
  member: Member;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: 'APPROVED', label: 'Approved (Active Account)', desc: 'Member has full system authorization' },
  { value: 'ACTIVE', label: 'Active', desc: 'Membership active and functional' },
  { value: 'PENDING', label: 'Pending Approval', desc: 'Awaiting registration review' },
  { value: 'SUSPENDED', label: 'Suspended', desc: 'Temporarily lock access and benefits' },
  { value: 'EXPIRED', label: 'Expired', desc: 'Membership tenure ended' },
  { value: 'INACTIVE', label: 'Inactive', desc: 'Deactivated account' },
  { value: 'TERMINATED', label: 'Terminated', desc: 'Permanently ended membership' },
  { value: 'REJECTED', label: 'Rejected', desc: 'Registration rejected' },
];

export default function UpdateStatusModal({ member, onClose, onSuccess }: UpdateStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(member.status);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`members/${member.id}/status`, { status: selectedStatus });
      toast.success(`Membership status updated to ${selectedStatus}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update status error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-md bg-navy/40 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl border border-navy/10">
        <div className="p-8 border-b border-navy/5 bg-navy/[0.02] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-navy/5 text-navy flex items-center justify-center font-bold">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-navy italic">Change Membership Status</h2>
              <p className="text-[10px] font-black text-slate/50 uppercase tracking-widest mt-0.5">Superadmin Override</p>
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
          <div className="bg-navy/[0.03] p-5 rounded-2xl border border-navy/5 flex justify-between items-center">
            <div>
              <p className="text-base font-bold text-navy">{member.nameAsAadhaar}</p>
              <p className="text-xs font-mono text-slate/60 mt-0.5">{member.membershipNumber}</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-navy/10 text-navy text-[10px] font-black uppercase tracking-widest rounded-full">
                Current: {member.status}
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            <label className="text-[10px] font-black text-slate uppercase tracking-widest block mb-2">
              Select New Status
            </label>
            {STATUS_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedStatus === opt.value
                    ? 'border-gold bg-gold/5 shadow-sm'
                    : 'border-navy/5 bg-white hover:border-navy/20'
                }`}
              >
                <div>
                  <p className="font-bold text-sm text-navy">{opt.label}</p>
                  <p className="text-xs text-slate/60 mt-0.5">{opt.desc}</p>
                </div>
                {selectedStatus === opt.value && (
                  <CheckCircle2 size={20} className="text-gold" />
                )}
              </div>
            ))}
          </div>

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
              disabled={loading || selectedStatus === member.status}
              className="flex-[2] py-4 bg-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gold hover:text-navy transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Update Membership Status'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
