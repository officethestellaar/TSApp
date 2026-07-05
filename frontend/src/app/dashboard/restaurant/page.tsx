'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Utensils, Users, ChefHat, Bell, CheckCircle, Settings, Plus, PlusCircle, Trash2, X, Loader2 } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface Table {
  id: number;
  number: string;
  capacity: number;
  floor: string;
  status: 'AVAILABLE' | 'OCCUPIED';
}

export default function TableSelectionPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [unverifiedOrders, setUnverifiedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTableModal, setShowTableModal] = useState(false);
  const [newTable, setNewTable] = useState({ number: '', capacity: '4', floor: 'Main Floor' });
  const [saving, setSaving] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'CLUB_MANAGER';

  const fetchTables = useCallback(async () => {
    try {
      const [tablesRes, unverifiedRes] = await Promise.all([
        api.get('restaurant/tables'),
        api.get('restaurant/unverified')
      ]);
      setTables(tablesRes.data);
      setUnverifiedOrders(unverifiedRes.data);
    } catch {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Real-time listener
  useEffect(() => {
    if (socket) {
      socket.on('new_kot', () => fetchTables());
      socket.on('table_cleared', () => fetchTables());
      return () => {
        socket.off('new_kot');
        socket.off('table_cleared');
      };
    }
  }, [socket, fetchTables]);

  const verifyOrder = async (id: number) => {
    try {
      await api.patch(`restaurant/order/${id}/verify`);
      fetchTables();
    } catch {
      console.error('Verification failed');
    }
  };

  const floors = Array.from(new Set(tables.map(t => t.floor || 'Main Floor'))).sort();

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Restaurant POS</h1>
            <p className="text-gray-500">Select a table to start an order or manage KOTs</p>
          </div>
          <div className="flex items-center gap-3">
            {canManage && (
              <>
                <Link
                  href="/dashboard/menu/restaurant"
                  className="flex items-center gap-2 bg-gold/10 text-gold border border-gold/20 px-4 py-3 rounded-xl font-bold text-xs hover:bg-gold/20 transition-all"
                >
                  <PlusCircle size={16} />
                  Manage Menu
                </Link>
                <button
                  onClick={() => setShowTableModal(true)}
                  className="flex items-center gap-2 bg-navy/5 text-navy border border-navy/10 px-4 py-3 rounded-xl font-bold text-xs hover:bg-navy/10 transition-all"
                >
                  <Settings size={16} />
                  Manage Tables
                </button>
              </>
            )}
            <Link 
              href="/dashboard/restaurant/kds"
              className="flex items-center gap-3 bg-navy text-gold px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-navy/20"
            >
              <ChefHat size={18} />
              Kitchen View (KDS)
            </Link>
          </div>
        </header>

        {unverifiedOrders.length > 0 && (
          <div className="mb-12 bg-orange-50 border border-orange-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2 mb-4">
              <Bell className="animate-pulse" size={20} /> Waiter Verification Queue (QR Orders)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unverifiedOrders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-navy">Table {order.table?.number}</span>
                    <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-bold uppercase tracking-widest">{order.orderNumber}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.quantity}x {item.menuItem?.name}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => verifyOrder(order.id)}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <CheckCircle size={16} /> Verify & Push to KDS
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-12">
            {floors.map(floor => (
              <div key={floor} className="space-y-6">
                <div className="border-b border-gray-200 pb-2">
                  <h2 className="text-xl font-serif font-bold text-navy">{floor}</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {tables.filter(t => (t.floor || 'Main Floor') === floor).map((table) => (
                    <Link
                      key={table.id}
                      href={`/dashboard/restaurant/table/${table.id}`}
                      className={`p-6 rounded-2xl shadow-sm border-2 transition-all flex flex-col items-center justify-center gap-3 ${
                        table.status === 'AVAILABLE'
                          ? 'bg-white border-gray-100 hover:border-blue-500'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        table.status === 'AVAILABLE' ? 'bg-gray-100 text-gray-500' : 'bg-blue-600 text-white'
                      }`}>
                        <Utensils size={24} />
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold text-lg text-gray-900">Table {table.number}</h3>
                        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                          <Users size={12} /> {table.capacity} Pax
                        </p>
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        table.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {table.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Tables Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 relative max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-navy">Manage Tables</h2>
              <button onClick={() => setShowTableModal(false)} className="text-navy/40 hover:text-navy transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Table */}
            <div className="bg-navy/[0.02] border border-navy/10 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-navy mb-3 flex items-center gap-2"><Plus size={16} /> Add Table</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  value={newTable.number}
                  onChange={e => setNewTable(p => ({ ...p, number: e.target.value }))}
                  placeholder="Number"
                  className="col-span-1 px-3 py-2 border border-navy/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
                <input
                  value={newTable.capacity}
                  onChange={e => setNewTable(p => ({ ...p, capacity: e.target.value }))}
                  placeholder="Capacity"
                  type="number"
                  min="1"
                  className="col-span-1 px-3 py-2 border border-navy/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
                <input
                  value={newTable.floor}
                  onChange={e => setNewTable(p => ({ ...p, floor: e.target.value }))}
                  placeholder="Floor"
                  className="col-span-1 px-3 py-2 border border-navy/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>
              <button
                onClick={async () => {
                  if (!newTable.number) return toast.error('Table number required.');
                  setSaving(true);
                  try {
                    await api.post('restaurant/tables', newTable);
                    toast.success('Table added');
                    setNewTable({ number: '', capacity: '4', floor: 'Main Floor' });
                    fetchTables();
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to add table');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="w-full py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                Add Table
              </button>
            </div>

            {/* Existing Tables */}
            <h3 className="text-sm font-bold text-navy mb-3">Existing Tables ({tables.length})</h3>
            <div className="space-y-2">
              {tables.map(table => (
                <div key={table.id} className="flex items-center justify-between bg-navy/[0.02] border border-navy/10 rounded-xl px-4 py-3">
                  <div>
                    <span className="font-bold text-navy">Table {table.number}</span>
                    <span className="text-xs text-navy/40 ml-2">{table.capacity} pax — {table.floor}</span>
                    <span className={`ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      table.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>{table.status}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete Table ${table.number}?`)) return;
                      try {
                        await api.delete(`restaurant/tables/${table.id}`);
                        toast.success(`Table ${table.number} deleted`);
                        fetchTables();
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || 'Failed to delete table');
                      }
                    }}
                    disabled={table.status === 'OCCUPIED'}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title={table.status === 'OCCUPIED' ? 'Table has active orders' : 'Delete table'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {tables.length === 0 && (
                <p className="text-sm text-navy/40 text-center py-8">No tables yet. Add one above.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
