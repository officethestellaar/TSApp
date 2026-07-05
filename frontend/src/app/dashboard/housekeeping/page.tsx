'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { HousekeepingDashboard } from '@/types';
import { CheckCircle2, Clock, AlertTriangle, ListChecks, TrendingUp, AlertCircle, Database } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function HousekeepingPage() {
  const { user } = useAuth();
  const canManage = user && ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER'].includes(user.role);
  const [data, setData] = useState<HousekeepingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-tasks' | 'overdue'>(user?.role === 'HOUSEKEEPING_EXECUTIVE' ? 'my-tasks' : 'dashboard');
  const [myInstances, setMyInstances] = useState<any[]>([]);
  const [overdueList, setOverdueList] = useState<any[]>([]);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    try {
      const [dashRes, overdueRes] = await Promise.all([
        api.get('housekeeping/dashboard'),
        api.get('housekeeping/overdue'),
      ]);
      setData(dashRes.data);
      setOverdueList(overdueRes.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab !== 'my-tasks') return;
    api.get('housekeeping/instances').then(res => setMyInstances(res.data)).catch(() => {});
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'overdue') return;
    api.get('housekeeping/overdue').then(res => setOverdueList(res.data)).catch(() => {});
  }, [activeTab]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`housekeeping/instances/${id}`, { status });
      setMyInstances(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      toast.success(`Task ${status.toLowerCase()}`);
    } catch { toast.error('Failed to update'); }
  };

  const handleSeed = async () => {
    if (!confirm('This will seed all housekeeping data. Continue?')) return;
    setSeeding(true);
    try {
      await api.post('housekeeping/seed');
      toast.success('Housekeeping data seeded!');
      fetchData();
    } catch { toast.error('Seed failed'); }
    setSeeding(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div></div>;
  }

  const pieData = data ? [
    { name: 'Completed', value: data.completed },
    { name: 'In Progress', value: data.inProgress },
    { name: 'Pending', value: data.pending },
    { name: 'Overdue', value: data.overdue },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Housekeeping</h1>
          <p className="text-gray-500">Premium cleanliness management across all floors</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-purple-700 disabled:opacity-50">
              <Database size={14} /> {seeding ? 'Seeding...' : 'Seed Data'}
            </button>
          )}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-navy shadow-sm' : 'text-gray-400'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('my-tasks')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'my-tasks' ? 'bg-white text-navy shadow-sm' : 'text-gray-400'}`}>My Tasks</button>
            <button onClick={() => setActiveTab('overdue')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'overdue' ? 'bg-white text-navy shadow-sm' : 'text-gray-400'}`}>Overdue {overdueList.length > 0 && <span className="ml-1 text-red-500">({overdueList.length})</span>}</button>
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><ListChecks size={20} className="text-blue-600" /></div>
                <div><p className="text-xs text-gray-500 font-medium">Total</p><p className="text-xl font-bold">{data.total}</p></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 size={20} className="text-emerald-600" /></div>
                <div><p className="text-xs text-gray-500 font-medium">Completed</p><p className="text-xl font-bold text-emerald-600">{data.completed}</p></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg"><Clock size={20} className="text-amber-600" /></div>
                <div><p className="text-xs text-gray-500 font-medium">In Progress</p><p className="text-xl font-bold text-amber-600">{data.inProgress}</p></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg"><Clock size={20} className="text-gray-400" /></div>
                <div><p className="text-xs text-gray-500 font-medium">Pending</p><p className="text-xl font-bold">{data.pending}</p></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={20} className="text-red-600" /></div>
                <div><p className="text-xs text-gray-500 font-medium">Overdue</p><p className="text-xl font-bold text-red-600">{data.overdue}</p></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg"><TrendingUp size={20} className="text-purple-600" /></div>
                <div><p className="text-xs text-gray-500 font-medium">KPI</p><p className={`text-xl font-bold ${data.kpi >= 95 ? 'text-emerald-600' : data.kpi >= 85 ? 'text-amber-600' : 'text-red-600'}`}>{data.kpi}%</p></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Task Status Distribution</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-center py-12">No data</p>}
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Floor-wise Completion</h3>
              {data.floorCompletion.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.floorCompletion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="floor" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" fill="#e5e7eb" name="Total" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-center py-12">No data</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Employee Performance</h3>
              {data.employeePerformance.length > 0 ? (
                <div className="space-y-3">
                  {data.employeePerformance.map(emp => {
                    const pct = emp.total > 0 ? Math.round((emp.completed / emp.total) * 100) : 0;
                    return (
                      <div key={emp.employeeId}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{emp.name}</span>
                          <span className={`text-xs font-bold ${pct >= 95 ? 'text-emerald-600' : pct >= 85 ? 'text-amber-600' : 'text-red-600'}`}>{emp.completed}/{emp.total} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${pct >= 95 ? 'bg-emerald-500' : pct >= 85 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-400 text-center py-4">No data</p>}
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Overdue Tasks</h3>
                <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold">{overdueList.length} overdue</span>
              </div>
              {overdueList.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {overdueList.slice(0, 10).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg text-sm">
                      <div>
                        <p className="font-semibold text-red-800">{item.task}</p>
                        <p className="text-xs text-red-600">{item.floor} - {item.assignedTo}</p>
                      </div>
                      <span className="text-[10px] font-bold text-red-600">{item.overdueBy}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-center py-4">All tasks completed on time</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { href: '/dashboard/housekeeping/tasks', label: 'Manage Tasks', desc: 'Define cleaning tasks', color: 'border-l-blue-500' },
              { href: '/dashboard/housekeeping/allocations', label: 'Allocations', desc: 'Assign work to executives', color: 'border-l-emerald-500' },
              { href: '/dashboard/housekeeping/deep-cleaning', label: 'Deep Cleaning', desc: 'Track deep cleaning schedule', color: 'border-l-purple-500' },
              { href: '/dashboard/housekeeping/reports', label: 'Reports', desc: 'Performance & analytics', color: 'border-l-amber-500' },
            ].map(link => (
              <Link key={link.href} href={link.href} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 ${link.color} hover:shadow-md transition-all`}>
                <h3 className="font-bold text-gray-900">{link.label}</h3>
                <p className="text-xs text-gray-500">{link.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      {activeTab === 'my-tasks' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="font-bold text-lg">My Assigned Tasks</h3>
            <span className="text-xs text-gray-400">{myInstances.filter(i => i.status === 'PENDING').length} pending</span>
          </div>
          {myInstances.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No tasks assigned yet</div>
          ) : (
            <div className="divide-y">
              {[...myInstances].sort((a, b) => {
                const order: Record<string, number> = { PENDING: 0, IN_PROGRESS: 1, OVERDUE: 2, COMPLETED: 3, REASSIGNED: 4 };
                return (order[a.status] ?? 99) - (order[b.status] ?? 99);
              }).map(inst => (
                <div key={inst.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 ${inst.status === 'COMPLETED' ? 'opacity-60' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{inst.task.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        inst.priority === 'HIGH' ? 'bg-red-50 text-red-600' :
                        inst.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                      }`}>{inst.priority}</span>
                    </div>
                    <p className="text-xs text-gray-400">{inst.floor} - {inst.area}{inst.allocation?.startTime ? ` | ${inst.allocation.startTime} - ${inst.allocation.endTime || ''}` : inst.dueTime ? ` | Due: ${inst.dueTime}` : ''}</p>
                    {inst.remarks && <p className="text-xs text-gray-500 mt-1 italic">"{inst.remarks}"</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      inst.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                      inst.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                      inst.status === 'OVERDUE' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'
                    }`}>{inst.status.replace('_', ' ')}</span>
                    {inst.status === 'PENDING' && <button onClick={() => updateStatus(inst.id, 'COMPLETED')} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700">Mark as Complete</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'overdue' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="font-bold text-lg text-red-600 flex items-center gap-2"><AlertCircle size={20} /> Overdue Tasks</h3>
            <span className="text-xs text-gray-400">Sorted by priority</span>
          </div>
          {overdueList.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-gray-400 font-medium">All tasks completed on time</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-left">Task</th>
                    <th className="p-4 text-left">Floor</th>
                    <th className="p-4 text-left">Assigned To</th>
                    <th className="p-4 text-left">Due Time</th>
                    <th className="p-4 text-left">Overdue By</th>
                    <th className="p-4 text-left">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...overdueList].sort((a, b) => {
                    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                    return (order[a.priority as keyof typeof order] || 0) - (order[b.priority as keyof typeof order] || 0);
                  }).map(item => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${item.priority === 'HIGH' ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-semibold">{item.task}</td>
                      <td className="p-4 text-gray-500">{item.floor}</td>
                      <td className="p-4">{item.assignedTo}</td>
                      <td className="p-4 font-mono text-xs">{item.dueTime}</td>
                      <td className="p-4"><span className="text-red-600 font-bold">{item.overdueBy}</span></td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          item.priority === 'HIGH' ? 'bg-red-50 text-red-600' :
                          item.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                        }`}>{item.priority}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
