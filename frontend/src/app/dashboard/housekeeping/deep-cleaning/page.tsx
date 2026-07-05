'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { HousekeepingDeepCleaning } from '@/types';
import { Plus } from 'lucide-react';
import ExportButton from '@/components/ui/ExportButton';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

const FLOORS = ['1st - Gym', '2nd - Salon', '3rd - Salon', '5th - Pool', '6th - Banquet & Restaurant', '7th - Terrace Restaurant', '8th - Terrace Restaurant', '9th - Premium Lounge'];

const WEEKLY_SCHEDULE: Record<string, string> = {
  'Monday': '1st - Gym',
  'Tuesday': '2nd - Salon',
  'Wednesday': '3rd - Salon',
  'Thursday': '5th - Pool',
  'Friday': '6th - Banquet & Restaurant',
  'Saturday': '7th - Terrace Restaurant',
  'Sunday': '9th - Premium Lounge',
};

export default function DeepCleaningPage() {
  const canCreateDeepCleaning = usePermission('housekeeping-deep-cleaning', 'create');
  const canUpdateDeepCleaning = usePermission('housekeeping-deep-cleaning', 'update');
  const [records, setRecords] = useState<HousekeepingDeepCleaning[]>([]);
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [form, setForm] = useState({ floor: WEEKLY_SCHEDULE[today] || FLOORS[0], date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', assignedTo: [] as string[] });

  useEffect(() => {
    Promise.all([
      api.get('housekeeping/deep-cleaning'),
      api.get('housekeeping/employees'),
    ]).then(([r, e]) => {
      setRecords(r.data);
      setEmployees(e.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('housekeeping/deep-cleaning', { ...form, assignedTo: form.assignedTo });
      setRecords(prev => [res.data, ...prev]);
      setShowModal(false);
      toast.success('Deep cleaning scheduled');
    } catch { toast.error('Failed to schedule'); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await api.patch(`housekeeping/deep-cleaning/${id}`, { status });
      setRecords(prev => prev.map(r => r.id === id ? res.data : r));
      toast.success(`Status: ${status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`);
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deep Cleaning</h1>
          <p className="text-gray-500">Schedule and track deep cleaning operations</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="deep-cleaning"
            headers={['Floor', 'Date', 'Time', 'Assigned Employees', 'Status']}
            rows={records.map(r => {
              const assigned = r.assignedTo ? (() => { try { return JSON.parse(r.assignedTo); } catch { return []; } })() : [];
              return [r.floor, new Date(r.date).toLocaleDateString(), `${r.startTime || ''} - ${r.endTime || ''}`, (assigned as string[]).join(', '), r.status];
            })}
          />
          {canCreateDeepCleaning && (
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-navy text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-900 transition-all">
              <Plus size={16} /> Schedule
            </button>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-amber-800">Today's Schedule: {today}</p>
        <p className="text-amber-700">Recommended floor: <strong>{WEEKLY_SCHEDULE[today] || 'None'}</strong></p>
        <p className="text-xs text-amber-600 mt-1">4th (Electrical) & 8th (Terrace) on monthly rotation</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No deep cleaning records</div>
        ) : (
          <div className="divide-y">
            {records.map(record => {
              const assigned = record.assignedTo ? JSON.parse(record.assignedTo) : [];
              return (
                <div key={record.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{record.floor}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          record.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                          record.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                        }`}>{record.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{new Date(record.date).toLocaleDateString()}</span>
                        {record.startTime && <span>{record.startTime} - {record.endTime}</span>}
                        {assigned.length > 0 && <span>Team: {assigned.join(', ')}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {record.status === 'PENDING' && canUpdateDeepCleaning && <button onClick={() => updateStatus(record.id, 'IN_PROGRESS')} className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-amber-700">Start</button>}
                      {record.status === 'IN_PROGRESS' && canUpdateDeepCleaning && <button onClick={() => updateStatus(record.id, 'COMPLETED')} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700">Complete</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Schedule Deep Cleaning</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Floor *</label>
                <select className="w-full p-2.5 border rounded-lg text-sm outline-none" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })}>
                  {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <input type="date" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Start</label>
                  <input type="time" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End</label>
                  <input type="time" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Assign Team</label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.assignedTo.includes(emp.name)} onChange={e => {
                        if (e.target.checked) setForm({ ...form, assignedTo: [...form.assignedTo, emp.name] });
                        else setForm({ ...form, assignedTo: form.assignedTo.filter(n => n !== emp.name) });
                      }} className="w-4 h-4" />
                      {emp.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-navy text-white rounded-xl text-sm font-bold hover:bg-blue-900">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
