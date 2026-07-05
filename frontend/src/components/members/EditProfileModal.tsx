'use client';

import React, { useState } from 'react';
import { X, User, Briefcase, MapPin, Heart, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Member } from '@/types';

interface EditProfileModalProps {
  member: Member;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProfileModal({ member, onClose, onSuccess }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fatherHusbandName: member.fatherHusbandName || '',
    gender: member.gender || 'MALE',
    dob: member.dob ? new Date(member.dob).toISOString().split('T')[0] : '',
    bloodGroup: member.bloodGroup || 'A+',
    occupation: member.occupation || '',
    companyName: member.companyName || '',
    designation: member.designation || '',
    residentialAddress: member.residentialAddress || '',
    city: member.city || '',
    state: member.state || '',
    pincode: member.pincode || '',
    nationality: member.nationality || 'INDIAN',
    emergencyContactName: member.emergencyContactName || '',
    emergencyContactNumber: member.emergencyContactNumber || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch('members/me/profile', formData);
      toast.success('Profile updated.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-md bg-navy/20 overflow-y-auto">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl my-8 overflow-hidden shadow-2xl border border-white/20">
        <div className="p-8 border-b border-slate/5 bg-slate/50 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-serif font-bold text-navy italic">Edit Profile</h2>
            <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest mt-1 text-left">Profile Update</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-full transition-all text-slate/40"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
          {/* Section: Personal */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black text-gold uppercase tracking-[0.5em] flex items-center gap-4">
               <User size={14} /> Personal Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField label="Father/Husband Name" name="fatherHusbandName" value={formData.fatherHusbandName} onChange={handleInputChange} />
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate uppercase tracking-widest">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <FormField label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleInputChange} />
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate uppercase tracking-widest">Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <FormField label="Nationality" name="nationality" value={formData.nationality} onChange={handleInputChange} />
            </div>
          </section>

          {/* Section: Professional */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black text-gold uppercase tracking-[0.5em] flex items-center gap-4">
               <Briefcase size={14} /> Professional
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField label="Occupation" name="occupation" value={formData.occupation} onChange={handleInputChange} />
              <FormField label="Organization" name="companyName" value={formData.companyName} onChange={handleInputChange} />
              <FormField label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} />
            </div>
          </section>

          {/* Section: Geographical */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black text-gold uppercase tracking-[0.5em] flex items-center gap-4">
               <MapPin size={14} /> Address
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate uppercase tracking-widest">Residential Address</label>
                <textarea name="residentialAddress" value={formData.residentialAddress} onChange={handleInputChange} rows={3} className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField label="City" name="city" value={formData.city} onChange={handleInputChange} />
                <FormField label="State" name="state" value={formData.state} onChange={handleInputChange} />
                <FormField label="Pincode" name="pincode" value={formData.pincode} onChange={handleInputChange} maxLength={6} />
              </div>
            </div>
          </section>

          {/* Section: Emergency */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-black text-gold uppercase tracking-[0.5em] flex items-center gap-4">
               <Heart size={14} /> Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Contact Name" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} />
              <FormField label="Phone Number" name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleInputChange} maxLength={10} />
            </div>
          </section>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-white/80 backdrop-blur-sm pb-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-5 bg-slate/5 text-slate font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl hover:bg-slate/10 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-[2] py-5 gold-gradient text-navy font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-xl shadow-gold/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
               {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-navy"></div> : <><CheckCircle size={18} /> Update Profile</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, name, type = 'text', value, onChange, maxLength }: { label: string, name: string, type?: string, value: string, onChange: any, maxLength?: number }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate uppercase tracking-widest">{label}</label>
      <input 
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all outline-none" 
      />
    </div>
  );
}
