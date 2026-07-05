'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2, Save, ArrowLeft, Search, Printer, Share2, Scissors } from 'lucide-react';
import { Member, WalkInGuest } from '@/types';
import toast from 'react-hot-toast';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  fromMenu?: boolean;
  menuId?: number;
}

interface SalonService {
  id: number;
  name: string;
  category: string;
  price: number;
  department: string;
  isAvailable: boolean;
}

function CreateInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMember, setIsMember] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [department, setDepartment] = useState('SALON');
  const [lockedDepartment, setLockedDepartment] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [menuServices, setMenuServices] = useState<SalonService[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [guestSearchTerm, setGuestSearchTerm] = useState('');
  const [filteredGuests, setFilteredGuests] = useState<WalkInGuest[]>([]);
  const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchAllMembers = async () => {
      try {
        const response = await api.get('members');
        setAllMembers(response.data);
        setFilteredMembers(response.data);
      } catch {
        toast.error('Registry sync failed');
      }
    };
    fetchAllMembers();
  }, []);

  useEffect(() => {
    const mId = searchParams.get('memberId');
    if (mId) setMemberId(mId);
    const dept = searchParams.get('department');
    if (dept) { setDepartment(dept); setLockedDepartment(true); }
  }, [searchParams]);

  useEffect(() => {
    const realMembers = allMembers.filter(m => m.membershipNumber !== 'GUEST-001');
    if (!searchTerm) {
      setFilteredMembers(realMembers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = realMembers.filter(m => 
      m.nameAsAadhaar.toLowerCase().includes(term) ||
      m.membershipNumber.toLowerCase().includes(term) ||
      m.mobileNumber.includes(term)
    );
    setFilteredMembers(filtered);
  }, [searchTerm, allMembers]);

  useEffect(() => {
    if (!guestSearchTerm || !isGuestDropdownOpen) {
      setFilteredGuests([]);
      return;
    }
    const timer = setTimeout(() => {
      api.get('walkin-guests', { params: { search: guestSearchTerm } })
        .then(res => setFilteredGuests(res.data))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [guestSearchTerm, isGuestDropdownOpen]);

  const DEPARTMENT_NAMES: Record<string, string> = {
    SALON: 'Salon', GYM: 'Gym', POOL: 'Swimming Pool',
    BANQUET: 'Banquet', PERSONAL_TRAINER: 'Personal Trainer',
    AMC: 'AMC', RESTAURANT: 'Restaurant', PENALTY: 'Penalty',
  };

  useEffect(() => {
    if (['PENALTY', 'AMC'].includes(department)) {
      setMenuServices([]);
      return;
    }
    api.get('menu', { params: { department } })
      .then(res => setMenuServices(res.data.filter((s: SalonService) => s.isAvailable)))
      .catch(() => {});
  }, [department]);

  const addSalonService = (service: SalonService) => {
    const existing = items.findIndex(i => i.menuId === service.id);
    if (existing !== -1) {
      const updated = [...items];
      updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
      setItems(updated);
      toast.success(`${service.name} quantity → ${updated[existing].quantity}`);
    } else {
      setItems([...items, { description: service.name, quantity: 1, unitPrice: service.price, fromMenu: true, menuId: service.id }]);
      toast.success(`${service.name} added`);
    }
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    if (items[index].fromMenu && field === 'description') return;
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  useEffect(() => {
    if (!isMember) { setDiscount(0); return; }
    const selectedMember = allMembers.find(m => m.id.toString() === memberId);
    if (selectedMember && selectedMember.membershipNumber !== 'GUEST-001') {
      const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      setDiscount(subtotal * 0.30);
    } else {
      setDiscount(0);
    }
  }, [isMember, memberId, items, allMembers]);

  const calculateSubtotal = () => items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const gstRate = (department === 'RESTAURANT' || department === 'BANQUET') ? 0.05 : 0.18;
  const subtotal = calculateSubtotal();
  const gstAmount = (subtotal - discount) * gstRate;
  const rawTotal = (subtotal - discount) + gstAmount;
  const total = Math.round(rawTotal);
  const roundOff = Number((total - rawTotal).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMember && !memberId) return alert('Please select a member');
    
    try {
      const res = await api.post('billing/invoice', {
        memberId: isMember ? Number(memberId) : undefined,
        isMember,
        guestName: isMember ? undefined : guestName,
        guestContact: isMember ? undefined : guestContact,
        department,
        items,
        discount
      });
      setCreatedInvoice(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create invoice');
    }
  };

  const getContactNumber = () => {
    if (!isMember) return guestContact;
    const m = allMembers.find(m => m.id.toString() === memberId);
    return m?.mobileNumber || '';
  };

  const whatsappShare = () => {
    const inv = createdInvoice;
    if (!inv) return;
    const contact = getContactNumber();
    if (!contact) return toast.error('No contact number available');
    const line = (s: string) => s + '\n';
    let msg = '';
    msg += line('🧾 *THE STELLAAR - INVOICE*');
    msg += line(`📋 ${inv.invoiceNumber}`);
    msg += line(`👤 ${isMember ? inv.member?.nameAsAadhaar || 'Member' : guestName || 'Guest'}`);
    msg += line('──────────────────');
    inv.items?.forEach((item: any) => {
      msg += line(`${item.description} x${item.quantity}  ₹${Number(item.unitPrice).toLocaleString()}`);
    });
    msg += line('──────────────────');
    msg += line(`Subtotal   ₹${Number(inv.amount).toLocaleString()}`);
    if (Number(inv.discount) > 0) msg += line(`Discount  -₹${Number(inv.discount).toLocaleString()}`);
    msg += line(`GST        ₹${Number(inv.gst).toLocaleString()}`);
    msg += line(`*Total      ₹${Number(inv.total).toLocaleString()}*`);
    msg += line('──────────────────');
    msg += line('Thank you for your patronage!');
    window.open(`https://wa.me/91${contact.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const printInvoice = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const inv = createdInvoice;
    const customerName = isMember ? inv.member?.nameAsAadhaar || 'Member' : guestName || 'Guest';
    const contact = getContactNumber();
    win.document.write(`
      <html><head><title>${inv.invoiceNumber}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 2px 0; text-align: left; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .total { font-size: 14px; }
      </style></head><body>
      <h1>THE STELLAAR</h1>
      <p class="center">${inv.department}</p>
      <p class="center">${inv.invoiceNumber}</p>
      <div class="line"></div>
      <p><b>Customer:</b> ${customerName}</p>
      ${contact ? `<p><b>Contact:</b> ${contact}</p>` : ''}
      <p><b>Date:</b> ${new Date(inv.createdAt).toLocaleDateString()}</p>
      <div class="line"></div>
      <table>
        <tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Amt</th></tr>
        ${(inv.items || []).map((item: any) => `
          <tr><td>${item.description}</td><td class="right">${item.quantity}</td><td class="right">${Number(item.unitPrice).toLocaleString()}</td><td class="right">${(item.quantity * item.unitPrice).toLocaleString()}</td></tr>
        `).join('')}
      </table>
      <div class="line"></div>
      <table>
        <tr><td>Subtotal</td><td class="right">₹${Number(inv.amount).toLocaleString()}</td></tr>
        ${Number(inv.discount) > 0 ? `<tr><td>Discount</td><td class="right">-₹${Number(inv.discount).toLocaleString()}</td></tr>` : ''}
        <tr><td>GST</td><td class="right">₹${Number(inv.gst).toLocaleString()}</td></tr>
        ${Number(inv.roundOff) !== 0 ? `<tr><td>Round Off</td><td class="right">${Number(inv.roundOff) > 0 ? '+' : ''}₹${Number(inv.roundOff).toLocaleString()}</td></tr>` : ''}
        <tr class="total"><td class="bold">Total</td><td class="right bold">₹${Number(inv.total).toLocaleString()}</td></tr>
      </table>
      <div class="line"></div>
      <p class="center">Thank you for your patronage!</p>
      <script>window.onload=function(){window.print();window.close()}<\\/script>
    </body></html>`);
    win.document.close();
  };

  if (createdInvoice) {
    const inv = createdInvoice;
    const customerName = isMember ? inv.member?.nameAsAadhaar || 'Member' : guestName || 'Guest';
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-navy to-blue-900 p-6 text-white text-center">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Invoice Generated</p>
              <h2 className="text-2xl font-bold mt-1">{inv.invoiceNumber}</h2>
              <p className="text-sm mt-1 opacity-80">{customerName}</p>
            </div>
            <div ref={printRef} className="p-6 space-y-4">
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-gray-500">Department</span>
                <span className="font-bold">{inv.department}</span>
              </div>
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-gray-500">Date</span>
                <span className="font-bold">{new Date(inv.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Items</h4>
                {(inv.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.description} <span className="text-gray-400">x{item.quantity}</span></span>
                    <span className="font-semibold">₹{Number(item.unitPrice * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>₹{Number(inv.amount).toLocaleString()}</span>
                </div>
                {Number(inv.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Discount</span>
                    <span className="text-green-600">-₹{Number(inv.discount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">GST</span>
                  <span>₹{Number(inv.gst).toLocaleString()}</span>
                </div>
                {Number(inv.roundOff) !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Round Off</span>
                    <span className="text-gray-500">{Number(inv.roundOff) > 0 ? '+' : ''}{Number(inv.roundOff).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2 text-blue-600">
                  <span>Total</span>
                  <span>₹{Number(inv.total).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 bg-gray-50 border-t">
              <button onClick={() => { setCreatedInvoice(null); setItems([{ description: '', quantity: 1, unitPrice: 0 }]); setDiscount(0); }} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">
                New Invoice
              </button>
              <button onClick={printInvoice} className="flex-1 py-2.5 bg-navy text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-blue-900 transition-all flex items-center justify-center gap-2">
                <Printer size={14} /> Print
              </button>
              <button onClick={whatsappShare} className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2">
                <Share2 size={14} /> WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 mb-6">
          <ArrowLeft size={20} className="mr-2" /> Back
        </button>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
          <p className="text-gray-500">Generate a bill for club services</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-gray-700">Customer Type</label>
              <div className="flex gap-3 bg-gray-50 p-1 rounded-lg border">
                <button
                  type="button"
                  onClick={() => { setIsMember(true); setMemberId(''); setSearchTerm(''); }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                    isMember ? 'bg-white text-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Member
                </button>
                <button
                  type="button"
                  onClick={() => { setIsMember(false); setMemberId(''); setSearchTerm(''); }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                    !isMember ? 'bg-white text-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Non-Member
                </button>
              </div>
            </div>

            {isMember && (
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-gray-700">Select Member</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    className="w-full pl-9 p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Search name, ID or phone..."
                    value={searchTerm}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {isDropdownOpen && filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                        onClick={() => {
                          setMemberId(m.id.toString());
                          setSearchTerm(m.nameAsAadhaar);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="font-semibold text-navy">{m.nameAsAadhaar}</div>
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          <span>{m.membershipNumber}</span>
                          <span>{m.mobileNumber}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {memberId && (
                  <div className="text-[10px] text-green-600 font-black uppercase tracking-widest flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                     Identity Linked: STEL-NODE-{memberId}
                  </div>
                )}
              </div>
            )}

            {!isMember && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Customer Details</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Search past guests or type new name"
                    value={guestSearchTerm}
                    onFocus={() => setIsGuestDropdownOpen(true)}
                    onChange={(e) => {
                      setGuestSearchTerm(e.target.value);
                      setGuestName(e.target.value);
                    }}
                  />
                  {isGuestDropdownOpen && filteredGuests.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredGuests.map((g) => (
                        <div
                          key={g.id}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                          onClick={() => {
                            setGuestName(g.name);
                            setGuestContact(g.contact || '');
                            setGuestSearchTerm(g.name);
                            setIsGuestDropdownOpen(false);
                          }}
                        >
                          <div className="font-semibold text-navy">{g.name}</div>
                          {g.contact && <div className="text-xs text-gray-400">{g.contact}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Contact number"
                  value={guestContact}
                  onChange={(e) => setGuestContact(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">No Membership</span>
                  <span className="text-[10px] text-gray-400 font-medium">No discount applicable</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={lockedDepartment}
                className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${lockedDepartment ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
              >
                <option value="SALON">Salon (18% GST)</option>
                <option value="GYM">Gym (18% GST)</option>
                <option value="POOL">Swimming Pool (18% GST)</option>
                <option value="BANQUET">Banquet (5% GST)</option>
                <option value="PERSONAL_TRAINER">Personal Trainer (18% GST)</option>
                <option value="AMC">Annual Maintenance (18% GST)</option>
                <option value="RESTAURANT">Restaurant (5% GST)</option>
                <option value="PENALTY">Member Penalty (18% GST)</option>
              </select>
            </div>
          </div>

          {menuServices.length > 0 && (
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Scissors size={18} className="text-gold" />
                  {DEPARTMENT_NAMES[department] || department} Services
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
                      toast.success('Custom item added — edit description & price below');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-[10px] font-bold text-gray-500 hover:text-navy hover:border-gold/40 hover:bg-gold/5 transition-all uppercase tracking-wider"
                  >
                    <Plus size={12} /> Write Custom Item
                  </button>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={menuSearch}
                      onChange={e => setMenuSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 border rounded-lg text-sm w-48 outline-none focus:ring-2 focus:ring-gold/40"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {menuServices
                  .filter(s => s.name.toLowerCase().includes(menuSearch.toLowerCase()))
                  .map(service => {
                    const existing = items.find(i => i.menuId === service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => addSalonService(service)}
                        className={`group text-left p-4 rounded-xl border transition-all ${
                          existing
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-gray-100 hover:border-gold/40 hover:bg-gold/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{service.category}</span>
                          {existing && <span className="text-[10px] font-bold text-emerald-600">{existing.quantity}×</span>}
                        </div>
                        <div className={`font-bold text-sm ${existing ? 'text-emerald-700' : 'text-navy'} transition-colors`}>{service.name}</div>
                        <div className="text-sm font-bold text-gold mt-1">₹{Number(service.price).toLocaleString('en-IN')}</div>
                      </button>
                    );
                  })}
                {menuServices.filter(s => s.name.toLowerCase().includes(menuSearch.toLowerCase())).length === 0 && (
                  <div className="col-span-full text-center py-6 text-gray-400 text-sm font-medium">No services match your search.</div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Service Items</h3>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-gray-500 flex items-center gap-2">
                      Description
                      {item.fromMenu && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">From Menu</span>}
                    </label>
                    <input
                      className={`w-full p-2 border rounded-md text-sm ${item.fromMenu ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Service name..."
                      required
                      readOnly={item.fromMenu}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-xs font-medium text-gray-500">Qty</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-md text-sm"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      min="1"
                      required
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-xs font-medium text-gray-500">Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`w-full p-2 border rounded-md text-sm font-bold ${item.fromMenu ? 'bg-gray-50 text-emerald-700 border-emerald-200' : ''}`}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                      required
                    />
                    {item.fromMenu && <span className="text-[9px] text-emerald-500 font-bold uppercase">From Menu</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-0.5"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mt-2"
              >
                <Plus size={16} /> Add Another Item
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <div className="max-w-xs ml-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold">₹ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">
                  Discount {isMember && discount > 0 ? '(30% Member Benefit)' : ''}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-navy/40">₹</span>
                  <input
                    type="number"
                    className="w-24 p-1 border rounded text-right text-sm font-bold text-green-600"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GST ({(gstRate * 100).toFixed(0)}%)</span>
                <span className="font-semibold">₹ {gstAmount.toFixed(2)}</span>
              </div>
              {roundOff !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Round Off</span>
                  <span className="font-semibold text-gray-500">{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t pt-3 text-blue-600">
                <span>Total</span>
                <span>₹ {total.toFixed(2)}</span>
              </div>
              <button
                type="submit"
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Save size={20} /> Generate Invoice
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateInvoiceForm />
    </Suspense>
  );
}
