'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Utensils, Clock, Calendar, Users, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
}

export default function MemberRestaurantPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    date: '',
    time: '',
    paxCount: 2,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      const [menuRes, resRes] = await Promise.all([
        api.get('restaurant/menu'),
        api.get('restaurant/my-table-reservations')
      ]);
      setMenuItems(menuRes.data);
      setReservations(resRes.data);
    } catch {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleCancelTable = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this table request?')) return;
    try {
      await api.patch(`restaurant/table-reservation/${id}/cancel`);
      toast.success('Reservation request cancelled');
      fetchMenu();
    } catch {
      toast.error('Failed to cancel reservation');
    }
  };

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('restaurant/table-reservation', reservationForm);
      toast.success('Reservation requested successfully. Staff will confirm shortly.');
      setShowReservationModal(false);
      setReservationForm({ date: '', time: '', paxCount: 2, notes: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Array.from(new Set(menuItems.map(item => item.category)));

  return (
    <ProtectedRoute allowedRoles={['MEMBER']}>
      <div className="max-w-6xl mx-auto px-6 pb-32 space-y-12">
        <div className="space-y-4 px-4 flex flex-col md:flex-row justify-between items-start md:items-center">
           <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gold/30 text-[9px] font-black uppercase tracking-[0.4em] text-gold mb-2 shadow-sm">
                <Utensils size={12} />
                Menu
              </div>
              <h1 className="text-5xl font-serif font-bold text-navy tracking-tight">Restaurant</h1>
              <p className="text-slate/40 text-xs font-black uppercase tracking-[0.2em]">Menu & Reservations</p>
           </div>
           
           <button 
             onClick={() => setShowReservationModal(true)}
             className="mt-4 md:mt-0 px-6 py-3 bg-navy text-gold rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-2"
           >
             Request Table <ArrowRight size={14} />
           </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
        ) : (
          <div className="space-y-16">
            {/* Active Table Requests */}
            {reservations.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-sm font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3 px-4">
                   <Clock size={18} className="text-gold" /> Active Reservations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reservations.map((res) => (
                    <div key={res.id} className="bg-white rounded-[2rem] p-8 border border-slate/5 shadow-xl group relative overflow-hidden">
                      <div className="flex justify-between items-start mb-6">
                         <div className="space-y-1">
                             <p className="text-[8px] font-black text-gold uppercase tracking-[0.4em]">Reservation</p>
                            <h4 className="text-lg font-serif font-bold text-navy">{new Date(res.date).toLocaleDateString()} @ {res.time}</h4>
                         </div>
                         <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                           res.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                           res.status === 'CANCELLED' ? 'bg-slate/5 text-slate/40 border-slate/10' :
                           'bg-gold/5 text-gold border-gold/20'
                         }`}>
                           {res.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                         </span>
                      </div>
                      <div className="flex items-center gap-6 text-[10px] font-bold text-slate/40 uppercase tracking-widest">
                         <div className="flex items-center gap-2">
                            <Users size={12} className="text-gold" /> {res.paxCount} Guests
                         </div>
                      </div>
                      {res.status !== 'CANCELLED' && (
                        <button 
                          onClick={() => handleCancelTable(res.id)}
                          className="mt-6 text-[9px] font-black uppercase tracking-widest text-slate/30 hover:text-red-500 transition-colors"
                        >
                          Request Cancellation
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {menuItems.length === 0 ? (
              <div className="bg-white rounded-[3.5rem] py-32 border border-slate/5 text-center shadow-xl shadow-navy/5">
                <p className="text-slate/40 font-bold uppercase tracking-widest text-[10px]">No menu items found.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {categories.map((category) => (
                  <div key={category} className="space-y-6">
                    <h2 className="text-2xl font-serif font-bold text-navy border-b border-slate/10 pb-2">{category}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {menuItems.filter(item => item.category === category).map((item) => (
                        <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate/5 shadow-lg flex justify-between items-center group hover:border-gold/30 transition-all duration-300">
                          <div>
                            <h3 className="text-lg font-bold text-navy group-hover:text-gold transition-colors">{item.name}</h3>
                            <p className="text-xs font-black text-slate/40 uppercase tracking-widest mt-1">₹ {item.price}</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-slate/5 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                            <Utensils size={16} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showReservationModal && (
          <div className="fixed inset-0 bg-navy/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-3xl font-serif font-bold text-navy mb-2">Table Reservation</h2>
              <p className="text-xs text-slate/50 font-medium mb-8">Request a table at the restaurant.</p>
              
              <form onSubmit={handleReservationSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-navy uppercase tracking-widest block ml-1 flex items-center gap-2"><Calendar size={12}/> Date</label>
                    <input 
                      type="date" 
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={reservationForm.date}
                      onChange={(e) => setReservationForm({...reservationForm, date: e.target.value})}
                      className="w-full bg-slate/5 border border-slate/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-gold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-navy uppercase tracking-widest block ml-1 flex items-center gap-2"><Clock size={12}/> Time</label>
                    <input
                      type="time"
                      required
                      value={reservationForm.time}
                      onChange={(e) => setReservationForm({...reservationForm, time: e.target.value})}
                      className="w-full bg-slate/5 border border-slate/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-gold outline-none [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-navy uppercase tracking-widest block ml-1 flex items-center gap-2"><Users size={12}/> Guests (Pax)</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    max={20}
                    value={reservationForm.paxCount}
                    onChange={(e) => setReservationForm({...reservationForm, paxCount: Number(e.target.value)})}
                    className="w-full bg-slate/5 border border-slate/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-gold outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-navy uppercase tracking-widest block ml-1">Special Requests / Notes</label>
                  <textarea 
                    value={reservationForm.notes}
                    onChange={(e) => setReservationForm({...reservationForm, notes: e.target.value})}
                    rows={3}
                    className="w-full bg-slate/5 border border-slate/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-gold outline-none resize-none"
                    placeholder="Allergies, seating preferences..."
                  ></textarea>
                </div>
                
                <div className="flex gap-4 pt-4 border-t border-slate/5">
                  <button 
                    type="button" 
                    onClick={() => setShowReservationModal(false)}
                    className="flex-1 py-3 px-4 bg-slate/10 text-navy font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 bg-navy text-gold font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Requesting...' : 'Request Table'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
