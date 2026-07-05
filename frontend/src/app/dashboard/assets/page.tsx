'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { HardDrive, Plus, Search, AlertTriangle, Clock, Edit, ChevronRight, Trash2 } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import toast from 'react-hot-toast';
import AssetRegistrationModal from '@/components/assets/AssetRegistrationModal';
import ExportButton from '@/components/ui/ExportButton';

interface Asset {
  id: number;
  name: string;
  category: string;
  tagNumber: string;
  location: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'RETIRED';
  purchaseDate: string;
  purchaseCost: number;
  nextMaintenance: string | null;
  _count: { maintenanceLogs: number };
}

interface Stats {
  totalAssets: number;
  maintenanceCount: number;
  retiredCount: number;
  totalCost: number;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const canCreateAsset = usePermission('assets', 'create');
  const canUpdateAsset = usePermission('assets', 'update');
  const canDeleteAsset = usePermission('assets', 'delete');

  const fetchData = useCallback(async () => {
    try {
      const [assetsRes, statsRes] = await Promise.all([
        api.get('assets'),
        api.get('assets/stats')
      ]);
      setAssets(assetsRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load asset data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`assets/${id}`);
      toast.success('Asset deleted');
      fetchData();
    } catch {
      toast.error('Delete failed. Check your permissions.');
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase()) || 
                         asset.tagNumber.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || asset.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'bg-green-100 text-green-700';
      case 'MAINTENANCE': return 'bg-orange-100 text-orange-700';
      case 'RETIRED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-gray-500">Track and maintain club facilities and equipment</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            filename="assets"
            headers={['Name', 'Tag Number', 'Category', 'Location', 'Status', 'Next Service']}
            rows={assets.map(asset => [asset.name, asset.tagNumber, asset.category, asset.location, asset.status.replace(/_/g, ' '), asset.nextMaintenance ? new Date(asset.nextMaintenance).toLocaleDateString() : 'Not Scheduled'])}
          />
          {canCreateAsset && (
            <button 
              onClick={() => {
                setEditingAsset(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-navy text-gold px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-navy/20"
            >
              <Plus size={16} />
              Register New Asset
            </button>
          )}
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Assets</p>
          <p className="text-3xl font-bold text-navy">{stats?.totalAssets || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Under Maintenance</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-orange-600">{stats?.maintenanceCount || 0}</p>
            <AlertTriangle className="text-orange-400" size={20} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Operational Value</p>
          <p className="text-3xl font-bold text-green-600">₹ {(stats?.totalCost || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Retired</p>
          <p className="text-3xl font-bold text-gray-400">{stats?.retiredCount || 0}</p>
        </div>
      </div>

      {/* Filters & List */}
      <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or tag number..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-gold/20 outline-none"
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-50 border-none rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-gold/20"
            >
              <option value="ALL">All Categories</option>
              <option value="GYM">Gym Equipment</option>
              <option value="POOL">Pool Facilities</option>
              <option value="SPA">Spa & Salon</option>
              <option value="FURNITURE">Furniture</option>
              <option value="IT">IT & Electronics</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Details</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Service</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400 text-sm">No assets found matching your criteria.</td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center text-navy group-hover:bg-gold/10 group-hover:text-gold transition-colors">
                          <HardDrive size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{asset.name}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tag: {asset.tagNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-navy px-3 py-1 bg-navy/5 rounded-full">{asset.category}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-gray-600 font-medium">{asset.location}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getStatusStyle(asset.status)}`}>
                        {asset.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                        <Clock size={14} className="text-gray-400" />
                        {asset.nextMaintenance ? new Date(asset.nextMaintenance).toLocaleDateString() : 'Not Scheduled'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canDeleteAsset && (
                          <button 
                            onClick={() => handleDelete(asset.id, asset.name)}
                            className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                            title="Delete Asset"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {canUpdateAsset && (
                          <button 
                            onClick={() => handleEdit(asset)}
                            className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-navy transition-all border border-transparent hover:border-gray-100"
                            title="Edit Asset"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        <button className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-navy transition-all border border-transparent hover:border-gray-100">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AssetRegistrationModal 
          onClose={() => {
            setIsModalOpen(false);
            setEditingAsset(null);
          }} 
          onSuccess={fetchData} 
          asset={editingAsset}
        />
      )}
    </div>
  );
}
