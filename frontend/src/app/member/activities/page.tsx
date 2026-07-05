'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Calendar, MapPin, Users, Clock, Sparkles, ArrowRight, Hourglass } from 'lucide-react';
import { Activity } from '@/types';
import toast from 'react-hot-toast';
import { useSocket } from '@/context/SocketContext';

export default function MemberActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [myReservations, setMyReservations] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchActivities = useCallback(async () => {
    try {
      const [activitiesRes, reservationsRes] = await Promise.all([
        api.get('activities'),
        api.get('activities/my-reservations')
      ]);
      setActivities(activitiesRes.data);
      setMyReservations(
        reservationsRes.data
          .filter((r: any) => r.status !== 'CANCELLED')
          .map((r: any) => r.activityId)
      );
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

  const handleReserve = async (activityId: number) => {
    try {
      const response = await api.post(`activities/${activityId}/reserve`, { paxCount: 1 });
      toast.success(response.data.message);
      fetchActivities();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reservation failed');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['MEMBER']}>
      <div className="max-w-6xl mx-auto px-6 pb-32 space-y-12">
        <div className="space-y-4 px-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gold/30 text-[9px] font-black uppercase tracking-[0.4em] text-gold mb-2 shadow-sm">
                <Sparkles size={12} />
                Activities
              </div>
              <h1 className="text-5xl font-serif font-bold text-navy tracking-tight">Activities</h1>
              <p className="text-slate/40 text-xs font-black uppercase tracking-[0.2em]">Upcoming Events</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
          ) : activities.length === 0 ? (
            <div className="bg-white rounded-[3.5rem] py-32 border border-slate/5 text-center shadow-xl shadow-navy/5">
              <p className="text-slate/40 font-bold uppercase tracking-widest text-[10px]">No activities found.</p>
            </div>
          ) : (
            activities.map((activity) => {
              const confirmed = activity._count?.reservations || 0;
              const isFull = confirmed >= activity.capacity;
              const isRegistered = myReservations.includes(activity.id);

              return (
                <div key={activity.id} className="bg-white rounded-[3.5rem] overflow-hidden border border-slate/5 shadow-2xl shadow-navy/5 group hover:border-gold/30 transition-all duration-500">
                  <div className="p-10 md:p-12 flex flex-col lg:flex-row gap-12">
                    <div className="flex-1 space-y-8">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-gold uppercase tracking-[0.4em]">{activity.category}</span>
                            {activity.status === 'LIVE' && (
                              <span className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase tracking-widest px-2 py-0.5 bg-red-50 rounded-full border border-red-100">
                                <div className="w-1 h-1 rounded-full bg-red-500 animate-ping"></div>
                                Live Session
                              </span>
                            )}
                          </div>
                          <h3 className="text-3xl font-serif font-bold text-navy tracking-tight group-hover:text-gold transition-colors duration-500">{activity.name}</h3>
                        </div>
                        {activity.status === 'COMPLETED' ? (
                          <div className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm bg-slate/5 text-slate/40 border-slate/10">
                            Completed
                          </div>
                        ) : (
                          <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${isFull ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                            {isFull ? 'Waitlist' : 'Available'}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-slate text-sm font-medium leading-relaxed max-w-2xl">{activity.description}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-slate/5">
                        <InfoItem icon={Clock} label="Time" value={new Date(activity.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                        <InfoItem icon={MapPin} label="Location" value={activity.location} />
                        <InfoItem icon={Users} label="Spots" value={`${confirmed} / ${activity.capacity} Members`} />
                        <InfoItem icon={Calendar} label="Date" value={new Date(activity.startTime).toLocaleDateString()} />
                      </div>

                      {activity.timer && <CountdownNode targetDate={activity.timer} />}
                    </div>

                    <div className="lg:w-64 flex flex-col justify-end">
                      {activity.status === 'COMPLETED' ? (
                        <div className="w-full py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] text-center border border-slate/10 text-slate/40 flex items-center justify-center gap-4 cursor-not-allowed">
                          Completed
                        </div>
                      ) : isRegistered ? (
                        <div className="w-full py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] text-center border border-green-200 text-green-600 bg-green-50 flex items-center justify-center gap-4">
                          <Sparkles size={16} /> Registered
                        </div>
                      ) : (
                        <button
                          onClick={() => handleReserve(activity.id)}
                          className={`w-full py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4 ${
                            isFull 
                              ? 'bg-navy text-gold hover:bg-navy/90' 
                              : 'bg-black text-gold hover:bg-navy'
                          }`}
                        >
                          {isFull ? 'Join Waitlist' : 'Reserve'}
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
   return (
      <div className="flex items-center gap-4">
         <div className="p-3 bg-gold/5 text-gold rounded-2xl border border-gold/10">
            <Icon size={18} />
         </div>
         <div>
            <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">{label}</p>
            <p className="text-xs font-black text-navy uppercase tracking-tighter">{value}</p>
         </div>
      </div>
   )
}

function CountdownNode({ targetDate }: { targetDate: string | Date }) {
   const [timeLeft, setTimeLeft] = useState('');

   useEffect(() => {
      const interval = setInterval(() => {
         const now = new Date().getTime();
         const target = new Date(targetDate).getTime();
         const diff = target - now;

         if (diff <= 0) {
            setTimeLeft('TIME EXPIRED');
            clearInterval(interval);
            return;
         }

         const hours = Math.floor(diff / (1000 * 60 * 60));
         const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
         const seconds = Math.floor((diff % (1000 * 60)) / 1000);

         setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);

      return () => clearInterval(interval);
   }, [targetDate]);

   return (
      <div className="inline-flex items-center gap-4 bg-navy text-gold px-8 py-4 rounded-2xl shadow-xl shadow-navy/20 border border-white/10 mt-6">
         <Hourglass size={20} className="animate-spin duration-[3s]" />
         <div>
             <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Time Remaining</p>
            <p className="font-mono text-xl font-bold tracking-widest">{timeLeft}</p>
         </div>
      </div>
   );
}
