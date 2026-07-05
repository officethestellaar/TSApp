'use client';

import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface RequestFamilyMemberModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestFamilyMemberModal({ onClose, onSuccess }: RequestFamilyMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    relation: 'SPOUSE',
    dob: '',
    gender: 'FEMALE',
    email: '',
    mobileNumber: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.dob || !formData.relation || !formData.gender || !formData.email) {
        toast.error('Please fill all required fields including email.');
        return;
    }

    setLoading(true);
    try {
      await api.post('members/me/family-request', formData);
      toast.success('Request sent.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-md bg-navy/20">
      <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl border border-white/20">
        <div className="p-10 border-b border-slate/5 bg-slate/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-serif font-bold text-navy italic">Request Family Member</h2>
            <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest mt-1 text-left">Add a family member for admin review</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-full transition-all text-slate/40"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-12 space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate uppercase tracking-widest">Full Name *</label>
              <input 
                name="name"
                required
                className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none" 
                placeholder="Name" 
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-widest">Relation *</label>
                    <select 
                        name="relation"
                        required
                        className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none"
                        value={formData.relation}
                        onChange={handleInputChange}
                    >
                        <option value="SPOUSE">Spouse</option>
                        <option value="CHILD">Child</option>
                        <option value="PARENT">Parent</option>
                        <option value="SIBLING">Sibling</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate uppercase tracking-widest">Gender *</label>
                    <select 
                        name="gender"
                        required
                        className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none"
                        value={formData.gender}
                        onChange={handleInputChange}
                    >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate uppercase tracking-widest">Date of Birth *</label>
              <input 
                type="date"
                name="dob"
                required
                className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none" 
                value={formData.dob}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate uppercase tracking-widest">Email * (For Login)</label>
              <input 
                type="email"
                name="email"
                required
                className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none" 
                placeholder="email@example.com" 
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate uppercase tracking-widest">Mobile Number (Optional)</label>
              <input 
                name="mobileNumber"
                className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none" 
                placeholder="Mobile Number" 
                value={formData.mobileNumber}
                onChange={handleInputChange}
                maxLength={10}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 gold-gradient text-navy font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-xl shadow-gold/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
             {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-navy"></div> : <><FileText size={18} /> Submit Request</>}
          </button>
        </form>
      </div>
    </div>
  );
}
