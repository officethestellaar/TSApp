'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { History, Search, Shield, Clock, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { usePermission } from '@/hooks/usePermission';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import ExportButton from '@/components/ui/ExportButton';

interface AuditLog {
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

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canUpdateAudit = usePermission('audit-logs', 'update');
  const canDeleteAudit = usePermission('audit-logs', 'delete');
  const canManageAudit = isSuperAdmin || canUpdateAudit || canDeleteAudit;

  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editAction, setEditAction] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get('audit', {
        params: {
          search,
          entityType: entityFilter === 'ALL' ? undefined : entityFilter
        }
      });
      setLogs(response.data);
    } catch (err: any) {
      console.error('[AuditLogs] Fetch failure:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to load system logs');
    } finally {
      setLoading(false);
    }
  }, [search, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDeleteLog = async (id: number) => {
    if (!confirm('Delete this log? This cannot be undone.')) return;
    try {
      await api.delete(`audit/${id}`);
      toast.success('Log deleted');
      fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete log');
    }
  };

  const handleUpdateLog = async (id: number) => {
    try {
      await api.patch(`audit/${id}`, { action: editAction, description: editDesc });
      toast.success('Log updated');
      setEditingLogId(null);
      fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update log');
    }
  };

  const exportHeaders = useMemo(() => ['Action', 'Entity Type', 'Entity ID', 'Description', 'User', 'Role', 'Timestamp'], []);
  const exportRows = useMemo(() => logs.map(log => [
    log.action,
    log.entityType,
    log.entityId ?? '',
    log.description,
    log.userName,
    log.userRole,
    new Date(log.createdAt).toLocaleString(),
  ]), [logs]);

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('IMPORT')) return 'text-green-600 bg-green-50 border-green-100';
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (action.includes('DELETE') || action.includes('TERMINATE')) return 'text-red-600 bg-red-50 border-red-100';
    return 'text-navy/40 bg-gray-50 border-gray-100';
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500">See who did what and when</p>
        </div>
        <div className="bg-navy text-gold px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">
           Log Active
        </div>
      </header>

      {/* Filters */}
      <div className="glass-panel p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 justify-between items-center shadow-2xl shadow-navy/5">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/40 border border-navy/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-gold outline-none transition-all font-bold text-navy"
          />
        </div>
        <div className="flex gap-4">
          <select 
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-white/40 border border-navy/5 rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="ALL">All Entities</option>
            <option value="MEMBER">Members</option>
            <option value="ASSET">Assets</option>
            <option value="INVENTORY">Inventory</option>
            <option value="INVOICE">Treasury</option>
          </select>
          <ExportButton filename="audit-logs" headers={exportHeaders} rows={exportRows} />
          {isSuperAdmin && (
            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to clear ALL audit logs? This cannot be undone.')) return;
                try {
                  await api.delete('audit/clear/all');
                  toast.success('All audit logs cleared');
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

      {/* Logs Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-navy/[0.03] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy/[0.02] border-b border-navy/[0.05]">
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Date & Time</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Staff</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Action</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Description</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em] text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/[0.03]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center text-slate font-bold uppercase tracking-widest text-xs opacity-40">
                    No activity found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gold/[0.02] transition-colors group">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-navy/5 rounded-xl text-navy/40">
                           <Clock size={16} />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-navy">{format(new Date(log.createdAt), 'MMM dd, yyyy')}</p>
                           <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">{format(new Date(log.createdAt), 'HH:mm:ss')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-serif font-bold text-xs uppercase">
                            {log.userName.charAt(0)}
                         </div>
                         <div>
                            <p className="text-xs font-bold text-navy">{log.userName}</p>
                            <p className="text-[9px] font-black text-gold uppercase tracking-tighter">{log.userRole}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      {editingLogId === log.id ? (
                         <input 
                           value={editAction} 
                           onChange={e => setEditAction(e.target.value)} 
                           className="w-full p-2 text-xs border rounded outline-none"
                         />
                      ) : (
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getActionColor(log.action)}`}>
                           {log.action}
                         </span>
                      )}
                    </td>
                    <td className="px-10 py-7">
                      {editingLogId === log.id ? (
                         <input 
                           value={editDesc} 
                           onChange={e => setEditDesc(e.target.value)} 
                           className="w-full p-2 text-xs border rounded outline-none"
                         />
                      ) : (
                         <>
                           <p className="text-sm text-navy/60 font-medium line-clamp-1">{log.description}</p>
                           <p className="text-[8px] font-black text-slate/30 uppercase tracking-[0.2em] mt-1">{log.entityType}: {log.entityId || 'Global'}</p>
                         </>
                      )}
                    </td>
                    <td className="px-10 py-7 text-right">
                       <div className="flex justify-end gap-2">
                         {editingLogId === log.id ? (
                            <>
                              <button onClick={() => handleUpdateLog(log.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-xl">Save</button>
                              <button onClick={() => setEditingLogId(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                            </>
                         ) : (
                            <>
                              <button 
                                onClick={() => setSelectedLog(log)}
                                className="p-2.5 hover:bg-navy hover:text-gold rounded-xl text-navy/20 transition-all"
                              >
                                 <Eye size={18} />
                              </button>
                              {canManageAudit && (
                                <>
                                  {canUpdateAudit && (
                                    <button onClick={() => {
                                        setEditingLogId(log.id);
                                        setEditAction(log.action);
                                        setEditDesc(log.description);
                                      }} 
                                      className="p-2.5 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded-xl transition-all"
                                    >
                                      <Edit size={16} />
                                    </button>
                                  )}
                                  {canDeleteAudit && (
                                    <button onClick={() => handleDeleteLog(log.id)} className="p-2.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all">
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                         )}
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={() => setSelectedLog(null)}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold shadow-inner">
                       <Shield size={20} />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-navy">Log Entry #{selectedLog.id}</h3>
                 </div>
                 <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-navy/5 rounded-full transition-colors text-slate/40">
                    <History size={20} />
                 </button>
              </div>
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">Action</p>
                       <p className="text-sm font-bold text-navy">{selectedLog.action}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">Date & Time</p>
                       <p className="text-sm font-bold text-navy">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">Description</p>
                    <p className="text-sm text-navy/70 leading-relaxed font-medium">{selectedLog.description}</p>
                 </div>

                 {(selectedLog.oldData || selectedLog.newData) && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedLog.oldData && (
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Before</p>
                           <pre className="bg-red-50/50 border border-red-100 p-4 rounded-2xl text-[10px] text-navy font-mono overflow-auto max-h-40">
                              {JSON.stringify(JSON.parse(selectedLog.oldData), null, 2)}
                           </pre>
                        </div>
                      )}
                      {selectedLog.newData && (
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">After</p>
                           <pre className="bg-green-50/50 border border-green-100 p-4 rounded-2xl text-[10px] text-navy font-mono overflow-auto max-h-40">
                              {JSON.stringify(JSON.parse(selectedLog.newData), null, 2)}
                           </pre>
                        </div>
                      )}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
