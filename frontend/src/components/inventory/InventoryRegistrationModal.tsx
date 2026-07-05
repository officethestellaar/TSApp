'use client';

import React, { useState, useEffect } from 'react';
import { X, Package, Loader2, Save, Box, IndianRupee, AlertTriangle, Edit3 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface InventoryModalProps {
  onClose: () => void;
  onSuccess: () => void;
  item?: any; // Optional item for editing
}

export default function InventoryRegistrationModal({ onClose, onSuccess, item }: InventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'VEGETABLES',
    unit: 'kg',
    currentStock: '0',
    minStockLevel: '5',
    unitPrice: '0'
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        category: item.category || 'VEGETABLES',
        unit: item.unit || 'kg',
        currentStock: item.currentStock?.toString() || '0',
        minStockLevel: item.minStockLevel?.toString() || '5',
        unitPrice: item.unitPrice?.toString() || '0'
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        currentStock: Number(formData.currentStock),
        minStockLevel: Number(formData.minStockLevel),
        unitPrice: Number(formData.unitPrice)
      };

      if (item) {
        await api.patch(`inventory/${item.id}`, payload);
        toast.success('Item updated');
      } else {
        await api.post('inventory', payload);
        toast.success('Item added');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${item ? 'update' : 'add'} item`);
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
                {item ? <Edit3 size={24} /> : <Package size={24} />}
             </div>
             <div>
                <h3 className="text-xl font-serif font-bold text-navy">{item ? 'Edit Item' : 'Add Item'}</h3>
                <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">{item ? 'Update Item' : 'New Item'}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-navy/5 rounded-full transition-colors text-slate/40">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Item Name</label>
                 <input 
                   required
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   placeholder="E.g., Basmati Rice Premium"
                   className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Category</label>
                 <select 
                   value={formData.category}
                   onChange={e => setFormData({...formData, category: e.target.value})}
                   className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                 >
                    <option value="VEGETABLES">Vegetables</option>
                    <option value="DAIRY">Dairy Products</option>
                    <option value="MEAT">Meat & Poultry</option>
                    <option value="BEVERAGE">Beverages</option>
                    <option value="DRY_GOODS">Dry Goods / Grains</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Unit</label>
                 <select 
                   value={formData.unit}
                   onChange={e => setFormData({...formData, unit: e.target.value})}
                   className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
                 >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="liters">Liters (L)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="gms">Grams (g)</option>
                    <option value="ml">Milliliters (ml)</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Current Stock</label>
                 <div className="relative">
                    <Box size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" />
                    <input 
                      required
                      type="number"
                      value={formData.currentStock}
                      onChange={e => setFormData({...formData, currentStock: e.target.value})}
                      placeholder="0"
                      className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none font-bold"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-navy uppercase tracking-widest px-1">Unit Price (INR)</label>
                 <div className="relative">
                    <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" />
                    <input 
                      required
                      type="number"
                      value={formData.unitPrice}
                      onChange={e => setFormData({...formData, unitPrice: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-5 py-3 text-sm focus:ring-2 focus:ring-gold/20 outline-none font-bold text-navy"
                    />
                 </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                 <label className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <AlertTriangle size={10} /> Critical Min Stock Level
                 </label>
                 <input 
                   required
                   type="number"
                   value={formData.minStockLevel}
                   onChange={e => setFormData({...formData, minStockLevel: e.target.value})}
                   placeholder="5"
                   className="w-full bg-red-50/50 border border-red-100 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-red-200 outline-none font-bold text-red-600 text-center"
                 />
              </div>
           </div>

           <button
             type="submit"
             disabled={loading}
             className="w-full py-5 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50 mt-4"
           >
             {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> {item ? 'Update Item' : 'Add Item'}</>}
           </button>
        </form>
      </div>
    </div>
  );
}
