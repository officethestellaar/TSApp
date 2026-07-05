'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { Utensils, Search, Plus, Minus, Send, Receipt, ArrowLeft, UserCheck, X, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { MenuItem, Member } from '@/types';
import { useSocket } from '@/context/SocketContext';
import toast from 'react-hot-toast';
import ImmediateFeedbackModal from '@/components/reports/ImmediateFeedbackModal';

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
}

export default function TablePOSPage() {
  const { id } = useParams();
  const router = useRouter();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [paxCount, setPaxCount] = useState(1);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [showConfirmBill, setShowConfirmBill] = useState(false);
  const { socket } = useSocket();

  const allItemsServed = activeOrder?.items?.length > 0 && activeOrder.items.every((i: any) => i.status === 'SERVED');
  const allItemsReady = activeOrder?.items?.length > 0 && !allItemsServed && activeOrder.items.every((i: any) => i.status === 'READY');
  const servedCount = activeOrder?.items?.filter((i: any) => i.status === 'SERVED').length || 0;
  const totalCount = activeOrder?.items?.length || 0;

  const fetchMenu = useCallback(async () => {
    try {
      const response = await api.get('restaurant/menu');
      setMenu(response.data);
    } catch {
      console.error('Failed to fetch menu');
    }
  }, []);

  const fetchTableStatus = useCallback(async () => {
    try {
      const response = await api.get('restaurant/tables');
      const table = response.data.find((t: any) => t.id === Number(id));
      if (table?.orders?.[0]) {
        setActiveOrder(table.orders[0]);
      }
    } catch {
      console.error('Failed to fetch table status');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMenu();
    fetchTableStatus();
  }, [fetchMenu, fetchTableStatus]);

  useEffect(() => {
    if (!socket) return;
    const handleItemUpdate = () => { fetchTableStatus(); };
    const handleTableCleared = (data: any) => {
      if (data.tableNumber === activeOrder?.table?.number) {
        toast.success('Table has been cleared');
        router.push('/dashboard/restaurant');
      }
    };
    socket.on('order_item_updated', handleItemUpdate);
    socket.on('order_ready', () => { toast('Order is ready for serving!', { icon: '🍽️' }); fetchTableStatus(); });
    socket.on('table_cleared', handleTableCleared);
    return () => {
      socket.off('order_item_updated', handleItemUpdate);
      socket.off('order_ready');
      socket.off('table_cleared', handleTableCleared);
    };
  }, [socket, fetchTableStatus, activeOrder?.table?.number, router]);

  const addToCart = (item: MenuItem | { id: number; name: string; price: number }) => {
    const existing = cart.find(c => c.menuItemId === item.id);
    if (existing) {
      setCart(cart.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: number) => {
    const existing = cart.find(c => c.menuItemId === itemId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(c => c.menuItemId === itemId ? { ...c, quantity: c.quantity - 1 } : c));
    } else {
      setCart(cart.filter(c => c.menuItemId !== itemId));
    }
  };

  const handleKOT = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');

    try {
      await api.post('restaurant/order', {
        tableId: Number(id),
        memberId: member?.id,
        paxCount,
        items: cart
      });
      toast.success('KOT sent to kitchen');
      setCart([]);
      fetchTableStatus();
    } catch {
      toast.error('Failed to process KOT');
    }
  };

  const handleBillConfirm = () => {
    if (!activeOrder) return;
    setShowConfirmBill(true);
  };

  const handleBill = async () => {
    if (!activeOrder) return;
    setShowConfirmBill(false);
    setBillingLoading(true);
    try {
      const response = await api.post(`restaurant/order/${activeOrder.id}/bill`);
      toast.success(`Bill Generated! Discount: ₹${Number(response.data.discountAbsolute).toLocaleString('en-IN')}`);
      setShowFeedbackModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Billing failed');
    } finally {
      setBillingLoading(false);
    }
  };

  const validateMember = async () => {
    try {
      const response = await api.get('members', { params: { search: memberSearch } });
      if (response.data.length > 0) {
        const m = response.data[0];
        if (m.amcStatus !== 'PAID') {
          toast.error('Member AMC is UNPAID — no discount will be applied');
        }
        setMember(m);
      } else {
        toast.error('Member not found');
      }
    } catch {
      toast.error('Search failed');
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#fdfdfd]">
      {/* Header */}
      <header className="bg-white border-b border-slate/10 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={() => router.back()} className="text-slate hover:text-navy transition-colors p-2 hover:bg-navy/5 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-serif font-bold text-navy">Table POS — No. {id}</h1>
            <div className="text-[10px] text-gold font-bold uppercase tracking-widest">Interactive Order Console</div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate uppercase tracking-widest">Pax Count</span>
            <input
              type="number"
              value={paxCount}
              onChange={(e) => setPaxCount(Number(e.target.value))}
              className="w-16 p-2 bg-navy/5 border border-slate/10 rounded-lg text-center font-bold text-navy outline-none focus:ring-2 focus:ring-gold"
              min="1"
            />
          </div>
          {member ? (
            <div className="bg-gold/10 px-4 py-2 rounded-xl border border-gold/20 flex items-center gap-3">
              <UserCheck size={18} className="text-gold" />
              <div>
                <div className="text-xs font-bold text-navy leading-none">{member.nameAsAadhaar}</div>
                <div className="text-[9px] text-gold font-bold leading-none mt-1">{member.membershipNumber}</div>
              </div>
              <button onClick={() => setMember(null)} className="ml-2 text-gold/60 hover:text-gold"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Identity / Mobile"
                  className="pl-3 pr-4 py-2 bg-navy/5 border border-slate/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold placeholder:text-slate/40"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>
              <button onClick={validateMember} className="gold-gradient text-navy px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg transition-all">Verify Member</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Menu Section */}
        <div className="flex-1 overflow-y-auto p-8 bg-navy/[0.02]">
          <div className="relative mb-8 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate" size={20} />
            <input
              type="text"
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate/10 rounded-2xl outline-none focus:ring-2 focus:ring-gold shadow-sm placeholder:text-slate/40"
              placeholder="Search gourmet menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {activeOrder ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <CheckCircle2 size={48} className="text-emerald-300 mb-4" />
              <p className="text-lg font-bold text-navy/60">Order #{activeOrder.orderNumber} in progress</p>
              <p className="text-xs text-slate/40 font-semibold mt-1">Menu is locked while current order is active</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {menu.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-white p-6 rounded-3xl shadow-lg shadow-navy/5 border border-slate/5 hover:border-gold hover:-translate-y-1 transition-all text-left group"
                >
                  <div className="text-[10px] font-bold text-gold uppercase tracking-widest mb-2">{item.category}</div>
                  <div className="font-serif font-bold text-navy group-hover:text-gold transition-colors text-lg leading-tight">{item.name}</div>
                  <div className="mt-4 font-black text-navy/60 text-sm italic">₹ {item.price}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="w-[400px] bg-white border-l border-slate/10 flex flex-col shadow-2xl z-20">
          <div className="p-6 border-b border-slate/5 flex justify-between items-center bg-navy/[0.02]">
            <h3 className="font-serif font-bold text-navy flex items-center gap-3">
              <Utensils size={20} className="text-gold" /> 
              Current Order
            </h3>
            <div className="flex items-center gap-2">
              {activeOrder && (
                <>
                  <span className="text-[10px] bg-navy text-gold px-3 py-1 rounded-full font-black tracking-widest uppercase border border-gold/30">
                    {activeOrder.orderNumber}
                  </span>
                  {totalCount > 0 && (
                    <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-wider ${
                      allItemsServed
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-orange-100 text-orange-700 border border-orange-200'
                    }`}>
                      {allItemsServed ? 'All Served' : `${servedCount}/${totalCount} Served`}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length > 0 && (
              cart.map((item) => (
                <div key={item.menuItemId} className="flex justify-between items-center group">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-navy truncate">{item.name}</div>
                    <div className="text-[10px] text-slate font-bold uppercase tracking-wider">₹ {item.price} per unit</div>
                  </div>
                  <div className="flex items-center gap-4 bg-navy/5 p-1 rounded-xl border border-slate/5">
                    <button onClick={() => removeFromCart(item.menuItemId)} className="p-1.5 hover:bg-white rounded-lg text-red-500 transition-colors shadow-sm"><Minus size={14} /></button>
                    <span className="font-black text-navy w-6 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price })} className="p-1.5 hover:bg-white rounded-lg text-gold transition-colors shadow-sm"><Plus size={14} /></button>
                  </div>
                </div>
              ))
            )}

            {activeOrder && activeOrder.items && cart.length === 0 && (
              <div className="space-y-4">
                <div className="bg-navy/[0.03] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[9px] font-black text-navy/50 uppercase tracking-[0.2em]">
                      {allItemsServed ? 'Ready for Billing' : 'Order Progress'}
                    </div>
                    {totalCount > 0 && (
                      <div className="flex items-center gap-1.5 text-[9px] font-bold">
                        {allItemsServed ? (
                          <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10} /> All Served</span>
                        ) : (
                          <span className="text-orange-600 flex items-center gap-1"><Clock size={10} /> {servedCount}/{totalCount} Served</span>
                        )}
                      </div>
                    )}
                  </div>
                  {totalCount > 0 && !allItemsServed && (
                    <div className="w-full h-1.5 bg-navy/5 rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full bg-gold transition-all duration-500"
                        style={{ width: `${(servedCount / totalCount) * 100}%` }} />
                    </div>
                  )}
                  {allItemsReady && (
                    <button
                      onClick={async () => {
                        try {
                          await Promise.all(activeOrder.items.map((i: any) =>
                            api.patch(`restaurant/item/${i.id}/status`, { status: 'SERVED' })
                          ));
                          toast.success('All items marked served');
                          fetchTableStatus();
                        } catch { toast.error('Failed to update'); }
                      }}
                      className="w-full py-2 mb-3 rounded-xl text-[10px] font-black bg-blue-500 text-white hover:bg-blue-600 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={14} /> Mark All as Served
                    </button>
                  )}
                  {activeOrder.items.map((i: any) => {
                    const statusColors: Record<string, string> = {
                      PENDING: 'bg-red-100 text-red-700',
                      PREPARING: 'bg-orange-100 text-orange-700',
                      READY: 'bg-green-100 text-green-700',
                      SERVED: 'bg-blue-100 text-blue-700',
                    };
                    return (
                      <div key={i.id} className="flex justify-between items-center gap-2">
                        <span className="flex-1 font-semibold text-navy text-xs">{i.menuItem.name} ×{i.quantity}</span>
                        <div className="flex items-center gap-1.5">
                          {i.status === 'READY' && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.patch(`restaurant/item/${i.id}/status`, { status: 'SERVED' });
                                  toast.success(`${i.menuItem.name} marked served`);
                                  fetchTableStatus();
                                } catch { toast.error('Failed to update'); }
                              }}
                              className="px-2 py-0.5 rounded-md text-[8px] font-black bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors uppercase tracking-wider"
                            >
                              Serve
                            </button>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${statusColors[i.status] || 'bg-gray-100 text-gray-700'}`}>
                            {i.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {allItemsServed && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-emerald-700">All items served — ready to bill</p>
                  </div>
                )}
              </div>
            )}

            {!activeOrder && cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate/30 text-center px-8">
                <Utensils size={64} className="mb-6 opacity-20" />
                <p className="font-serif font-bold text-navy/40 text-lg">Empty Console</p>
                <p className="text-xs font-medium mt-2">Add items from the menu to initiate a Kitchen Order Ticket (KOT)</p>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-slate/5 bg-navy/[0.02] space-y-6 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-1">Estimated Total</div>
                {activeOrder && (
                  <div className="text-xs font-bold text-gold">
                    Bill on: {member?.nameAsAadhaar || activeOrder.member?.nameAsAadhaar || 'Guest'}
                  </div>
                )}
                {!allItemsServed && activeOrder && (
                  <div className="text-[9px] font-bold text-orange-500 mt-0.5">
                    Waiting for kitchen to serve items
                  </div>
                )}
              </div>
              <div className="text-3xl font-serif font-bold text-navy">₹ {subtotal.toFixed(2)}</div>
            </div>
            <div className={`grid gap-4 ${!activeOrder ? 'grid-cols-2' : ''}`}>
              {!activeOrder && cart.length > 0 && (
                <button
                  onClick={handleKOT}
                  className="bg-navy hover:bg-navy/90 text-gold font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-navy/20"
                >
                  <Send size={18} /> Send KOT
                </button>
              )}
              {activeOrder && (
                <button
                  onClick={handleBillConfirm}
                  disabled={!allItemsServed || billingLoading}
                  className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95 shadow-lg ${
                    allItemsServed
                      ? 'bg-emerald-600 text-white shadow-emerald-500/30 hover:bg-emerald-700'
                      : 'bg-navy/10 text-navy/40'
                  }`}
                >
                  {billingLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : allItemsServed ? (
                    <Receipt size={18} />
                  ) : (
                    <Clock size={18} />
                  )}
                  {billingLoading ? 'Generating Bill...' : allItemsServed ? 'Bill & Vacant' : `Waiting... ${servedCount}/${totalCount} Served`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showConfirmBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 shadow-2xl text-center space-y-4">
            <Receipt size={40} className="mx-auto text-gold" />
            <h3 className="text-lg font-bold text-navy">Bill & Vacant Table</h3>
            <p className="text-sm text-navy/60">
              Generate bill for <strong>{member?.nameAsAadhaar || activeOrder?.member?.nameAsAadhaar || 'Guest'}</strong> and mark Table {id} as vacant?
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowConfirmBill(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-gray-200 transition-all">
                Cancel
              </button>
              <button onClick={handleBill} disabled={billingLoading} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                {billingLoading ? <Loader2 size={14} className="animate-spin" /> : null} Confirm & Vacant
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <ImmediateFeedbackModal
          onClose={() => {
            setShowFeedbackModal(false);
            router.push('/dashboard/restaurant');
          }}
          memberId={member?.id || activeOrder?.memberId}
          memberName={member?.nameAsAadhaar || activeOrder?.member?.nameAsAadhaar}
          department="RESTAURANT"
        />
      )}
    </div>
  );
}
