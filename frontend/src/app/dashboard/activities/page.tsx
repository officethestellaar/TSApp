'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Calendar, MapPin, Users, Clock, Plus, Edit, Trash2, Hourglass, Save, X, Sparkles } from 'lucide-react';
import { Activity } from '@/types';
import { usePermission } from '@/hooks/usePermission';
import toast from 'react-hot-toast';
import { useSocket } from '@/context/SocketContext';
import ExportButton from '@/components/ui/ExportButton';

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { socket } = useSocket();
  const canCreateActivity = usePermission('activities', 'create');
  const canUpdateActivity = usePermission('activities', 'update');
  const canDeleteActivity = usePermission('activities', 'delete');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    capacity: 20,
    startTime: '',
    endTime: '',
    category: 'GENERAL'
  });

  const fetchActivities = useCallback(async () => {
    try {
      const response = await api.get('activities');
      setActivities(response.data);
    } catch {
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (socket) {
      socket.on('activity_update', fetchActivities);
      return () => {
        socket.off('activity_update', fetchActivities);
      };
    }
  }, [socket, fetchActivities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`activities/${editingId}`, formData);
        toast.success('Event updated');
      } else {
        await api.post('activities', formData);
        toast.success('New activity added');
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchActivities();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this event?')) return;
    try {
      await api.delete(`activities/${id}`);
      toast.success('Event deleted');
      fetchActivities();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleSetTimer = useCallback(async (id: number) => {
    const defaultTime = new Date(Date.now() + 3600000).toISOString().replace('T', ' ').split('.')[0];
    const target = prompt('Enter target countdown time (YYYY-MM-DD HH:MM:SS):', defaultTime);
    if (!target) return;
    try {
      await api.patch(`activities/${id}/timer`, { targetTime: target, status: 'LIVE' });
      toast.success('Timer started');
      fetchActivities();
    } catch {
      toast.error('Failed to engage timer');
    }
  }, [fetchActivities]);

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto">
      <header className="flex justify-between items-end border-b border-navy/5 pb-8">
        <div>
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy text-gold text-[9px] font-black uppercase tracking-[0.4em] mb-4 shadow-xl shadow-navy/20">
             <Sparkles size={12} />
             Activities Management
           </div>
           <h1 className="text-4xl font-serif font-bold text-navy italic">Activities</h1>
           <p className="text-slate font-bold uppercase tracking-[0.3em] text-[10px] opacity-60 mt-2">Activity Management</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            filename="activities"
            headers={['Name', 'Location', 'Capacity', 'Date', 'Time', 'Category']}
            rows={activities.map(a => [
              a.name,
              a.location,
              String(a.capacity),
              new Date(a.startTime).toLocaleDateString(),
              new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              a.category
            ])}
          />
          {canCreateActivity && (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', description: '', location: '', capacity: 20, startTime: '', endTime: '', category: 'GENERAL' });
                setIsModalOpen(true);
              }}
              className="bg-black text-gold px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-navy transition-all active:scale-95 shadow-xl"
            >
              <Plus size={16} /> Add Activity
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="py-20 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div></div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-[3rem] py-32 border border-slate/5 text-center shadow-xl shadow-navy/5">
             <p className="text-slate/40 font-bold uppercase tracking-widest text-[10px]">No activities yet.</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="bg-white rounded-[2.5rem] p-8 border border-slate/5 shadow-xl shadow-navy/5 flex flex-col md:flex-row justify-between items-center group hover:border-gold/30 transition-all duration-500">
               <div className="flex items-center gap-8">
                  <div className="w-16 h-16 rounded-2xl bg-gold/5 flex items-center justify-center text-gold border border-gold/10">
                     <Calendar size={32} />
                  </div>
                  <div>
                     <span className="text-[9px] font-black text-gold uppercase tracking-[0.2em]">{activity.category}</span>
                     <h3 className="text-xl font-serif font-bold text-navy">{activity.name}</h3>
                     <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate/40">
                           <MapPin size={12} /> {activity.location}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate/40">
                           <Users size={12} /> {activity._count?.reservations || 0} / {activity.capacity} Enrolled
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-4 mt-6 md:mt-0">
                  {activity.timer ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-navy text-gold rounded-xl border border-white/10 font-mono text-xs font-bold">
                       <Hourglass size={14} className="animate-spin duration-[4s]" />
                       Timer Active
                    </div>
                  ) : (
                    <button onClick={() => handleSetTimer(activity.id)} className="p-3 hover:bg-gold/10 text-gold rounded-xl transition-all" title="Set Timer">
                       <Clock size={18} />
                    </button>
                  )}
                   {canUpdateActivity && (
                     <button 
                       onClick={() => {
                         setEditingId(activity.id);
                         setFormData({
                           name: activity.name,
                           description: activity.description,
                           location: activity.location,
                           capacity: activity.capacity,
                           startTime: new Date(activity.startTime).toISOString().slice(0, 16),
                           endTime: new Date(activity.endTime).toISOString().slice(0, 16),
                           category: activity.category
                         });
                         setIsModalOpen(true);
                       }}
                       className="p-3 hover:bg-blue-50 text-blue-400 rounded-xl transition-all"
                     >
                        <Edit size={18} />
                     </button>
                   )}
                   {canDeleteActivity && (
                     <button onClick={() => handleDelete(activity.id)} className="p-3 hover:bg-red-50 text-red-400 rounded-xl transition-all">
                        <Trash2 size={18} />
                     </button>
                   )}
               </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-md bg-navy/20">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/20">
             <div className="p-10 border-b border-slate/5 bg-slate/50 flex justify-between items-center">
                <h2 className="text-2xl font-serif font-bold text-navy italic">{editingId ? 'Edit Event' : 'Add New Activity'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-full transition-all text-slate/40"><X size={24} /></button>
             </div>
             <form onSubmit={handleSubmit} className="p-12 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                   <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate uppercase tracking-widest">Experience Title</label>
                      <input required className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate uppercase tracking-widest">Description</label>
                      <textarea required className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy focus:ring-2 ring-gold transition-all" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate uppercase tracking-widest">Venue</label>
                      <input required className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate uppercase tracking-widest">Capacity</label>
                      <input type="number" required className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy" value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate uppercase tracking-widest">Commencement</label>
                      <input type="datetime-local" required className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate uppercase tracking-widest">Termination</label>
                      <input type="datetime-local" required className="w-full p-4 bg-navy/5 border-none rounded-2xl font-bold text-navy" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                   </div>
                </div>
                <button type="submit" className="w-full py-5 gold-gradient text-navy font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-xl shadow-gold/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                   <Save size={18} /> {editingId ? 'Update' : 'Save'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
