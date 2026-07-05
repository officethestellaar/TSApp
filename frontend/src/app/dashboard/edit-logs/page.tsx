'use client';

import React, { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { History, Search, User, Clock, Eye, FileText, Filter, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/context/AuthContext';
import ExportButton from '@/components/ui/ExportButton';

interface EditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  oldData: string | null;
  newData: string | null;
  userName: string;
  userRole: string;
  createdAt: string;
}

const EDIT_ACTIONS = ['INVOICE_UPDATED', 'INVOICE_DELETED', 'INVOICE_GENERATED', 'PAYMENT_RECORDED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'CANCELLATION_REQUESTED', 'CANCELLATION_APPROVED', 'CANCELLATION_REJECTED', 'UPDATE', 'DELETE'];

export default function EditLogsPage() {
  const [logs, setLogs] = useState<EditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<EditLog | null>(null);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const fetchLogs = async () => {
    try {
      const res = await api.get('audit', { params: { limit: 200 } });
      const filtered = res.data.filter((l: EditLog) =>
        EDIT_ACTIONS.some(a => l.action.startsWith(a)) ||
        l.action.includes('UPDATE') ||
        l.action.includes('DELETE') ||
        l.action.includes('EDIT') ||
        l.action.includes('CANCEL')
      );
      setLogs(filtered);
    } catch {
      toast.error('Failed to load edit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  const filtered = logs.filter(l => {
    if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
    if (search && !l.userName.toLowerCase().includes(search.toLowerCase()) &&
        !l.description.toLowerCase().includes(search.toLowerCase()) &&
        !l.entityId?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportHeaders = useMemo(() => ['Action', 'Description', 'User', 'Role', 'Entity ID', 'Timestamp'], []);
  const exportRows = useMemo(() => filtered.map(log => [
    log.action,
    log.description,
    log.userName,
    log.userRole,
    log.entityId ?? '',
    new Date(log.createdAt).toLocaleString(),
  ]), [filtered]);

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('CANCEL')) return 'text-red-600 bg-red-50 border-red-100';
    if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('APPROVED') || action.includes('REJECTED')) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (action.includes('GENERATED') || action.includes('RECORDED')) return 'text-green-600 bg-green-50 border-green-100';
    return 'text-navy/40 bg-gray-50 border-gray-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Logs</h1>
          <p className="text-gray-500">Track who changed what and when</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <History size={16} />
          {filtered.length} entries
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by staff name or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold/40"
          >
            <option value="ALL">All Actions</option>
            {uniqueActions.map(a => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <ExportButton filename="edit-logs" headers={exportHeaders} rows={exportRows} />
          {isSuperAdmin && (
            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to clear ALL edit logs? This cannot be undone.')) return;
                try {
                  await api.delete('audit/clear/all');
                  toast.success('All edit logs cleared');
                  fetchLogs();
                } catch (err: any) {
                  toast.error(err.response?.data?.message || 'Failed to clear logs');
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center">
          <History size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-semibold">No edit logs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Staff</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">When</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-serif font-bold text-xs uppercase">
                          {log.userName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{log.userName}</p>
                          <p className="text-[9px] font-black text-gold uppercase tracking-tighter">{log.userRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 font-medium line-clamp-1">{log.description}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{log.entityType} {log.entityId ? `#${log.entityId}` : ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Clock size={12} />
                        {format(new Date(log.createdAt), 'MMM dd, h:mm a')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy">Edit #{selectedLog.id}</h3>
                  <p className="text-[10px] text-gray-400">{selectedLog.entityType} {selectedLog.entityId ? `#${selectedLog.entityId}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <History size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-serif font-bold">
                  {selectedLog.userName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-navy">{selectedLog.userName}</p>
                  <p className="text-[9px] font-black text-gold uppercase tracking-tighter">{selectedLog.userRole}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</p>
                  <p className="text-sm font-bold text-navy mt-1">{selectedLog.action.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Time</p>
                  <p className="text-sm font-bold text-navy mt-1">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</p>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">{selectedLog.description}</p>
              </div>
              {selectedLog.oldData && selectedLog.newData && (() => {
                const oldParsed = JSON.parse(selectedLog.oldData);
                const newParsed = JSON.parse(selectedLog.newData);
                const allKeys = [...new Set([...Object.keys(oldParsed), ...Object.keys(newParsed)])];
                const changes = allKeys.filter(k => JSON.stringify(oldParsed[k]) !== JSON.stringify(newParsed[k]));
                if (changes.length === 0) return null;
                return (
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Changes</p>
                    <div className="space-y-2">
                      {changes.map(k => (
                        <div key={k} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">{k}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-red-50 rounded-lg p-2.5 border border-red-100">
                              <p className="text-[8px] font-black text-red-400 uppercase tracking-wider mb-1">Before</p>
                              <p className="text-xs text-red-700 font-mono">{oldParsed[k] !== undefined ? String(oldParsed[k]) : <span className="text-red-300 italic">empty</span>}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                              <p className="text-[8px] font-black text-green-500 uppercase tracking-wider mb-1">After</p>
                              <p className="text-xs text-green-700 font-mono">{newParsed[k] !== undefined ? String(newParsed[k]) : <span className="text-green-300 italic">empty</span>}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {selectedLog.oldData && !selectedLog.newData && (
                <div>
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Deleted Data</p>
                  <pre className="bg-red-50 border border-red-100 p-4 rounded-2xl text-[10px] text-navy font-mono overflow-auto max-h-40">
                    {JSON.stringify(JSON.parse(selectedLog.oldData), null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.newData && !selectedLog.oldData && (
                <div>
                  <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-2">New Data</p>
                  <pre className="bg-green-50 border border-green-100 p-4 rounded-2xl text-[10px] text-navy font-mono overflow-auto max-h-40">
                    {JSON.stringify(JSON.parse(selectedLog.newData), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
