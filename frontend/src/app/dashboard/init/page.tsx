'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ShieldAlert, CheckCircle2, AlertTriangle, Loader2, Activity, Database, Server, FileCode, RefreshCw, Archive, PlayCircle, Lock, Unlock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SystemInitPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [systemLocked, setSystemLocked] = useState(false);
  const [locking, setLocking] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [recovering, setRecovering] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      const res = await api.get('init/backups');
      setBackups(res.data);
    } catch (err) {
      console.error('Failed to fetch backups', err);
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('system/status');
        setSystemLocked(res.data.isLocked);
      } catch (err) {
        console.error('Failed to get system status', err);
      }
    };
    checkStatus();
    fetchBackups();
  }, []);

  const createManualBackup = async () => {
    setLoading(true);
    try {
      await api.post('init/backup');
      toast.success('Backup Saved');
      fetchBackups();
    } catch {
      toast.error('Backup Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (filename: string) => {
    if (!confirm(`You are about to clear all data and restore from ${filename}. This cannot be undone. Proceed?`)) return;
    
    setRecovering(filename);
    try {
      await api.post('init/recover', { filename });
      toast.success('System Restored Successfully');
      await runSuperCheck(); // Refresh stats
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Restore Failed');
    } finally {
      setRecovering(null);
    }
  };

  const toggleEmergencyLock = async () => {
    if (!systemLocked) {
      if (!confirm('Lock will freeze all sales and disconnect non-admin users. Proceed?')) return;
    }
    
    setLocking(true);
    try {
      if (systemLocked) {
        await api.post('system/unlock');
        toast.success('System Unlocked');
        setSystemLocked(false);
      } else {
        await api.post('system/lock', { reason: 'Manual Admin Lock Override' });
        toast.error('SYSTEM LOCKED');
        setSystemLocked(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lock Failed');
    } finally {
      setLocking(false);
    }
  };

  const runSuperCheck = async () => {
    setLoading(true);
    setReport(null);
    try {
      const response = await api.get('init/check');
      setReport(response.data);
      if (response.data.status === 'OPTIMAL') {
        toast.success('Everything Looks Good');
      } else {
        toast.error('System Issues Found');
      }
    } catch {
      toast.error('System Check Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReseed = async () => {
    if (!confirm('This will reload the sample data. Continue?')) return;
    setReseeding(true);
    try {
      await api.post('init/reseed');
      toast.success('Sample data reloaded');
    } catch {
      toast.error('Data Reset Failed');
    } finally {
      setReseeding(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear ALL business data? This will delete members, invoices, inventory, assets, logs, and all other data.\n\nUsers, roles, and permissions will be KEPT.\n\nThis CANNOT be undone!')) return;
    if (!confirm('FINAL WARNING: This action is irreversible. All data will be permanently deleted. Proceed?')) return;
    setClearing(true);
    try {
      const res = await api.delete('init/clear-all');
      toast.success(res.data.message);
      runSuperCheck();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  const handleManualBackup = async () => {
    setLoading(true);
    try {
      const response = await api.post('init/backup');
      toast.success(response.data.message);
      // Refresh report
      const refreshRes = await api.get('init/check');
      setReport(refreshRes.data);
    } catch {
      toast.error('Backup Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <header className="flex justify-between items-center">
        <div>
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-[9px] font-black uppercase tracking-[0.4em] text-red-600 mb-4">
             <ShieldAlert size={12} />
             Admin Access Only
           </div>
           <h1 className="text-5xl font-serif font-bold text-navy tracking-tight italic">System Tools</h1>
           <p className="text-slate/40 text-xs font-black uppercase tracking-[0.2em]">Admin Setup & Recovery</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={toggleEmergencyLock}
            disabled={locking}
            className={`px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50 ${systemLocked ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-600 text-white hover:bg-red-700 animate-pulse hover:animate-none'}`}
          >
            {locking ? <Loader2 className="animate-spin" size={18} /> : systemLocked ? <><Unlock size={18} /> Unlock</> : <><Lock size={18} /> LOCK SYSTEM</>}
          </button>
          <button 
            onClick={runSuperCheck}
            disabled={loading}
            className="bg-navy text-gold px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Activity size={18} /> Run System Check</>}
          </button>
        </div>
      </header>

      {!report && !loading && (
        <div className="bg-white rounded-[4rem] p-24 text-center border border-dashed border-slate/20 flex flex-col items-center gap-8 shadow-xl shadow-navy/5">
           <div className="p-10 bg-navy/5 rounded-full text-navy/10 animate-pulse">
              <Activity size={100} />
           </div>
           <p className="text-[10px] font-black text-slate/30 uppercase tracking-[0.5em]">Run System Check</p>
        </div>
      )}

      {/* Recovery & Snapshots Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-navy/[0.03]">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-8">
                  <Archive size={32} />
               </div>
               <h3 className="text-2xl font-serif font-bold text-navy mb-2">Backup Tool</h3>
               <p className="text-xs text-slate font-medium leading-relaxed mb-8">
                  The system automatically saves a backup every 30 minutes. You can also create a manual backup.
               </p>
               <button 
                  onClick={createManualBackup}
                  disabled={loading}
                  className="w-full py-4 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
               >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><RefreshCw size={16} /> Create Backup</>}
               </button>
            </div>
         </div>

         <div className="lg:col-span-2">
            <div className="bg-white rounded-[3rem] shadow-xl border border-navy/[0.03] overflow-hidden">
               <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-navy/40">Saved Backups</h3>
                  <span className="bg-navy/5 text-navy px-3 py-1 rounded-full text-[9px] font-black">{backups.length} Backups</span>
               </div>
               <div className="max-h-[500px] overflow-y-auto">
                  {backups.length === 0 ? (
                    <div className="p-20 text-center text-slate font-medium italic opacity-40">No backups found.</div>
                  ) : (
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-navy/[0.02] border-b border-navy/5">
                             <th className="px-8 py-4 text-[9px] font-black text-slate uppercase tracking-widest">File Name</th>
                             <th className="px-8 py-4 text-[9px] font-black text-slate uppercase tracking-widest">Date</th>
                             <th className="px-8 py-4 text-[9px] font-black text-slate uppercase tracking-widest">Size</th>
                             <th className="px-8 py-4 text-[9px] font-black text-slate uppercase tracking-widest text-right">Restore</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {backups.map(b => (
                            <tr key={b.filename} className="hover:bg-blue-50/30 transition-colors">
                               <td className="px-8 py-5 font-mono text-[10px] font-bold text-navy/60">{b.filename}</td>
                               <td className="px-8 py-5 text-xs font-bold text-slate">{new Date(b.timestamp).toLocaleString()}</td>
                               <td className="px-8 py-5 text-[10px] font-black text-navy/40 uppercase">{b.size}</td>
                               <td className="px-8 py-5 text-right">
                                  <button 
                                     onClick={() => handleRecover(b.filename)}
                                     disabled={recovering !== null}
                                     className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                                  >
                                     {recovering === b.filename ? 'Restoring...' : 'Restore'}
                                  </button>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                  )}
               </div>
            </div>
         </div>
      </div>

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {/* Summary Node */}
           <div className="lg:col-span-3">
              <div className={`p-8 rounded-[3rem] border-2 flex items-center justify-between shadow-2xl ${report.status === 'OPTIMAL' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                 <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl ${report.status === 'OPTIMAL' ? 'bg-green-600' : 'bg-red-600'} text-white shadow-xl`}>
                       {report.status === 'OPTIMAL' ? <CheckCircle2 size={32} /> : <ShieldAlert size={32} />}
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">System Status</p>
                       <h2 className="text-3xl font-serif font-bold italic tracking-tight">System Status: {report.status}</h2>
                    </div>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{report.timestamp}</p>
              </div>
           </div>

           {/* Issues Node */}
           {report.issues.length > 0 && (
             <div className="lg:col-span-3 bg-white p-10 rounded-[3rem] shadow-2xl border-l-8 border-red-500">
<h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                    <AlertTriangle size={16} /> Issues Found
                </h3>
                <div className="space-y-3">
                   {report.issues.map((issue: string, i: number) => (
                     <div key={i} className="flex gap-4 p-4 bg-red-50 rounded-2xl text-xs font-bold text-red-900/60 border border-red-100 italic">
                        <span>•</span>
                        <p>{issue}</p>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {/* Metrics Grid */}
           <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate/5 space-y-8">
<h3 className="text-[10px] font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                  <Database size={16} className="text-gold" /> Database
              </h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate/40 uppercase">Status</span>
                    <span className="font-black text-green-600 uppercase tracking-widest">{report.nodes.database.status}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate/40 uppercase">Latency</span>
                    <span className="font-black text-navy">{report.nodes.database.latency}</span>
                 </div>
                 <div className="pt-4 border-t border-slate/5 grid grid-cols-2 gap-4">
                    {Object.entries(report.nodes.database.registryCounts).map(([key, val]: any) => (
                      <div key={key}>
                         <p className="text-[8px] font-black text-slate/30 uppercase">{key}</p>
                         <p className="text-xl font-bold text-navy">{val}</p>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate/5 space-y-8">
<h3 className="text-[10px] font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                  <Server size={16} className="text-gold" /> System Resources
              </h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate/40 uppercase">Free Memory</span>
                    <span className="font-black text-navy">{report.nodes.system.memory.free}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate/40 uppercase">Platform</span>
                    <span className="font-black text-navy uppercase tracking-widest">{report.nodes.system.platform}</span>
                 </div>
                 <div className="pt-4 border-t border-slate/5">
                    <p className="text-[8px] font-black text-slate/30 uppercase mb-2">Upload Directories</p>
                    <div className="space-y-2">
                       {Object.entries(report.nodes.fileSystem).map(([dir, state]: any) => (
                         <div key={dir} className="flex justify-between text-[9px]">
                            <span className="font-mono text-slate/50">{dir}</span>
                            <span className="font-black text-navy uppercase">{state}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate/5 space-y-8 flex flex-col justify-between">
              <div className="space-y-8">
                 <h3 className="text-[10px] font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                    <FileCode size={16} className="text-gold" /> System Info
                 </h3>
                 <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate/40 uppercase">Environment</span>
                    <span className="font-black text-green-600 uppercase tracking-widest">{report.nodes.environment.status}</span>
                 </div>
              </div>
               <button 
                 onClick={handleReseed}
                 disabled={reseeding || loading}
                 className="w-full py-4 bg-navy/5 text-navy rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
               >
                  {reseeding ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Reload Sample Data
               </button>
               <button 
                 onClick={handleClearAll}
                 disabled={clearing || loading}
                 className="w-full py-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
               >
                  {clearing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Clear All Data
               </button>
           </div>

           {/* Backup Node Card */}
           <div className="lg:col-span-3 bg-navy p-10 rounded-[3rem] shadow-2xl text-white flex flex-col md:flex-row justify-between items-center gap-8 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                 <Archive size={150} />
              </div>
              <div className="flex items-center gap-8 relative z-10">
                 <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-gold shadow-inner border border-white/5">
                    <Archive size={32} />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-serif font-bold italic tracking-tight text-white">Backup: {report.nodes.backup.status}</h3>
                    {report.nodes.backup.lastSnapshot ? (
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        Last Backup: <span className="text-gold">{report.nodes.backup.lastSnapshot.filename}</span> ({report.nodes.backup.lastSnapshot.size})
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">No backups found.</p>
                    )}
                 </div>
              </div>
              <button 
                onClick={handleManualBackup}
                disabled={loading}
                className="bg-gold text-navy px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:bg-white transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50 relative z-10"
              >
                 {loading ? <Loader2 className="animate-spin" size={18} /> : <><PlayCircle size={18} /> Create Backup</>}
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
