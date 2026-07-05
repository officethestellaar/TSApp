'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { HousekeepingTask } from '@/types';
import { Plus, Pencil, Trash2, Search, X, GripVertical } from 'lucide-react';
import ExportButton from '@/components/ui/ExportButton';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

const CATEGORIES = ['HIGH', 'MEDIUM', 'LOW'];
const FLOORS = [
  '', 'Ground', '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', 'Lift-1', 'Lift-2',
];

interface TaskRow {
  id: string;
  name: string;
  category: string;
  floor: string;
  description: string;
  isPeriodic: boolean;
  frequencyDays: number;
  isDeepClean: boolean;
}

const emptyRow = (): TaskRow => ({
  id: Math.random().toString(36).substr(2, 9),
  name: '',
  category: 'MEDIUM',
  floor: '',
  description: '',
  isPeriodic: false,
  frequencyDays: 7,
  isDeepClean: false,
});

export default function TasksPage() {
  const canCreateTasks = usePermission('housekeeping-tasks', 'create');
  const canUpdateTasks = usePermission('housekeeping-tasks', 'update');
  const canDeleteTasks = usePermission('housekeeping-tasks', 'delete');
  const canManageTasks = canCreateTasks || canUpdateTasks || canDeleteTasks;
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [rows, setRows] = useState<TaskRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('housekeeping/tasks').then(res => { setTasks(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = tasks.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) && t.isActive !== false);

  const addRow = () => setRows([...rows, emptyRow()]);
  const removeRow = (id: string) => setRows(rows.filter(r => r.id !== id));
  const updateRow = (id: string, field: keyof TaskRow, value: any) => setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));

  const openCreate = () => { setRows([emptyRow()]); setShowCreate(true); };

  const handleBulkSubmit = async () => {
    const valid = rows.filter(r => r.name.trim());
    if (valid.length === 0) return toast.error('Add at least one task with a name');
    setSubmitting(true);
    let created = 0;
    for (const row of valid) {
      try {
        const payload: any = { name: row.name, category: row.category, description: row.description || undefined, isPeriodic: row.isPeriodic, frequencyDays: row.isPeriodic ? row.frequencyDays : undefined, isDeepClean: row.isDeepClean };
        if (row.floor) payload.floor = row.floor;
        const res = await api.post('housekeeping/tasks', payload);
        setTasks(prev => [res.data, ...prev]);
        created++;
      } catch { /* skip failed */ }
    }
    toast.success(`${created} task${created !== 1 ? 's' : ''} created`);
    setSubmitting(false);
    setShowCreate(false);
  };

  const toggleActive = async (task: HousekeepingTask) => {
    try {
      const res = await api.patch(`housekeeping/tasks/${task.id}`, { isActive: !task.isActive });
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`housekeeping/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Master</h1>
          <p className="text-gray-500">Define and manage housekeeping tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="housekeeping-tasks"
            headers={['Name', 'Category', 'Floor', 'Description', 'Periodic', 'Active']}
            rows={filtered.map(t => [t.name, t.category, t.floor || 'All', t.description || '', t.isPeriodic ? 'Yes' : 'No', t.isActive !== false ? 'Yes' : 'No'])}
          />
          {canCreateTasks && (
            <button onClick={openCreate} className="flex items-center gap-2 bg-navy text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-900 transition-all">
              <Plus size={16} /> Create Tasks
            </button>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-lg">New Tasks</h2>
            <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-gray-200 rounded-lg"><X size={18} /></button>
          </div>

          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {rows.map((row, i) => (
              <div key={row.id} className="border rounded-xl p-4 bg-white space-y-3 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task {i + 1}</span>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(row.id)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><X size={15} /></button>
                  )}
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Task Name *</label>
                    <input type="text" value={row.name} onChange={e => updateRow(row.id, 'name', e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none mt-1" placeholder="e.g. Mop floors" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
                    <select value={row.category} onChange={e => updateRow(row.id, 'category', e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none mt-1">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Floor</label>
                    <select value={row.floor} onChange={e => updateRow(row.id, 'floor', e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none mt-1">
                      {FLOORS.map(f => <option key={f} value={f}>{f || 'All'}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 flex items-end gap-2 pb-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={row.isDeepClean} onChange={e => updateRow(row.id, 'isDeepClean', e.target.checked)} className="w-4 h-4" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deep</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={row.isPeriodic} onChange={e => updateRow(row.id, 'isPeriodic', e.target.checked)} className="w-4 h-4" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Repeat</span>
                    </label>
                  </div>
                  {row.isPeriodic && (
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Every (days)</label>
                      <input type="number" value={row.frequencyDays} onChange={e => updateRow(row.id, 'frequencyDays', Number(e.target.value))} min="1" className="w-full p-2 border rounded-lg text-sm outline-none mt-1" />
                    </div>
                  )}
                </div>
                <div>
                  <input type="text" value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none" placeholder="Description (optional)" />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <button onClick={addRow} className="flex items-center gap-1.5 text-sm font-bold text-navy hover:text-blue-700">
              <Plus size={15} /> Add Another Task
            </button>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-bold">Cancel</button>
              <button onClick={handleBulkSubmit} disabled={submitting} className="px-5 py-2 bg-navy text-white rounded-xl text-sm font-bold hover:bg-blue-900 disabled:opacity-50">
                {submitting ? 'Creating...' : `Create ${rows.filter(r => r.name.trim()).length || 0} Task${rows.filter(r => r.name.trim()).length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm outline-none" />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} tasks</span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No tasks found</div>
        ) : (
          <div className="divide-y">
            {filtered.map(task => (
              <div key={task.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{task.name}</span>
                    {task.floor && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">{task.floor}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      task.category === 'HIGH' ? 'bg-red-50 text-red-600' :
                      task.category === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                    }`}>{task.category}</span>
                    {task.isDeepClean && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-bold">Deep Clean</span>}
                    {task.isPeriodic && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">Every {task.frequencyDays}d</span>}
                    <button onClick={() => toggleActive(task)} className={`text-[10px] px-2 py-0.5 rounded font-bold ${task.isActive !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {task.isActive !== false ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  {task.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>}
                </div>
                {canManageTasks && (
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {canDeleteTasks && <button onClick={() => handleDelete(task.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
