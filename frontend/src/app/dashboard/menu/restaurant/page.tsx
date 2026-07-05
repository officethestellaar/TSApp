'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import {
  Utensils, Plus, Edit, Trash2, Search, X, ToggleLeft, ToggleRight
} from 'lucide-react';
import ExportButton from '@/components/ui/ExportButton';
import { usePermission } from '@/hooks/usePermission';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  department: string;
  isAvailable: boolean;
}

const RESTAURANT_CATEGORIES = [
  'APPETIZER', 'SOUP', 'SALAD', 'MAIN_COURSE', 'ROTI',
  'RICE', 'DESSERT', 'BEVERAGE', 'SNACKS', 'COMBO', 'OTHER',
];

const emptyForm = { name: '', category: 'APPETIZER', price: '', department: 'RESTAURANT', isAvailable: true };

export default function RestaurantMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const canCreateMenu = usePermission('restaurant-menu', 'create');
  const canUpdateMenu = usePermission('restaurant-menu', 'update');
  const canDeleteMenu = usePermission('restaurant-menu', 'delete');

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get('menu', { params: { department: 'RESTAURANT' } });
      setItems(res.data);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({ name: item.name, category: item.category, price: String(item.price), department: 'RESTAURANT', isAvailable: item.isAvailable });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editing) {
        const res = await api.put(`menu/${editing.id}`, payload);
        setItems(prev => prev.map(i => i.id === editing.id ? res.data : i));
      } else {
        const res = await api.post('menu', payload);
        setItems(prev => [res.data, ...prev]);
      }
      setShowModal(false);
    } catch { alert('Failed to save item'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`menu/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch { alert('Failed to delete item'); }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const res = await api.put(`menu/${item.id}`, { isAvailable: !item.isAvailable });
      setItems(prev => prev.map(i => i.id === item.id ? res.data : i));
    } catch { alert('Failed to update'); }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "w-full px-4 py-3 bg-navy/[0.03] border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-all";

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
              <Utensils className="text-gold" size={32} />
              Restaurant Menu
            </h1>
            <p className="text-slate/60 font-semibold mt-1 text-sm">Manage food & beverage catalogue — 5% GST applicable</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              filename="restaurant-menu"
              headers={['Name', 'Category', 'Price', 'Available']}
              rows={filtered.map(i => [i.name, i.category, i.price, i.isAvailable ? 'Yes' : 'No'])}
            />
            {canCreateMenu && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider"
              >
                <Plus size={14} /> Add Item
              </button>
            )}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Utensils size={16} className="text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-800">
            Food items are subject to 5% GST. Prices shown are before tax.
          </span>
        </div>

        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/30" />
          <input
            type="text" placeholder="Search menu items..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-navy/[0.06] rounded-xl text-sm font-semibold text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-navy/[0.04] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy/[0.02] border-b border-navy/[0.05]">
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Item</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Category</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Price (₹)</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Status</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate uppercase tracking-[0.3em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/[0.03]">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-24 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-24 text-center text-slate font-bold uppercase tracking-widest text-xs opacity-40">
                  No menu items found.
                </td></tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gold/[0.02] transition-all">
                    <td className="px-8 py-5">
                      <div className="font-bold text-navy text-sm">{item.name}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center px-2.5 py-1 bg-gold/10 rounded-lg text-[10px] font-bold text-gold/80 uppercase tracking-wider">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-navy">₹{Number(item.price).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-8 py-5">
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                          item.isAvailable
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.isAvailable ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdateMenu && (
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 text-navy/40 hover:text-gold hover:bg-gold/5 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit size={15} />
                          </button>
                        )}
                        {canDeleteMenu && (
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-2 text-navy/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg mx-4 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                <Utensils size={20} className="text-gold" />
                {editing ? 'Edit Item' : 'Add Item'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-navy/5 rounded-xl transition-colors">
                <X size={20} className="text-navy/40" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Item Name</label>
                <input
                  type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className={inputClass} placeholder="e.g. Grilled Chicken" required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className={inputClass}
                >
                  {RESTAURANT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-[0.2em] mb-1.5">Price (₹)</label>
                <input
                  type="number" value={form.price} step="0.01" min="0"
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  className={inputClass} placeholder="0.00" required
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-navy/10 peer-focus:ring-2 peer-focus:ring-gold/40 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                </label>
                <span className="text-xs font-bold text-navy/60">
                  {form.isAvailable ? 'Available for ordering' : 'Hidden from ordering'}
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-navy/10 rounded-xl text-xs font-bold text-navy/50 hover:text-navy transition-all uppercase tracking-wider"
                >Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-6 py-3 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 text-xs uppercase tracking-wider disabled:opacity-50"
                >{saving ? 'Saving...' : editing ? 'Update Item' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
