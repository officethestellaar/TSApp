'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Package, Plus, Search, AlertCircle, TrendingDown, TrendingUp, History, ArrowRight, Loader2, Edit, Trash2 } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { usePermission } from '@/hooks/usePermission';
import toast from 'react-hot-toast';
import InventoryRegistrationModal from '@/components/inventory/InventoryRegistrationModal';
import UsageJournalModal from '@/components/inventory/UsageJournalModal';
import ExportButton from '@/components/ui/ExportButton';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  unitPrice: number;
  lastRestockedAt: string | null;
  _count: { logs: number };
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRestockModal, setShowRestockModal] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [restockAmount, setRestockAmount] = useState('');
  const { socket } = useSocket();
  const canCreateInventory = usePermission('inventory', 'create');
  const canUpdateInventory = usePermission('inventory', 'update');
  const canDeleteInventory = usePermission('inventory', 'delete');

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('inventory');
      setItems(response.data);
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Data Hydration
  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        console.log('Real-time signal received. Refreshing inventory...');
        fetchData();
      };

      socket.on('inventory_updated', handleUpdate);
      socket.on('low_stock_alert', handleUpdate);

      return () => {
        socket.off('inventory_updated', handleUpdate);
        socket.off('low_stock_alert', handleUpdate);
      };
    }
  }, [socket, fetchData]);

  const handleRestock = async () => {
    if (!showRestockModal || !restockAmount) return;
    try {
      await api.post(`inventory/${showRestockModal.id}/restock`, {
        quantity: Number(restockAmount)
      });
      toast.success(`${showRestockModal.name} restocked`);
      setShowRestockModal(null);
      setRestockAmount('');
      fetchData();
    } catch {
      toast.error('Restock failed');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`inventory/${id}`);
      toast.success('Item deleted');
      fetchData();
    } catch {
      toast.error('Delete failed. Check your permissions.');
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockItems = items.filter(item => item.currentStock <= item.minStockLevel);

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-gold" size={48} /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500">Track raw materials and manage restaurant stock levels</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            filename="inventory"
            headers={['Name', 'Category', 'Unit', 'Current Stock', 'Min Stock Level', 'Unit Price (₹)', 'Last Restocked']}
            rows={items.map(item => [item.name, item.category, item.unit, item.currentStock, item.minStockLevel, `₹${item.unitPrice}`, item.lastRestockedAt ? new Date(item.lastRestockedAt).toLocaleDateString() : 'N/A'])}
          />
          {canCreateInventory && (
            <button 
              onClick={() => {
                setEditingItem(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 bg-navy text-gold px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-navy/20"
            >
              <Plus size={16} />
              Add Item
            </button>
          )}
        </div>
      </header>

      {/* Alerts & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
             <Package size={120} className="text-navy" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-navy mb-6 flex items-center gap-3">
             <AlertCircle size={16} className="text-red-500" /> Critical Stock Alerts
          </h3>
          <div className="space-y-4">
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-gray-400 font-medium py-4">All stock levels are currently nominal.</p>
            ) : (
              lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-red-500 shadow-sm font-bold">
                        {item.currentStock}
                     </div>
                     <div>
                        <p className="font-bold text-navy">{item.name}</p>
                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Min Level: {item.minStockLevel} {item.unit}</p>
                     </div>
                  </div>
                   {canCreateInventory && (
                     <button 
                       onClick={() => setShowRestockModal(item)}
                       className="bg-white text-navy px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-navy hover:text-white transition-all"
                     >
                       Restock Now
                     </button>
                   )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-navy p-8 rounded-[2.5rem] shadow-2xl text-white space-y-6">
           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/60">Stock Overview</h3>
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                 <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Total Items</p>
                 <p className="text-3xl font-serif font-bold italic">{items.length}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Low Stock</p>
                 <p className="text-3xl font-serif font-bold text-red-400 italic">{lowStockItems.length}</p>
              </div>
           </div>
           <div className="pt-6 border-t border-white/5">
              <div className="flex justify-between items-end">
                 <div>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Total Value</p>
                    <p className="text-2xl font-bold">₹ {items.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0).toLocaleString()}</p>
                 </div>
                 <TrendingDown className="text-red-400/20" size={40} />
              </div>
           </div>
        </div>
      </div>

      {/* Main Registry */}
      <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-gold/20 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => setShowJournalModal(true)}
               className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-navy/40 hover:text-navy transition-all shadow-sm"
             >
                <History size={14} /> Usage Journals
             </button>
          </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-gray-50/30">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Item</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Stock</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Valuation</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Last Updated</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${item.currentStock <= item.minStockLevel ? 'bg-red-50 text-red-500' : 'bg-navy/5 text-navy group-hover:bg-gold/10 group-hover:text-gold'}`}>
                                <Package size={20} />
                             </div>
                             <div>
                                <p className="font-bold text-navy">{item.name}</p>
                                <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">Base Unit: {item.unit}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <span className="text-[10px] font-black text-navy px-3 py-1 bg-navy/5 rounded-full uppercase tracking-tighter">{item.category}</span>
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${item.currentStock <= item.minStockLevel ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                             <p className="font-bold text-navy">{item.currentStock} {item.unit}</p>
                          </div>
                       </td>
                       <td className="px-8 py-6 text-sm text-gray-600 font-medium">₹ {item.unitPrice}</td>
                       <td className="px-8 py-6 text-xs text-gray-400">
                          {item.lastRestockedAt ? new Date(item.lastRestockedAt).toLocaleDateString() : 'Initial Load'}
                       </td>
                       <td className="px-8 py-6 text-right">
                           <div className="flex items-center justify-end gap-2">
                             {canCreateInventory && (
                               <button 
                                 onClick={() => setShowRestockModal(item)}
                                 className="p-2.5 hover:bg-navy hover:text-gold rounded-xl text-navy/20 transition-all border border-transparent hover:border-navy/5 shadow-none hover:shadow-lg"
                                 title="Restock"
                               >
                                  <TrendingUp size={18} />
                               </button>
                             )}
                             {canUpdateInventory && (
                               <button 
                                 onClick={() => handleEdit(item)}
                                 className="p-2.5 hover:bg-white rounded-xl text-navy/20 hover:text-navy transition-all border border-transparent hover:border-gray-100"
                                 title="Edit Item"
                               >
                                  <Edit size={18} />
                               </button>
                             )}
                             {canDeleteInventory && (
                               <button 
                                 onClick={() => handleDelete(item.id, item.name)}
                                 className="p-2.5 hover:bg-red-50 rounded-xl text-navy/20 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                                 title="Delete Item"
                               >
                                  <Trash2 size={18} />
                               </button>
                             )}
                           </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      {/* Restock Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={() => setShowRestockModal(null)}></div>
           <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 text-center space-y-6">
                 <div className="w-20 h-20 bg-gold/10 rounded-[2rem] flex items-center justify-center mx-auto text-gold">
                    <TrendingUp size={40} />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-serif font-bold text-navy">Restock Inventory</h3>
                    <p className="text-xs text-gray-400 font-medium">Adding stock to <span className="text-navy font-bold">{showRestockModal.name}</span></p>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="relative">
                       <input 
                         type="number" 
                         value={restockAmount}
                         onChange={(e) => setRestockAmount(e.target.value)}
                         placeholder={`Amount in ${showRestockModal.unit}...`}
                         className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-gold transition-all text-center font-bold text-navy"
                       />
                    </div>
                    <button 
                      onClick={handleRestock}
                      className="w-full bg-navy text-gold py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                    >
                       Confirm Injection <ArrowRight size={16} />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showAddModal && (
        <InventoryRegistrationModal 
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }} 
          onSuccess={fetchData} 
          item={editingItem}
        />
      )}

      {showJournalModal && (
        <UsageJournalModal 
          onClose={() => setShowJournalModal(false)} 
        />
      )}
    </div>
  );
}
