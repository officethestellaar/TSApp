'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { Utensils, Clock, CheckCircle2, PlayCircle, ChefHat, Loader2, User, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
  quantity: number;
  notes: string | null;
  menuItem: {
    name: string;
  };
}

interface Order {
  id: number;
  orderNumber: string;
  paxCount: number;
  createdAt: string;
  table: {
    number: string;
  };
  member: {
    nameAsAadhaar: string;
  } | null;
  items: OrderItem[];
}

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchActiveOrders = useCallback(async () => {
    try {
      const response = await api.get('restaurant/kds/active');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch KDS orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveOrders();
  }, [fetchActiveOrders]);

  useEffect(() => {
    if (socket) {
      socket.on('new_kot', () => {
        fetchActiveOrders();
        toast('New Order Received!', { icon: '🍳' });
      });
      socket.on('table_cleared', () => {
        fetchActiveOrders();
      });
      return () => {
        socket.off('new_kot');
        socket.off('table_cleared');
      };
    }
  }, [socket, fetchActiveOrders]);

  const updateItemStatus = async (itemId: number, newStatus: string) => {
    try {
      await api.patch(`restaurant/item/${itemId}/status`, { status: newStatus });
      fetchActiveOrders();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const [billingOrderId, setBillingOrderId] = useState<number | null>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-red-50 text-red-600 border-red-100';
      case 'PREPARING': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'READY': return 'bg-green-50 text-green-600 border-green-100';
      case 'SERVED': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / 60000); // minutes
    return diff;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ChefHat className="text-navy" size={32} />
            Kitchen Display System
          </h1>
          <p className="text-gray-500">Live order tracking and fulfillment</p>
        </div>
        <div className="bg-navy text-gold px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-lg">
          Live Connection Active
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200">
          <Utensils size={64} className="text-gray-200 mb-6" />
          <p className="text-gray-500 font-medium">No active orders in the kitchen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[500px]">
              {/* Card Header */}
              <div className="p-4 bg-navy text-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Table {order.table.number}</h3>
                  <p className="text-[10px] text-gold/60 font-black uppercase tracking-widest">{order.orderNumber}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 ${
                  getTimeElapsed(order.createdAt) > 15 ? 'bg-red-500 animate-pulse' : 'bg-white/10'
                }`}>
                  <Clock size={12} />
                  {getTimeElapsed(order.createdAt)}m
                </div>
              </div>

              {/* Order Info */}
              <div className="px-4 py-2 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                  <User size={12} />
                  {order.member?.nameAsAadhaar || 'Guest'}
                </div>
                <div className="text-[10px] font-bold text-gray-400">
                  {order.paxCount} Pax
                </div>
              </div>

              {/* Item List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-navy text-gold text-[10px] font-black flex items-center justify-center shrink-0">
                            {item.quantity}
                          </span>
                          <span className={`font-bold text-sm ${item.status === 'READY' || item.status === 'SERVED' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {item.menuItem.name}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-red-500 font-bold mt-1 ml-8 italic">
                            * {item.notes}
                          </p>
                        )}
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${getStatusColor(item.status)}`}>
                        {item.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </div>
                    </div>
                    
                    <div className="ml-8 flex gap-2">
                      {item.status === 'PENDING' && (
                        <button 
                          onClick={() => updateItemStatus(item.id, 'PREPARING')}
                          className="flex items-center gap-1 text-[9px] font-black text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <PlayCircle size={10} /> START
                        </button>
                      )}
                      {(item.status === 'PREPARING' || item.status === 'PENDING') && (
                        <button 
                          onClick={() => updateItemStatus(item.id, 'READY')}
                          className="flex items-center gap-1 text-[9px] font-black text-green-600 hover:text-green-700 bg-green-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <CheckCircle2 size={10} /> FINISH
                        </button>
                      )}
                      {item.status === 'READY' && (
                        <button 
                          onClick={() => updateItemStatus(item.id, 'SERVED')}
                          className="flex items-center gap-1 text-[9px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <CheckCircle2 size={10} /> SERVE
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                {order.items.length > 0 && order.items.every(i => i.status === 'SERVED') ? (
                  <button 
                    onClick={async () => {
                      if (!confirm(`Generate bill for ${order.orderNumber} and release Table ${order.table.number}?`)) return;
                      setBillingLoading(true);
                      try {
                        const res = await api.post(`restaurant/order/${order.id}/bill`);
                        setInvoiceData(res.data);
                        setBillingOrderId(order.id);
                        toast.success('Bill generated! Table released.');
                        fetchActiveOrders();
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || 'Billing failed');
                      } finally {
                        setBillingLoading(false);
                      }
                    }}
                    disabled={billingLoading}
                    className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {billingLoading ? <Loader2 className="animate-spin" size={14} /> : <Receipt size={14} />}
                    {billingLoading ? 'Generating...' : 'Generate Bill & Release Table'}
                  </button>
                ) : (
                  <button 
                    onClick={async () => {
                      const allReady = order.items.every(i => i.status === 'READY' || i.status === 'SERVED');
                      if (!allReady) {
                        if (!confirm('Not all items are ready. Mark entire order as ready anyway?')) return;
                      }
                      try {
                        await api.patch(`restaurant/order/${order.id}/status`, { status: 'READY' });
                        toast.success(`Order ${order.orderNumber} is ready!`);
                        fetchActiveOrders();
                      } catch {
                        toast.error('Failed to update order');
                      }
                    }}
                    className="w-full bg-navy text-gold py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md"
                  >
                    Mark Order Ready
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Billing Success Modal */}
      {invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md mx-4 p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
              <Receipt size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-navy">Bill Generated</h2>
            <p className="text-sm text-slate/60 font-semibold">
              Order #{invoiceData.invoice?.invoiceNumber} created and table released.
            </p>
            {invoiceData.discountAbsolute > 0 && (
              <div className="bg-gold/10 rounded-xl px-4 py-3 text-sm font-bold text-navy">
                Discount Applied: ₹{Number(invoiceData.discountAbsolute).toLocaleString('en-IN')}
              </div>
            )}
            <div className="text-3xl font-serif font-bold text-navy">
              ₹{Number(invoiceData.invoice?.total).toLocaleString('en-IN')}
            </div>
            <button
              onClick={() => { setInvoiceData(null); setBillingOrderId(null); }}
              className="w-full px-6 py-3 bg-navy text-gold font-bold rounded-xl hover:bg-navy/90 transition-all text-xs uppercase tracking-wider"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
