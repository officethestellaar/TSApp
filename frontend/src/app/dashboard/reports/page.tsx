'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, Download, Loader2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ReportDetailModal from '@/components/reports/ReportDetailModal';
import HistoricalImportModal from '@/components/reports/HistoricalImportModal';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface Breakdown {
  total: number;
  RESTAURANT: number;
  AMC: number;
  MEMBERSHIP: number;
  SALON: number;
  GYM: number;
  OTHERS: number;
}

interface Stats {
  totalMembers: number;
  totalRevenue: number;
  today: Breakdown;
  yesterday: Breakdown;
}

interface ChartData {
  month: string;
  total: number;
  restaurant: number;
  membership: number;
  others: number;
}

interface DistributionData {
  name: string;
  value: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [distribution, setDistribution] = useState<DistributionData[]>([]);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [valuationData, setValuationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'FINANCE' | 'INVENTORY'>('FINANCE');
  const [selectedReport, setSelectedReport] = useState<'DAILY' | 'AMC' | 'GST' | 'TABLE' | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, revenueRes, distRes, consRes, valRes] = await Promise.all([
        api.get('reports/stats'),
        api.get('reports/revenue-chart'),
        api.get('reports/membership-distribution'),
        api.get('inventory/reports/consumption'),
        api.get('inventory/reports/valuation')
      ]);

      setStats(statsRes.data);
      setRevenueData(revenueRes.data);
      setDistribution(distRes.data);
      setConsumptionData(consRes.data);
      setValuationData(valRes.data);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
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
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-500">Comprehensive business intelligence for The Stellaar Club</p>
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-3 bg-white border border-navy/10 hover:border-gold text-navy px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-navy/5"
            >
              <TrendingUp size={16} className="text-green-500" />
              Import Node
            </button>
            <div className="flex bg-white rounded-full p-1 border border-gray-200 shadow-sm">
               <button 
                 onClick={() => setActiveTab('FINANCE')}
                 className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'FINANCE' ? 'bg-navy text-gold shadow-lg' : 'text-navy/40 hover:text-navy'}`}
               >
                 Financials
               </button>
               <button 
                 onClick={() => setActiveTab('INVENTORY')}
                 className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'INVENTORY' ? 'bg-navy text-gold shadow-lg' : 'text-navy/40 hover:text-navy'}`}
               >
                 Inventory
               </button>
            </div>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md"
            >
              <Download size={18} />
              Export PDF
            </button>
          </div>
        </header>

        {activeTab === 'FINANCE' ? (
          <>
            {/* Quick Stats: Yesterday vs Today */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-navy p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                  <TrendingUp size={120} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/60 mb-6">Yesterday vs Today (Collections)</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Yesterday</p>
                    <p className="text-3xl font-serif font-bold italic">₹ {(stats?.yesterday?.total || 0).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Today (Live)</p>
                    <p className="text-3xl font-serif font-bold text-gold italic">₹ {(stats?.today?.total || 0).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Today's Receipt Breakdown</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[9px] text-slate/40 uppercase tracking-widest">AMC Dues</p>
                      <p className="font-bold text-sm">₹ {(stats?.today?.AMC || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate/40 uppercase tracking-widest">Memberships</p>
                      <p className="font-bold text-sm">₹ {(stats?.today?.MEMBERSHIP || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate/40 uppercase tracking-widest">Restaurant</p>
                      <p className="font-bold text-sm">₹ {(stats?.today?.RESTAURANT || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate/40 uppercase tracking-widest">Salon</p>
                      <p className="font-bold text-sm">₹ {(stats?.today?.SALON || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate/40 uppercase tracking-widest">Gym</p>
                      <p className="font-bold text-sm">₹ {(stats?.today?.GYM || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Users size={28} /></div>
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate/40 mb-2">Total Registry Size</h3>
                  <p className="text-5xl font-serif font-bold text-navy">{stats?.totalMembers.toLocaleString() || 0}</p>
                </div>
                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate/40 mb-2">Lifetime Billed Revenue</h3>
                  <p className="text-3xl font-bold text-green-600">₹ {(stats?.totalRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">Monthly Revenue Growth</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(val) => `₹${val/1000}k`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                      />

                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="membership" name="Membership" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="restaurant" name="Restaurant" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="others" name="Others" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">Membership Distribution</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend iconType="circle" verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
               <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">Consumption Trends (Usage per Month)</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={consumptionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                        <Legend iconType="circle" />
                        {Object.keys(consumptionData[0] || {}).filter(k => k !== 'month').map((key, i) => (
                          <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">Valuation Breakdown</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={valuationData}
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {valuationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Value']} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </>
        )}

        {/* Operational Reports List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-xl text-gray-900">Standard Operational Reports</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-gray-100 border-t border-gray-100">
            <button 
              onClick={() => setSelectedReport('DAILY')}
              className="p-6 text-left hover:bg-gray-50 transition-all flex flex-col gap-2 group"
            >
              <h4 className="font-bold text-gray-800 group-hover:text-blue-600">Daily Sales Summary</h4>
              <p className="text-xs text-gray-500">Breakdown of all revenue generated in the last 24 hours.</p>
            </button>
            <button 
              onClick={() => setSelectedReport('AMC')}
              className="p-6 text-left hover:bg-gray-50 transition-all flex flex-col gap-2 group"
            >
              <h4 className="font-bold text-gray-800 group-hover:text-blue-600">AMC Defaulter List</h4>
              <p className="text-xs text-gray-500">List of members whose AMC is overdue for the current year.</p>
            </button>
            <button 
              onClick={() => setSelectedReport('TABLE')}
              className="p-6 text-left hover:bg-gray-50 transition-all flex flex-col gap-2 group"
            >
              <h4 className="font-bold text-gray-800 group-hover:text-blue-600">Table Turnaround Report</h4>
              <p className="text-xs text-gray-500">Efficiency metrics for restaurant table occupancy.</p>
            </button>
            <Link href="/dashboard/inventory" className="p-6 text-left hover:bg-gray-50 transition-all flex flex-col gap-2 group">
              <h4 className="font-bold text-gray-800 group-hover:text-blue-600">Inventory Usage (POS)</h4>
              <p className="text-xs text-gray-500">Estimated raw material consumption based on KOTs.</p>
            </Link>
            <button 
              onClick={() => setSelectedReport('GST')}
              className="p-6 text-left hover:bg-gray-50 transition-all flex flex-col gap-2 group"
            >
              <h4 className="font-bold text-gray-800 group-hover:text-blue-600">GST Filing Helper</h4>
              <p className="text-xs text-gray-500">Tax summary grouped by 5% and 18% categories.</p>
            </button>
            <Link href="/dashboard/access-logs" className="p-6 text-left hover:bg-gray-50 transition-all flex flex-col gap-2 group">
              <h4 className="font-bold text-gray-800 group-hover:text-blue-600">Audit Trail Log</h4>
              <p className="text-xs text-gray-500">Complete history of system changes and approvals.</p>
            </Link>
          </div>
        </div>
      </div>

      {selectedReport && (
        <ReportDetailModal 
          type={selectedReport} 
          onClose={() => setSelectedReport(null)} 
        />
      )}

      {isImportModalOpen && (
        <HistoricalImportModal 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={fetchData} 
        />
      )}
    </div>
  );
}
