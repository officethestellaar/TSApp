'use client';

import React, { useEffect, useState, Suspense } from 'react';
import api from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, Save, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
}

function EditInvoiceForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<EditItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState('UNPAID');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get(`billing/invoice/${params.id}`)
      .then((res) => {
        const inv = res.data;
        setInvoice(inv);
        setItems((inv.items || []).map((i: any) => ({
          id: i.id,
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })));
        setDiscount(Number(inv.discount || 0));
        setStatus(inv.status || 'UNPAID');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [params.id, isSuperAdmin]);

  const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error('A bill must have at least one item');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof EditItem, value: string | number) => {
    const next = [...items];
    (next[index] as any)[field] = field === 'quantity' ? Math.max(Number(value) || 0, 1) : Number(value) || 0;
    if (field === 'description') next[index].description = String(value);
    setItems(next);
  };

  const gstRate = (invoice?.department === 'RESTAURANT' || invoice?.department === 'BANQUET') ? 0.05 : 0.18;
  const subtotal = items.reduce((sum, i) => sum + (Number(i.unitPrice) * Number(i.quantity)), 0);
  const effectiveDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const gstAmount = (subtotal - effectiveDiscount) * gstRate;
  const rawTotal = (subtotal - effectiveDiscount) + gstAmount;
  const total = Math.round(rawTotal);
  const roundOff = Number((total - rawTotal).toFixed(2));

  const handleSave = async () => {
    if (isLocked) {
      toast.error('This invoice is settled and locked.');
      return;
    }
    if (items.some(i => !i.description.trim())) {
      toast.error('Every item needs a description');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`billing/invoice/${params.id}`, {
        items: items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
        discount: effectiveDiscount,
        status,
      });
      toast.success('Bill updated successfully');
      router.push('/dashboard/billing');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update bill');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-32">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={32} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-navy mb-2">Super Admin Only</h1>
        <p className="text-slate font-medium mb-8">Only the Super Admin can adjust bills, bill items, and discounts.</p>
        <button onClick={() => router.push('/dashboard/billing')} className="px-6 py-3 bg-navy text-gold rounded-xl text-[10px] font-black uppercase tracking-widest">
          Back to Billing
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div>
      </div>
    );
  }

  const customerName = invoice?.member?.nameAsAadhaar || invoice?.walkInGuest?.name || 'Unknown';
  const isLocked = invoice?.status === 'PAID' || invoice?.status === 'PENDING_APPROVAL';

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate hover:text-navy text-xs font-bold uppercase tracking-widest mb-8 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-navy tracking-tight">Edit Bill</h1>
              <p className="text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Super Admin Console</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate/5 shadow-lg shadow-navy/5">
              <p className="text-[9px] font-bold text-slate uppercase tracking-[0.2em] mb-1">Invoice</p>
              <p className="font-mono text-xs font-bold text-navy">{invoice?.invoiceNumber}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate/5 shadow-lg shadow-navy/5">
              <p className="text-[9px] font-bold text-slate uppercase tracking-[0.2em] mb-1">Customer</p>
              <p className="font-bold text-sm text-navy truncate">{customerName}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate/5 shadow-lg shadow-navy/5">
              <p className="text-[9px] font-bold text-slate uppercase tracking-[0.2em] mb-1">Department</p>
              <p className="font-bold text-sm text-navy">{invoice?.department}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate/5 shadow-lg shadow-navy/5">
              <p className="text-[9px] font-bold text-slate uppercase tracking-[0.2em] mb-1">GST Rate</p>
              <p className="font-bold text-sm text-navy">{(gstRate * 100).toFixed(0)}%</p>
            </div>
          </div>
        </header>

        {isLocked && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-green-700">Invoice Settled — Editing Locked</h3>
              <p className="text-xs text-green-600/80 mt-1">This invoice is {invoice.status === 'PENDING_APPROVAL' ? 'fully paid and pending approval' : 'fully settled (PAID)'}. Its amounts, items, and status are locked and cannot be changed.</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl shadow-navy/5 border border-slate/5 p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-serif font-bold text-navy">Bill Items</h3>
            <button
              onClick={addItem}
              disabled={isLocked}
              className="flex items-center gap-1.5 px-4 py-2 border border-dashed border-slate/30 rounded-xl text-[10px] font-black text-slate hover:text-navy hover:border-gold/40 hover:bg-gold/5 transition-all uppercase tracking-widest disabled:opacity-40 disabled:pointer-events-none"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="space-y-4">
            <div className="hidden md:grid grid-cols-[1fr_90px_130px_40px] gap-4 px-2 text-[9px] font-bold text-slate uppercase tracking-[0.2em]">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span />
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_90px_130px_40px] gap-3 items-end bg-navy/[0.02] rounded-2xl p-4 border border-slate/5">
                <div>
                  <label className="md:hidden text-[9px] font-bold text-slate uppercase tracking-[0.2em] mb-1 block">Description</label>
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    disabled={isLocked}
                    placeholder="Item description..."
                    className="w-full p-2.5 border border-slate/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold transition-all disabled:opacity-60 disabled:bg-navy/[0.03]"
                  />
                </div>
                <div>
                  <label className="md:hidden text-[9px] font-bold text-slate uppercase tracking-[0.2em] mb-1 block">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    disabled={isLocked}
                    className="w-full p-2.5 border border-slate/10 rounded-xl text-sm text-right font-bold outline-none focus:ring-2 focus:ring-gold transition-all disabled:opacity-60 disabled:bg-navy/[0.03]"
                  />
                </div>
                <div>
                  <label className="md:hidden text-[9px] font-bold text-slate uppercase tracking-[0.2em] mb-1 block">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                    disabled={isLocked}
                    className="w-full p-2.5 border border-slate/10 rounded-xl text-sm text-right font-bold outline-none focus:ring-2 focus:ring-gold transition-all disabled:opacity-60 disabled:bg-navy/[0.03]"
                  />
                </div>
                <button
                  onClick={() => removeItem(index)}
                  disabled={isLocked}
                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all justify-self-start md:justify-self-end disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-navy/5 border border-slate/5 p-8">
          <div className="max-w-sm ml-auto space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate font-medium">Subtotal</span>
              <span className="font-bold text-navy">₹ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate font-medium">Discount</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-navy/40">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  disabled={isLocked}
                  className="w-28 p-2 border border-slate/10 rounded-xl text-right text-sm font-bold text-green-600 outline-none focus:ring-2 focus:ring-gold disabled:opacity-60 disabled:bg-navy/[0.03]"
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate font-medium">CGST ({((gstRate / 2) * 100).toFixed(1)}%)</span>
              <span className="font-bold text-navy">₹ {(gstAmount / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate font-medium">SGST ({((gstRate / 2) * 100).toFixed(1)}%)</span>
              <span className="font-bold text-navy">₹ {(gstAmount / 2).toFixed(2)}</span>
            </div>
            {roundOff !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate font-medium">Round Off</span>
                <span className="font-bold text-slate">{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-serif font-bold border-t border-slate/10 pt-3 text-gold">
              <span>Total</span>
              <span>₹ {total.toFixed(2)}</span>
            </div>

            <div className="pt-4 border-t border-slate/10 space-y-2">
              <label className="text-[9px] font-bold text-slate uppercase tracking-[0.2em]">Invoice Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isLocked}
                className="w-full p-2.5 border border-slate/10 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-gold disabled:opacity-60 disabled:bg-navy/[0.03]"
              >
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || isLocked}
              className="w-full mt-4 bg-navy hover:bg-black text-gold py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isLocked ? 'Invoice Locked' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center py-32"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div></div>}>
      <EditInvoiceForm />
    </Suspense>
  );
}
