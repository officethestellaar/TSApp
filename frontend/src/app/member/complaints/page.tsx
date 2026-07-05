'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Complaint } from '@/types';
import ChatPanel from '@/components/concierge/ChatPanel';

export default function MemberComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'SERVICE',
    priority: 'LOW'
  });

  const fetchComplaints = useCallback(async () => {
    try {
      const response = await api.get('complaints');
      setComplaints(response.data);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('complaints', formData);
      toast.success('Request submitted successfully');
      setFormData({ subject: '', description: '', category: 'SERVICE', priority: 'LOW' });
      fetchComplaints();
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['MEMBER']}>
      <div className="max-w-6xl mx-auto px-6 pb-32 space-y-12">
        <div className="space-y-4 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gold/30 text-[9px] font-black uppercase tracking-[0.4em] text-gold mb-2 shadow-sm">
            <Sparkles size={12} className="text-gold" />
            Help Desk
          </div>
          <h1 className="text-5xl font-serif font-bold text-navy tracking-tight leading-none">Help Desk</h1>
          <p className="text-slate/40 text-xs font-black uppercase tracking-[0.2em]">Support Tickets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           {/* Left Column: Form */}
           <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-10 rounded-[3rem] border border-slate/5 shadow-2xl shadow-navy/5">
                <h2 className="text-xl font-serif font-bold text-navy mb-8 flex items-center gap-4">
                   <MessageSquare size={24} className="text-gold" />
                    New Request
                 </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate/40 uppercase tracking-[0.2em] ml-1">Subject</label>
                    <input
                      required
                      type="text"
                      placeholder="Subject..."
                      className="w-full bg-slate/5 border border-slate/10 rounded-2xl px-5 py-4 outline-none focus:border-gold transition-all font-bold text-navy placeholder:text-slate/20 text-sm"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate/40 uppercase tracking-[0.2em] ml-1">Category</label>
                    <select
                      className="w-full bg-slate/5 border border-slate/10 rounded-2xl px-5 py-4 outline-none focus:border-gold transition-all font-bold text-navy appearance-none cursor-pointer text-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="SERVICE">Club Service</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="BILLING">Billing</option>
                      <option value="FACILITY">Facilities</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate/40 uppercase tracking-[0.2em] ml-1">Description</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Details..."
                      className="w-full bg-slate/5 border border-slate/10 rounded-[1.5rem] px-5 py-4 outline-none focus:border-gold transition-all font-bold text-navy placeholder:text-slate/20 resize-none text-sm"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 group"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    <Send size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </div>
           </div>

           {/* Right Column: List */}
           <div className="lg:col-span-2 space-y-8">
              <h2 className="text-sm font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3 px-4">
                  <Clock size={18} className="text-gold" /> Request History
              </h2>
              
              <div className="space-y-6">
                {loading ? (
                  <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div></div>
                ) : complaints.length === 0 ? (
                  <div className="bg-white rounded-[3.5rem] py-24 border border-slate/5 text-center shadow-xl shadow-navy/5">
                    <p className="text-slate/40 font-bold uppercase tracking-widest text-[10px]">No messages found.</p>
                  </div>
                ) : (
                  complaints.map((item) => (
                    <div key={item.id} className="bg-white rounded-[2.5rem] p-10 border border-slate/5 shadow-2xl shadow-navy/5 space-y-6 group hover:border-gold/30 transition-all duration-500">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="flex items-center gap-8">
                          <div className={`w-16 h-16 rounded-[1.4rem] flex items-center justify-center shadow-inner transition-all duration-500 group-hover:scale-110 ${item.status === 'RESOLVED' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gold/5 text-gold border border-gold/10'}`}>
                            {item.status === 'RESOLVED' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-gold uppercase tracking-[0.4em] block">{item.category}</span>
                            <h3 className="text-2xl font-serif font-bold text-navy tracking-tight group-hover:text-gold transition-colors duration-500">{item.subject}</h3>
                            <p className="text-slate/40 font-bold text-[9px] uppercase tracking-widest pt-1 flex items-center gap-2">
                                <Clock size={12} /> Submitted: {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 mt-4 md:mt-0 w-full md:w-auto pt-6 md:pt-0 border-t md:border-t-0 border-slate/5">
                          <span className={`inline-flex items-center px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-xl transition-all duration-500 ${
                            item.status === 'RESOLVED' ? 'bg-green-50 text-green-700 border-green-200 group-hover:bg-green-100' : 'bg-gold/5 text-gold border border-gold/10'
                          }`}>
                            {item.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                          <button 
                            onClick={() => setSelectedComplaint(item as Complaint)}
                            className="text-[9px] font-black text-gold uppercase tracking-[0.4em] mt-2 flex items-center gap-2 hover:translate-x-1 transition-transform"
                          >
                            Open Chat <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 pt-6 border-t border-slate/5">
                         <p className="text-slate text-sm font-medium leading-relaxed italic">&ldquo;{item.description}&rdquo;</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Slide-over Chat Panel for Members */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-[120] flex justify-end">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setSelectedComplaint(null)}></div>
          <div className="relative w-full max-w-md h-full">
            <ChatPanel 
              complaint={selectedComplaint} 
              onClose={() => setSelectedComplaint(null)} 
            />
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
