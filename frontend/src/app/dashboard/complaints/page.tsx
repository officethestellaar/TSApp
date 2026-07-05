'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { MessageSquare, Clock, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { Complaint } from '@/types';
import ChatPanel from '@/components/concierge/ChatPanel';
import toast from 'react-hot-toast';
import ExportButton from '@/components/ui/ExportButton';

export const dynamic = 'force-dynamic';

export default function ComplaintsAdminPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchComplaints = useCallback(async () => {
    try {
      const response = await api.get('complaints');
      setComplaints(response.data);
    } catch {
      console.error('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`complaints/${id}/status`, { status });
      void fetchComplaints();
    } catch {
      toast.error('Failed to update status');
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return (
    <div className="p-0 -m-8 flex h-[calc(100vh-80px)] overflow-hidden bg-gray-50">
      <div className={`flex-1 overflow-y-auto p-8 transition-all duration-500 ${selectedComplaint ? 'mr-0' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Help Desk</h1>
              <p className="text-gray-500">Real-time resolution hub for The Stellaar members</p>
            </div>
            <ExportButton
              filename="complaints"
              headers={['Member', 'Subject', 'Category', 'Status', 'Priority', 'Created']}
              rows={complaints.map(c => [
                c.member?.nameAsAadhaar || '',
                c.subject,
                c.category,
                c.status,
                c.priority,
                new Date(c.createdAt).toLocaleString()
              ])}
            />
          </header>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-navy flex items-center gap-3">
                <MessageSquare size={16} className="text-gold" /> Active Conversations
              </h3>
              <div className="flex gap-4">
                 <div className="flex bg-white rounded-full p-1 border border-gray-100">
                    <button className="px-4 py-1.5 rounded-full bg-navy text-gold text-[9px] font-black uppercase tracking-widest">All</button>
                    <button className="px-4 py-1.5 rounded-full text-navy/40 text-[9px] font-black uppercase tracking-widest hover:text-navy">Open</button>
                 </div>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="p-20 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div></div>
              ) : complaints.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                   <div className="w-16 h-16 bg-navy/5 rounded-full flex items-center justify-center mx-auto text-navy/20"><MessageSquare size={32} /></div>
                   <p className="text-[10px] font-black text-slate/30 uppercase tracking-widest">No messages.</p>
                </div>
              ) : (
                complaints.map((c: Complaint) => (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-6 transition-all flex flex-col md:flex-row justify-between gap-6 cursor-pointer group ${
                      selectedComplaint?.id === c.id ? 'bg-navy/5 border-l-4 border-gold' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          c.priority === 'HIGH' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {c.priority} Priority
                        </span>
                        <span className="text-[10px] font-black text-slate/30 uppercase tracking-widest">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <h4 className="font-serif font-bold text-navy text-xl group-hover:text-gold transition-colors">{c.subject}</h4>
                      <div className="flex items-center gap-3 text-[10px] font-black text-navy/40 uppercase tracking-tighter">
                        <span className="text-navy">{c.member.nameAsAadhaar}</span>
                        <span className="w-1 h-1 rounded-full bg-slate/20"></span>
                        <span>{c.member.membershipNumber}</span>
                        <span className="w-1 h-1 rounded-full bg-slate/20"></span>
                        <span className="text-gold">{c.category}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-4 justify-center min-w-[200px]">
                      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        c.status === 'RESOLVED' ? 'bg-green-50 text-green-700 border-green-100' :
                        c.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                        {c.status === 'OPEN' && <AlertCircle size={14} />}
                        {c.status === 'IN_PROGRESS' && <Clock size={14} />}
                        {c.status === 'RESOLVED' && <CheckCircle size={14} />}
                        {c.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </div>
                      
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         {c.status !== 'RESOLVED' && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); updateStatus(c.id, 'RESOLVED'); }}
                             className="text-[9px] font-black uppercase tracking-widest bg-green-600 text-white px-4 py-2 rounded-full hover:bg-black transition-all"
                           >
                             Resolve
                           </button>
                         )}
                         <ChevronRight size={20} className="text-slate/20 group-hover:text-gold transition-all" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sidebar Overlay */}
      {selectedComplaint && (
        <div className="w-[450px] shrink-0 h-full border-l border-gray-100">
          <ChatPanel 
            complaint={selectedComplaint} 
            onClose={() => setSelectedComplaint(null)} 
          />
        </div>
      )}
    </div>
  );
}
