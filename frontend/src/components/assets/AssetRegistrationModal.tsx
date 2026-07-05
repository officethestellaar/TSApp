'use client';

import React, { useState, useEffect } from 'react';
import { X, Wrench, Loader2, Save, Tag, MapPin, IndianRupee, Edit3 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AssetModalProps {
  onClose: () => void;
  onSuccess: () => void;
  asset?: any; // Optional asset for editing
}

export default function AssetRegistrationModal({ onClose, onSuccess, asset }: AssetModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'GYM',
    tagNumber: '',
    location: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    status: 'OPERATIONAL',
    nextMaintenance: ''
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        category: asset.category || 'GYM',
        tagNumber: asset.tagNumber || '',
        location: asset.location || '',
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        purchaseCost: asset.purchaseCost?.toString() || '',
        status: asset.status || 'OPERATIONAL',
        nextMaintenance: asset.nextMaintenance ? new Date(asset.nextMaintenance).toISOString().split('T')[0] : ''
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        purchaseCost: Number(formData.purchaseCost),
        purchaseDate: new Date(formData.purchaseDate),
        nextMaintenance: formData.nextMaintenance ? new Date(formData.nextMaintenance) : null
      };

      if (asset) {
        await api.patch(`assets/${asset.id}`, payload);
        toast.success('Asset updated successfully');
      } else {
        await api.post('assets', payload);
        toast.success('Asset registered successfully');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${asset ? 'update' : 'register'} asset`);
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
             <div className="w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center text-navy shadow-inner">
                {asset ? <Edit3 size={24} /> : <Wrench size={24} />}
             </div>
             <div>
                <h3 className="text-xl font-serif font-bold text-navy">{asset ? 'Edit Estate Asset' : 'Register Estate Asset'}</h3>
                <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">{asset ? 'Update Asset' : 'New Asset'}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-navy/5 rounded-full transition-colors text-slate/40">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Asset Name</label>
                 <input 
                   required
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   placeholder="E.g., Treadmill Pro 5"
                   className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Tag</label>
                 <div className="relative">
                    <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" />
                    <input 
                      required
                      value={formData.tagNumber}
                      onChange={e => setFormData({...formData, tagNumber: e.target.value})}
                      placeholder="TAG-XXXX"
                      className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Category</label>
                 <select 
                   value={formData.category}
                   onChange={e => setFormData({...formData, category: e.target.value})}
                   className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                 >
                    <option value="GYM">Gym Equipment</option>
                    <option value="POOL">Pool Facility</option>
                    <option value="SPA">Spa & Salon</option>
                    <option value="FURNITURE">Estate Furniture</option>
                    <option value="IT">IT Infrastructure</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Initial Status</label>
                 <select 
                   value={formData.status}
                   onChange={e => setFormData({...formData, status: e.target.value})}
                   className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                 >
                    <option value="OPERATIONAL">Operational</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="RETIRED">Retired</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Location</label>
                 <div className="relative">
                    <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" />
                    <input 
                      required
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      placeholder="E.g., Floor 1 - North"
                      className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Acquisition Cost</label>
                 <div className="relative">
                    <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" />
                    <input 
                      required
                      type="number"
                      value={formData.purchaseCost}
                      onChange={e => setFormData({...formData, purchaseCost: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none font-bold"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Last Updated</label>
                 <input 
                   required
                   type="date"
                   value={formData.purchaseDate}
                   onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                   className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Maintenance Schedule</label>
                 <input 
                   type="date"
                   value={formData.nextMaintenance}
                   onChange={e => setFormData({...formData, nextMaintenance: e.target.value})}
                   className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                 />
              </div>
           </div>

           <button
             type="submit"
             disabled={loading}
             className="w-full py-5 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50 mt-4"
           >
             {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> {asset ? 'Update Asset' : 'Register Asset'}</>}
           </button>
        </form>
      </div>
    </div>
  );
}
