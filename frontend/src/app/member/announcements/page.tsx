'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Bell, Clock, Info, AlertTriangle } from 'lucide-react';
import { Announcement } from '@/types';
import toast from 'react-hot-toast';

export default function MemberAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await api.get('announcements');
      // Filter for ALL or MEMBER target audience if needed, though backend should handle this
      setAnnouncements(response.data);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return <AlertTriangle size={20} className="text-red-500" />;
      case 'HIGH':
        return <Bell size={20} className="text-orange-500" />;
      default:
        return <Info size={20} className="text-gold" />;
    }
  };

  const getPriorityClasses = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-navy/5 text-navy border-navy/10';
    }
  };

  return (
    <ProtectedRoute allowedRoles={['MEMBER']}>
      <div className="max-w-4xl mx-auto px-6 pb-32 space-y-12">
        <div className="space-y-4 px-4">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gold/30 text-[9px] font-black uppercase tracking-[0.4em] text-gold mb-2 shadow-sm">
             <Bell size={12} />
              Notifications
            </div>
            <h1 className="text-5xl font-serif font-bold text-navy tracking-tight">Announcements</h1>
            <p className="text-slate/40 text-xs font-black uppercase tracking-[0.2em]">Latest Updates</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-[3.5rem] p-32 border border-slate/5 text-center shadow-xl shadow-navy/5 flex flex-col items-center gap-8">
              <div className="p-8 bg-gold/5 rounded-full border border-gold/10 text-gold/20">
                 <Bell size={80} />
              </div>
              <p className="text-slate/40 font-bold uppercase tracking-widest text-[10px]">No announcements yet.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="bg-white rounded-[3rem] p-10 border border-slate/5 shadow-xl hover:shadow-2xl hover:border-gold/30 transition-all duration-500 group relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-2 h-full ${
                  ann.priority === 'URGENT' ? 'bg-red-500' : 
                  ann.priority === 'HIGH' ? 'bg-orange-500' : 'bg-gold'
                }`}></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 pl-4">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      {getPriorityIcon(ann.priority)}
                      <h3 className="text-2xl font-serif font-bold text-navy group-hover:text-gold transition-colors duration-500">
                        {ann.title}
                      </h3>
                      {ann.priority && ann.priority !== 'NORMAL' && (
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] border shadow-sm ${getPriorityClasses(ann.priority)}`}>
                          {ann.priority}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate/70 leading-relaxed font-medium">
                      {ann.content}
                    </p>
                    
                    <div className="flex items-center gap-4 text-slate/40 font-bold text-[9px] uppercase tracking-widest pt-2">
                       <span className="flex items-center gap-2 bg-slate/5 px-3 py-1.5 rounded-lg border border-slate/10">
                         <Clock size={12} className="text-gold" /> 
                          Posted: {new Date(ann.createdAt).toLocaleString(undefined, {
                           year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                         })}
                       </span>
                       <span className="flex items-center gap-2">
                         By {ann.createdBy?.name || 'Club Administration'}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
