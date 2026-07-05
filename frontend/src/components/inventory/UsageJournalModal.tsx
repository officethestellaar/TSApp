'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, History, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface UsageJournalModalProps {
  onClose: () => void;
}

export default function UsageJournalModal({ onClose }: UsageJournalModalProps) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('inventory/logs');
        setLogs(response.data);
      } catch {
        toast.error('Failed to load usage logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center text-navy shadow-inner">
                <History size={24} />
             </div>
             <div>
                <h3 className="text-xl font-serif font-bold text-navy">Item Usage Log</h3>
                <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">Item Consumption Logs</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-navy/5 rounded-full transition-colors text-slate/40">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
           {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={40} /></div>
           ) : logs.length === 0 ? (
             <p className="text-center py-20 text-gray-400">No usage recorded.</p>
           ) : (
             <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white transition-all">
                     <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${log.change > 0 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                           {log.change > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </div>
                        <div>
                           <p className="font-bold text-navy">{log.item.name}</p>
                           <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">{log.type} • {log.description || 'Routine'}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={`text-sm font-black ${log.change > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                           {log.change > 0 ? '+' : ''}{log.change} {log.item.unit}
                        </p>
                        <p className="text-[9px] font-bold text-slate/30 uppercase tracking-widest mt-1">
                           {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                        </p>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
