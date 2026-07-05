'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Calendar, MapPin, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Reservation } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function MemberReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = useCallback(async () => {
    try {
      const response = await api.get('activities/my-reservations');
      setReservations(response.data);
    } catch {
      toast.error('Failed to load your reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleCancelReservation = async (reservationId: number) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await api.patch(`activities/reservations/${reservationId}/cancel`);
      toast.success('Reservation cancelled successfully');
      fetchReservations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel reservation');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['MEMBER']}>
      <div className="max-w-6xl mx-auto px-6 pb-32 space-y-12">
        <div className="space-y-4 px-4">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gold/30 text-[9px] font-black uppercase tracking-[0.4em] text-gold mb-2 shadow-sm">
             <Calendar size={12} />
              Reservations
            </div>
            <h1 className="text-5xl font-serif font-bold text-navy tracking-tight">My Reservations</h1>
            <p className="text-slate/40 text-xs font-black uppercase tracking-[0.2em]">Your Bookings</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
          ) : reservations.length === 0 ? (
            <div className="bg-white rounded-[3.5rem] p-32 border border-slate/5 text-center shadow-xl shadow-navy/5 flex flex-col items-center gap-8">
              <div className="p-8 bg-gold/5 rounded-full border border-gold/10 text-gold/20">
                 <Calendar size={80} />
              </div>
              <p className="text-slate/40 font-bold uppercase tracking-widest text-[10px]">No past reservations found.</p>
              <Link href="/member/activities" className="bg-black text-gold px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 group">
                  Browse Activities
                 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ) : (
            reservations.map((res) => (
              <div key={res.id} className="bg-white rounded-[3rem] p-10 border border-slate/5 shadow-2xl shadow-navy/5 flex flex-col md:flex-row justify-between items-center group hover:border-gold/30 transition-all duration-500">
                <div className="flex items-center gap-10">
                  <div className={`w-20 h-20 rounded-[1.8rem] flex items-center justify-center shadow-inner transition-all duration-500 group-hover:scale-110 ${res.status === 'CONFIRMED' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gold/5 text-gold border border-gold/10'}`}>
                    {res.status === 'CONFIRMED' ? <CheckCircle size={36} /> : <AlertCircle size={36} />}
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-gold uppercase tracking-[0.4em] block">{res.activity.category}</span>
                    <h3 className="text-2xl font-serif font-bold text-navy leading-none group-hover:text-gold transition-colors duration-500">{res.activity.name}</h3>
                    <div className="flex items-center gap-5 text-slate/40 font-bold text-[10px] uppercase tracking-widest pt-1">
                       <span className="flex items-center gap-2 bg-slate/5 px-3 py-1 rounded-lg"><Clock size={12} className="text-gold" /> {new Date(res.activity.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       <span className="flex items-center gap-2 bg-slate/5 px-3 py-1 rounded-lg"><MapPin size={12} className="text-gold" /> {res.activity.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 mt-8 md:mt-0 w-full md:w-auto pt-8 md:pt-0 border-t md:border-t-0 border-slate/5">
                  <span className={`inline-flex items-center px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border shadow-xl transition-all duration-500 ${
                    res.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200 group-hover:bg-green-100' : 
                    res.status === 'CANCELLED' ? 'bg-slate/5 text-slate/40 border-slate/10' :
                    'bg-gold/5 text-gold border-gold/20'
                  }`}>
                    {res.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                  
                  {res.status !== 'CANCELLED' && (
                    <button 
                      onClick={() => handleCancelReservation(res.id)}
                      className="text-[9px] font-black uppercase tracking-[0.2em] text-slate/40 hover:text-red-500 transition-colors pt-2"
                    >
                      Request Cancellation
                    </button>
                  )}

                  <p className="text-[10px] text-slate/30 font-black uppercase tracking-widest mt-2">Booked: {new Date(res.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
