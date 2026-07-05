'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { HousekeepingAllocation, HousekeepingTask } from '@/types';
import { Plus, Trash2, Wand2, RefreshCw } from 'lucide-react';
import ExportButton from '@/components/ui/ExportButton';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/context/AuthContext';

const FLOORS = [
  'Ground - Cafe & Reception',
  '1st - GYM', '2nd - Salon', '3rd - Multipurpose Hall',
  '4th - Electrical Room', '5th - Swimming Pool',
  '6th - Banquet & Restaurant', '7th - Terrace Restaurant',
  '8th - Terrace Restaurant & Balcony', '9th - Premium Lounge & Dining',
  'Lift-1 : Ground to 7th', 'Lift-2 : 7th to 9th',
];

const TEMPLATE_FLOORS = ['Ground', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', 'Lift-1', 'Lift-2'];

const SHIFTS = ['MORNING', 'EVENING', 'NIGHT'];

export default function AllocationsPage() {
  const canCreateAllocations = usePermission('housekeeping-allocations', 'create');
  const canDeleteAllocations = usePermission('housekeeping-allocations', 'delete');
  const [allocations, setAllocations] = useState<HousekeepingAllocation[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPeriodicalModal, setShowPeriodicalModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const emptyRow = () => ({ floor: FLOORS[0], area: '', customArea: '' });
  const [rows, setRows] = useState([emptyRow()]);
  const [shared, setShared] = useState({ employeeId: '', shift: 'MORNING' as string, date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', specification: '', taskIds: [] as number[] });
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const defaultTemplateForm = { employeeId: '', floors: ['2nd - Salon'], shift: 'MORNING', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', specification: '', selectedTemplateIds: [] as number[] };
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm);

  const defaultPeriodicalForm = { employeeId: '', shift: 'MORNING' as string, date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', specification: '', taskIds: [] as number[], selectedTemplateIds: [] as number[] };
  const [periodicalForm, setPeriodicalForm] = useState(defaultPeriodicalForm);
  const toggleTemplateId = (id: number) => {
    setPeriodicalForm(prev => ({
      ...prev,
      selectedTemplateIds: prev.selectedTemplateIds.includes(id) ? prev.selectedTemplateIds.filter(i => i !== id) : [...prev.selectedTemplateIds, id],
    }));
  };

  const getFrequencyGroups = () => {
    const map: Record<string, any[]> = {};
    for (const t of templates) {
      const key = t.frequency || 'OTHER';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return Object.entries(map);
  };

  const addRow = () => setRows([...rows, emptyRow()]);
  const removeRow = (index: number) => setRows(rows.filter((_, i) => i !== index));
  const updateRow = (index: number, field: string, value: string) => {
    const next = [...rows];
    (next[index] as any)[field] = value;
    setRows(next);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [a, t, e, tmpl] = await Promise.all([
        api.get('housekeeping/allocations', { params: { date: selectedDate } }),
        api.get('housekeeping/tasks'),
        api.get('housekeeping/employees'),
        api.get('housekeeping/floor-templates'),
      ]);
      setAllocations(a.data);
      setTasks(t.data);
      setEmployees(e.data);
      setTemplates(tmpl.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePeriodicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodicalForm.employeeId) return toast.error('Employee is required');
    if (periodicalForm.selectedTemplateIds.length === 0) return toast.error('Select at least one area');
    setSubmitting(true);
    try {
      const selected = templates.filter(t => periodicalForm.selectedTemplateIds.includes(t.id));
      const results = await Promise.all(selected.map(t =>
        api.post('housekeeping/allocations', {
          employeeId: Number(periodicalForm.employeeId),
          floor: t.floor,
          area: t.area,
          shift: periodicalForm.shift,
          date: periodicalForm.date,
          startTime: periodicalForm.startTime,
          endTime: periodicalForm.endTime,
          specification: periodicalForm.specification || undefined,
          taskIds: periodicalForm.taskIds,
        })
      ));
      setAllocations(prev => [...results.map(r => r.data), ...prev]);
      setShowPeriodicalModal(false);
      toast.success(`Created ${results.length} periodical allocation${results.length > 1 ? 's' : ''}`);
    } catch { toast.error('Failed to create periodical allocations'); }
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shared.employeeId) return toast.error('Employee is required');
    const items = rows.map(r => ({ floor: r.floor, area: r.area || r.customArea })).filter(r => r.area);
    if (items.length === 0) return toast.error('Add at least one area');
    setSubmitting(true);
    try {
      const results = await Promise.all(items.map(item =>
        api.post('housekeeping/allocations', { employeeId: Number(shared.employeeId), floor: item.floor, area: item.area, shift: shared.shift, date: shared.date, startTime: shared.startTime, endTime: shared.endTime, specification: shared.specification || undefined, taskIds: shared.taskIds })
      ));
      setAllocations(prev => [...results.map(r => r.data), ...prev]);
      setShowModal(false);
      toast.success(`Created ${results.length} allocation${results.length > 1 ? 's' : ''}`);
    } catch { toast.error('Failed to create allocations'); }
    setSubmitting(false);
  };

  const handleTemplateGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.employeeId) return toast.error('Select an employee');
    if (templateForm.floors.length === 0) return toast.error('Select at least one floor');
    if (templateForm.selectedTemplateIds.length === 0) return toast.error('Select at least one area');
    try {
      const res = await api.post('housekeeping/allocations/from-template', { ...templateForm, floors: templateForm.floors, employeeId: Number(templateForm.employeeId), templateIds: templateForm.selectedTemplateIds });
      setAllocations(prev => [...res.data, ...prev]);
      setShowTemplateModal(false);
      toast.success(`Created ${res.data.length} area allocations`);
    } catch { toast.error('Failed to generate'); }
  };

  const toggleFloor = (floor: string) => {
    setTemplateForm(prev => {
      const isAdding = !prev.floors.includes(floor);
      const newFloors = isAdding ? [...prev.floors, floor] : prev.floors.filter(f => f !== floor);
      const floorTemplateIds = templates.filter(t => t.floor === floor).map(t => t.id);
      const newSelected = isAdding
        ? [...new Set([...prev.selectedTemplateIds, ...floorTemplateIds])]
        : prev.selectedTemplateIds.filter(id => !floorTemplateIds.includes(id));
      return { ...prev, floors: newFloors, selectedTemplateIds: newSelected };
    });
  };

  const toggleTemplateSelection = (id: number) => {
    setTemplateForm(prev => ({
      ...prev,
      selectedTemplateIds: prev.selectedTemplateIds.includes(id)
        ? prev.selectedTemplateIds.filter(i => i !== id)
        : [...prev.selectedTemplateIds, id],
    }));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this allocation?')) return;
    try {
      await api.delete(`housekeeping/allocations/${id}`);
      setAllocations(prev => prev.filter(a => a.id !== id));
      toast.success('Allocation deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const filteredTasks = tasks.filter(t => !t.isDeepClean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Allocations</h1>
          <p className="text-gray-500">Assign floors, areas and tasks to housekeeping executives</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            filename="housekeeping-allocations"
            headers={['Employee', 'Floor', 'Area', 'Tasks', 'Shift', 'Date', 'Time']}
            rows={allocations.map(a => [
              a.employee.name,
              a.floor,
              a.area,
              a.instances.map(i => i.task.name).join('; '),
              a.shift,
              a.date,
              `${a.startTime || 'N/A'} - ${a.endTime || 'N/A'}`,
            ])}
          />
          {canCreateAllocations && (
            <>
              <button onClick={() => { setPeriodicalForm(defaultPeriodicalForm); setShowPeriodicalModal(true); }} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 transition-all">
                <RefreshCw size={16} /> Periodical
              </button>
              <button onClick={() => { setTemplateForm(defaultTemplateForm); setShowTemplateModal(true); }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all">
                <Wand2 size={16} /> From Floor Template
              </button>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-navy text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-900 transition-all">
                <Plus size={16} /> Manual Allocation
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <input type="date" className="p-2.5 border rounded-lg text-sm" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        <span className="text-xs text-gray-400">{allocations.length} allocations • {allocations.reduce((s, a) => s + a.instances.length, 0)} tasks</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : allocations.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No allocations for this date</div>
        ) : (
          <div className="divide-y">
            {allocations.map(allocation => (
              <div key={allocation.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{allocation.employee.name}</span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-sm font-medium">{allocation.floor}</span>
                      <span className="text-xs text-gray-400">- {allocation.area}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        allocation.shift === 'MORNING' ? 'bg-amber-50 text-amber-600' :
                        allocation.shift === 'EVENING' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      }`}>{allocation.shift}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{allocation.startTime || 'N/A'} - {allocation.endTime || 'N/A'}</span>
                      <span className="text-xs text-gray-400">{allocation.instances.length} tasks</span>
                      <span className="text-xs text-emerald-600 font-medium">{allocation.instances.filter(i => i.status === 'COMPLETED').length} done</span>
                      <span className="text-xs text-amber-600 font-medium">{allocation.instances.filter(i => i.status === 'IN_PROGRESS').length} active</span>
                    </div>
                    {allocation.specification && (
                      <p className="text-xs text-gray-500 italic mt-1">"{allocation.specification}"</p>
                    )}
                    {allocation.instances.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {allocation.instances.map(inst => (
                          <span key={inst.id} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            inst.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                            inst.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600' :
                            inst.status === 'OVERDUE' ? 'bg-red-50 text-red-600' :
                            'bg-gray-50 text-gray-400'
                          }`}>{inst.task.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {canDeleteAllocations && <button onClick={() => handleDelete(allocation.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">Manual Allocation</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset className="border border-gray-200 rounded-xl p-5 space-y-4">
                <legend className="text-xs font-bold text-gray-400 uppercase px-2">Details</legend>
                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Employee *</label>
                    <select className="w-full mt-1.5 p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" value={shared.employeeId} onChange={e => setShared({ ...shared, employeeId: e.target.value })} required>
                      <option value="">Select...</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Shift</label>
                    <select className="w-full mt-1.5 p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" value={shared.shift} onChange={e => setShared({ ...shared, shift: e.target.value })}>
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</label>
                    <input type="date" className="w-full mt-1.5 p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" value={shared.date} onChange={e => setShared({ ...shared, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Time</label>
                    <div className="mt-1.5 flex gap-2">
                      <input type="time" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" value={shared.startTime} onChange={e => setShared({ ...shared, startTime: e.target.value })} />
                      <span className="text-gray-300 self-center">–</span>
                      <input type="time" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" value={shared.endTime} onChange={e => setShared({ ...shared, endTime: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Specification</label>
                  <textarea className="w-full mt-1.5 p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" rows={1} placeholder="e.g. Use mild disinfectant on all surfaces" value={shared.specification} onChange={e => setShared({ ...shared, specification: e.target.value })} />
                </div>
              </fieldset>

              <fieldset className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Areas</span>
                  <button type="button" onClick={addRow} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-all">
                    <Plus size={13} /> Add Row
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {rows.map((row, i) => {
                    const floorKey = row.floor.split(' - ')[0].split(' : ')[0];
                    const floorTemplates = templates.filter(t => t.floor === floorKey);
                    return (
                      <div key={i} className="px-5 py-3 flex items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-400 w-5">{i + 1}.</span>
                        <div className="flex-1">
                          <select className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" value={row.floor} onChange={e => updateRow(i, 'floor', e.target.value)}>
                            {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          {floorTemplates.length > 0 ? (
                            <select className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" value={row.area} onChange={e => updateRow(i, 'area', e.target.value)}>
                              <option value="">Select area...</option>
                              {floorTemplates.map(t => <option key={t.id} value={t.area}>{t.area}</option>)}
                            </select>
                          ) : (
                            <input type="text" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" value={row.customArea} onChange={e => updateRow(i, 'customArea', e.target.value)} placeholder="Type area name" />
                          )}
                        </div>
                        {rows.length > 1 && (
                          <button type="button" onClick={() => removeRow(i)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="border border-gray-200 rounded-xl p-5">
                <legend className="text-xs font-bold text-gray-400 uppercase px-2">Tasks</legend>
                <div className="flex flex-wrap gap-2 mt-1">
                  {filteredTasks.length === 0 ? (
                    <p className="text-sm text-gray-400">No tasks available</p>
                  ) : (
                    filteredTasks.map(task => (
                      <label key={task.id} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-2 cursor-pointer transition-all text-xs font-semibold ${
                        shared.taskIds.includes(task.id)
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                        <input type="checkbox" checked={shared.taskIds.includes(task.id)} onChange={e => {
                          if (e.target.checked) setShared({ ...shared, taskIds: [...shared.taskIds, task.id] });
                          else setShared({ ...shared, taskIds: shared.taskIds.filter(id => id !== task.id) });
                        }} className="hidden" />
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border ${
                          shared.taskIds.includes(task.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {shared.taskIds.includes(task.id) && <span className="text-white text-[9px] font-bold">✓</span>}
                        </div>
                        {task.name}
                      </label>
                    ))
                  )}
                </div>
              </fieldset>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-blue-900 text-white rounded-xl text-sm font-bold hover:bg-blue-950 disabled:opacity-50 transition-all shadow-sm">
                  {submitting ? 'Creating...' : `Create (${rows.filter(r => r.area || r.customArea).length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPeriodicalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowPeriodicalModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><RefreshCw size={20} className="text-purple-600" /> Periodical Cleaning Service</h2>
            <form onSubmit={handlePeriodicalSubmit} className="space-y-5">
              <fieldset className="border border-gray-200 rounded-xl p-5 space-y-4">
                <legend className="text-xs font-bold text-gray-400 uppercase px-2">Schedule</legend>
                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Employee *</label>
                    <select className="w-full mt-1.5 p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100" value={periodicalForm.employeeId} onChange={e => setPeriodicalForm({ ...periodicalForm, employeeId: e.target.value })} required>
                      <option value="">Select...</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Shift</label>
                    <select className="w-full mt-1.5 p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100" value={periodicalForm.shift} onChange={e => setPeriodicalForm({ ...periodicalForm, shift: e.target.value })}>
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</label>
                    <input type="date" className="w-full mt-1.5 p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100" value={periodicalForm.date} onChange={e => setPeriodicalForm({ ...periodicalForm, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Time</label>
                    <div className="mt-1.5 flex gap-2">
                      <input type="time" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100" value={periodicalForm.startTime} onChange={e => setPeriodicalForm({ ...periodicalForm, startTime: e.target.value })} />
                      <span className="text-gray-300 self-center">–</span>
                      <input type="time" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100" value={periodicalForm.endTime} onChange={e => setPeriodicalForm({ ...periodicalForm, endTime: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Specification</label>
                  <textarea className="w-full mt-1.5 p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100" rows={1} placeholder="e.g. Follow standard operating procedure for this area" value={periodicalForm.specification} onChange={e => setPeriodicalForm({ ...periodicalForm, specification: e.target.value })} />
                </div>
              </fieldset>

              <fieldset className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-purple-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Areas by Frequency</span>
                  <span className="text-[10px] text-purple-500 font-semibold">{periodicalForm.selectedTemplateIds.length} selected</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {getFrequencyGroups().map(([freq, items]) => {
                    const freqLabel = freq.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                    const freqColor = freq === 'EVERY_2_HOURS' ? 'text-red-500' : freq === 'DAILY' ? 'text-orange-500' : freq === 'TWICE_DAILY' ? 'text-amber-500' : freq === 'MORNING_NIGHT' ? 'text-yellow-600' : freq === 'WEEKLY' ? 'text-blue-500' : 'text-gray-500';
                    return (
                      <div key={freq} className="px-5 py-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${freqColor}`}>{freqLabel}</span>
                          <span className="text-[10px] text-gray-400">({items.length})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {items.map(t => (
                            <label key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs ${
                              periodicalForm.selectedTemplateIds.includes(t.id) ? 'border-purple-400 bg-purple-50 text-purple-800' : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                            }`}>
                              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                                periodicalForm.selectedTemplateIds.includes(t.id) ? 'bg-purple-600 text-white' : 'bg-gray-200'
                              }`}>
                                {periodicalForm.selectedTemplateIds.includes(t.id) && <span className="text-[9px] font-bold">✓</span>}
                              </div>
                              <span><strong>{t.floor}</strong> — {t.area}</span>
                              <input type="checkbox" checked={periodicalForm.selectedTemplateIds.includes(t.id)} onChange={() => toggleTemplateId(t.id)} className="hidden" />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="border border-gray-200 rounded-xl p-5">
                <legend className="text-xs font-bold text-gray-400 uppercase px-2">Tasks</legend>
                <div className="flex flex-wrap gap-2 mt-1">
                  {filteredTasks.map(task => (
                    <label key={task.id} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-2 cursor-pointer transition-all text-xs font-semibold ${
                      periodicalForm.taskIds.includes(task.id)
                        ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                      <input type="checkbox" checked={periodicalForm.taskIds.includes(task.id)} onChange={e => {
                        if (e.target.checked) setPeriodicalForm({ ...periodicalForm, taskIds: [...periodicalForm.taskIds, task.id] });
                        else setPeriodicalForm({ ...periodicalForm, taskIds: periodicalForm.taskIds.filter(id => id !== task.id) });
                      }} className="hidden" />
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border ${
                        periodicalForm.taskIds.includes(task.id) ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                      }`}>
                        {periodicalForm.taskIds.includes(task.id) && <span className="text-white text-[9px] font-bold">✓</span>}
                      </div>
                      {task.name}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPeriodicalModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-purple-700 text-white rounded-xl text-sm font-bold hover:bg-purple-800 disabled:opacity-50 transition-all shadow-sm">
                  {submitting ? 'Creating...' : `Generate (${periodicalForm.selectedTemplateIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Generate from Floor Template</h2>
            <p className="text-sm text-gray-500 mb-4">Auto-create allocations for all areas of one or more floors based on the predefined checklists.</p>
            <form onSubmit={handleTemplateGenerate} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Employee *</label>
                <select className="w-full p-2.5 border rounded-lg text-sm outline-none" value={templateForm.employeeId} onChange={e => setTemplateForm({ ...templateForm, employeeId: e.target.value })} required>
                  <option value="">Select...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Floor</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {TEMPLATE_FLOORS.map(f => (
                    <label key={f} className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${
                      templateForm.floors.includes(f) ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                        templateForm.floors.includes(f) ? 'bg-emerald-600 text-white' : 'bg-gray-200'
                      }`}>
                        {templateForm.floors.includes(f) && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <span className="text-xs font-medium">{f}</span>
                      <input type="checkbox" checked={templateForm.floors.includes(f)} onChange={() => toggleFloor(f)} className="hidden" />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Specification of Cleaning</label>
                <textarea
                  className="w-full p-2.5 border rounded-lg text-sm outline-none mt-1"
                  rows={2}
                  placeholder="e.g. Use mild disinfectant on all surfaces, focus on high-touch areas"
                  value={templateForm.specification}
                  onChange={e => setTemplateForm({ ...templateForm, specification: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <input type="date" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={templateForm.date} onChange={e => setTemplateForm({ ...templateForm, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Start</label>
                  <input type="time" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={templateForm.startTime} onChange={e => setTemplateForm({ ...templateForm, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End</label>
                  <input type="time" className="w-full p-2.5 border rounded-lg text-sm outline-none" value={templateForm.endTime} onChange={e => setTemplateForm({ ...templateForm, endTime: e.target.value })} />
                </div>
              </div>
              {templateForm.floors.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm max-h-48 overflow-y-auto">
                  <p className="font-semibold text-blue-800 mb-1">
                    Areas to be created:
                    {isAdmin && <span className="font-normal text-blue-600 ml-1">(tap to exclude)</span>}
                  </p>
                  <div className="space-y-1">
                    {templates.filter(t => templateForm.floors.includes(t.floor)).map(t => {
                      const taskNames = JSON.parse(t.tasks);
                      const selected = templateForm.selectedTemplateIds.includes(t.id);
                      const item = (
                        <span>
                          <strong>{t.floor}</strong> — {t.area} ({t.frequency.replace(/_/g, ' ').toLowerCase()}) — {taskNames.length} tasks
                        </span>
                      );
                      if (isAdmin) {
                        return (
                          <label key={t.id} className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-all ${
                            selected ? 'bg-blue-100 text-blue-800' : 'bg-blue-50/50 text-blue-600/60'
                          }`}>
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                              selected ? 'bg-blue-600 text-white' : 'bg-blue-200'
                            }`}>
                              {selected && <span className="text-[9px] font-bold">✓</span>}
                            </div>
                            {item}
                            <input type="checkbox" checked={selected} onChange={() => toggleTemplateSelection(t.id)} className="hidden" />
                          </label>
                        );
                      }
                      return <div key={t.id} className={`text-xs px-2 py-1 rounded-md ${selected ? 'text-blue-800' : 'text-blue-600/60'}`}>{item}</div>;
                    })}
                  </div>
                  {isAdmin && (
                    <p className="text-[10px] text-blue-500 mt-2">{templateForm.selectedTemplateIds.length} of {templates.filter(t => templateForm.floors.includes(t.floor)).length} selected</p>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
