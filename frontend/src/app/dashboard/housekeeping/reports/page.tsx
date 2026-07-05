'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('daily');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { type };
      if (type !== 'daily') { params.startDate = startDate; params.endDate = endDate; }
      const res = await api.get('housekeeping/reports', { params });
      setReport(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [type, startDate, endDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportCSV = () => {
    if (!report) return;
    const rows = report.instances.map((i: any) => ({
      Task: i.task.name,
      Floor: i.floor,
      Area: i.area,
      Employee: i.employee.name,
      Status: i.status,
      'Started At': i.startedAt ? new Date(i.startedAt).toLocaleString() : '',
      'Completed At': i.completedAt ? new Date(i.completedAt).toLocaleString() : '',
      Remarks: i.remarks || '',
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((r: any) => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `housekeeping-report-${type}-${startDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Housekeeping Reports</h1>
          <p className="text-gray-500">Performance analytics and task reports</p>
        </div>
        {report && <button onClick={exportCSV} className="flex items-center gap-2 bg-navy text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-900"><Download size={16} /> Export CSV</button>}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-end gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-700">Report Type</label>
            <select className="mt-1 p-2.5 border rounded-lg text-sm" value={type} onChange={e => setType(e.target.value)}>
              <option value="daily">Daily Report</option>
              <option value="range">Date Range</option>
            </select>
          </div>
          {type !== 'daily' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <input type="date" className="mt-1 p-2.5 border rounded-lg text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">End Date</label>
                <input type="date" className="mt-1 p-2.5 border rounded-lg text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </>
          )}
          <button onClick={fetchReport} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700">Refresh</button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : !report ? (
          <div className="p-12 text-center text-gray-400">No data</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500">Total Tasks</p>
                <p className="text-2xl font-bold">{report.summary.total}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl">
                <p className="text-xs text-emerald-600">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">{report.summary.completed}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl">
                <p className="text-xs text-amber-600">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{report.summary.inProgress}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl">
                <p className="text-xs text-red-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{report.summary.overdue}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-xs text-blue-600">Completion Rate</p>
                <p className={`text-2xl font-bold ${report.summary.completionRate >= 95 ? 'text-emerald-600' : report.summary.completionRate >= 85 ? 'text-amber-600' : 'text-red-600'}`}>{report.summary.completionRate}%</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3">Floor Completion</h3>
              {report.floorReport.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={report.floorReport}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="floor" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" fill="#e5e7eb" name="Total" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-center py-4">No data</p>}
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3">Employee Performance</h3>
              {report.employeePerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr><th className="p-3 text-left">Employee</th><th className="p-3 text-center">Assigned</th><th className="p-3 text-center">Completed</th><th className="p-3 text-center">Missed</th><th className="p-3 text-center">Rate</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.employeePerformance.map((emp: any) => (
                        <tr key={emp.employeeId} className="hover:bg-gray-50">
                          <td className="p-3 font-medium">{emp.name}</td>
                          <td className="p-3 text-center">{emp.total}</td>
                          <td className="p-3 text-center text-emerald-600 font-semibold">{emp.completed}</td>
                          <td className="p-3 text-center text-red-600 font-semibold">{emp.missed}</td>
                          <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${emp.completionRate >= 95 ? 'bg-emerald-50 text-emerald-600' : emp.completionRate >= 85 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{emp.completionRate}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-gray-400 text-center py-4">No data</p>}
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3">Task Details ({report.instances.length})</h3>
              <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0">
                    <tr><th className="p-3 text-left">Task</th><th className="p-3 text-left">Floor</th><th className="p-3 text-left">Employee</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Completed</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.instances.map((i: any) => (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{i.task.name}</td>
                        <td className="p-3 text-gray-500">{i.floor}</td>
                        <td className="p-3">{i.employee.name}</td>
                        <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${i.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : i.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600' : i.status === 'OVERDUE' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>{i.status.replace('_', ' ')}</span></td>
                        <td className="p-3 text-xs text-gray-400">{i.completedAt ? new Date(i.completedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
