'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import api from '@/lib/api';
import { QrCode, CreditCard, User, ShieldCheck, Bell, Calendar, ArrowRight, Sparkles, Utensils, Receipt } from 'lucide-react';
import Image from 'next/image';
import { Member, Reservation, Announcement, Invoice, Order } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export const dynamic = 'force-dynamic';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemberData = useCallback(async () => {
    try {
      const response = await api.get('members/me'); 
      const me = response.data;
      setMember(me);
      
      if (user?.affiliateId) {
        // Family Member Dashboard Data
        const [qrRes, resRes, annRes, ordRes] = await Promise.all([
          api.get(`members/family/${user.affiliateId}/qr`),
          api.get('activities/my-reservations'),
          api.get('announcements'),
          api.get('restaurant/my-orders')
        ]);

        setQrCode(qrRes.data.qrCodeDataUrl);
        setReservations(resRes.data.slice(0, 2));
        setAnnouncements(annRes.data.slice(0, 3));
        setRecentOrders(ordRes.data.slice(0, 2));
      } else {
        // Primary Member Dashboard Data
        const [qrRes, resRes, annRes, invRes, ordRes] = await Promise.all([
          api.get(`members/${me.id}/qr`),
          api.get('activities/my-reservations'),
          api.get('announcements'),
          api.get('billing/my-invoices'),
          api.get('restaurant/my-orders')
        ]);

        setQrCode(qrRes.data.qrCodeDataUrl);
        setReservations(resRes.data.slice(0, 2));
        setAnnouncements(annRes.data.slice(0, 3));
        setRecentInvoices(invRes.data.slice(0, 3));
        setRecentOrders(ordRes.data.slice(0, 2));
      }
    } catch (err) {
      console.error('Failed to load portal data', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMemberData();
  }, [fetchMemberData]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>;

  return (
    <ProtectedRoute allowedRoles={['MEMBER']}>
      <div className="max-w-7xl mx-auto px-6 pb-24 space-y-16">
        {member ? (
          user?.affiliateId ? (
            member.affiliateProfile ? (
              <>
                {/* 🌟 FAMILY MEMBER (AFFILIATE) DASHBOARD */}
                {/* Header Greeting */}
                <div className="flex justify-between items-end">
                   <div>
                      <h1 className="text-5xl font-serif font-bold text-navy italic">Welcome back, {member.affiliateProfile.name.split(' ')[0]}</h1>
                      <p className="text-slate font-bold uppercase tracking-[0.3em] text-[10px] opacity-60 mt-3">
                        Family Member • {member.affiliateProfile.relation} • Premium Access
                      </p>
                   </div>
                   <div className="hidden md:block">
                      <p className="text-[10px] font-black text-navy/40 uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                   </div>
                </div>

                {/* Elite Virtual Card / Passport Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                   {/* Passport ID */}
                   <div className="lg:col-span-2">
                      <div className="bg-white rounded-[3.5rem] p-12 md:p-16 shadow-2xl relative overflow-hidden group border border-navy/[0.03]">
                        <div className="absolute top-0 left-0 w-full h-2 gold-gradient opacity-50"></div>
                        
                        {/* Background Elements */}
                        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="absolute top-10 right-10 w-48 h-20 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700">
                          <Image 
                            src="/Logo_no_Back.png" 
                            alt="" 
                            fill 
                            className="object-contain" 
                            style={{ filter: 'brightness(0) saturate(100%) invert(85%) sepia(35%) saturate(1313%) hue-rotate(353deg) brightness(96%) contrast(92%)' }} 
                            sizes="192px" 
                          />
                        </div>

                        <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
                           <div className="relative">
                              <div className="absolute inset-0 bg-gold/10 blur-3xl rounded-full"></div>
                              <div className="relative bg-white p-6 rounded-[2.5rem] border border-gold/10 shadow-2xl group-hover:rotate-2 transition-transform duration-700">
                                {qrCode ? (
                                  <Image src={qrCode} alt="QR Card" width={180} height={180} className="mx-auto mix-blend-multiply" />
                                ) : (
                                  <div className="w-44 h-44 flex items-center justify-center text-slate/20">
                                    <QrCode size={60} />
                                  </div>
                                )}
                              </div>
                           </div>

                           <div className="flex-1 text-center md:text-left space-y-8">
                              <div className="space-y-2">
                                 <span className="text-[10px] font-black text-gold uppercase tracking-[0.5em] block opacity-80">{member.affiliateProfile.relation} Passport</span>
                                 <h2 className="text-5xl font-serif font-bold text-navy tracking-tight leading-none">{member.affiliateProfile.name}</h2>
                                 <p className="text-[10px] font-black text-slate/40 uppercase mt-1 tracking-wider">Linked to Primary Member: {member.nameAsAadhaar}</p>
                              </div>
                              
                              <div className="flex flex-wrap justify-center md:justify-start gap-8">
                                 <div className="space-y-1">
                                     <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Member ID</p>
                                    <p className="font-mono text-xs font-black text-navy tracking-[0.2em] uppercase">{member.affiliateProfile.membershipNumber || user?.membershipNumber}</p>
                                 </div>
                                 <div className="w-px h-8 bg-navy/5 hidden md:block"></div>
                                 <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Tier Status</p>
                                    <div className="text-xs font-black text-navy uppercase tracking-tighter flex items-center gap-2">
                                       <div className={`w-2 h-2 rounded-full ${member.category === 'GOLD' ? 'bg-gold shadow-[0_0_10px_gold]' : member.category === 'SILVER' ? 'bg-slate-300' : 'bg-blue-400'}`}></div>
                                       {member.category} (Shared)
                                    </div>
                                 </div>
                                 <div className="w-px h-8 bg-navy/5 hidden md:block"></div>
                                 <div className="space-y-1">
                                     <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Expiry</p>
                                    <p className="text-xs font-black text-navy uppercase tracking-tighter">{new Date(member.expiryDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
                                 </div>
                              </div>

                              <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                                 <div className="inline-flex items-center gap-3 px-6 py-3 bg-gold text-navy rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-xl shadow-gold/20 hover:scale-105 transition-all">
                                    <div className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse"></div>
                                    Active & Verified
                                 </div>
                                 <Link href="/member/profile" className="inline-flex items-center gap-2 px-6 py-3 bg-navy/[0.03] border border-navy/[0.05] rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-navy hover:bg-navy/[0.06] transition-all">
                                    Manage Profile
                                    <ArrowRight size={12} className="text-gold" />
                                 </Link>
                              </div>
                           </div>
                        </div>
                      </div>
                   </div>

                   {/* Notifications */}
                   <div className="lg:col-span-1 space-y-8">
                      <div className="flex justify-between items-center px-4">
                        <h3 className="text-sm font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                          <Bell size={18} className="text-gold" /> Notices
                        </h3>
                        <Link href="/member/announcements" className="text-[9px] font-black text-gold uppercase tracking-widest hover:underline">View All</Link>
                      </div>
                      
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {announcements.length === 0 ? (
                          <div className="bg-white rounded-[2.5rem] p-10 border border-slate/5 text-center">
                            <p className="text-[10px] font-bold text-slate/40 uppercase tracking-widest">No active broadcasts.</p>
                          </div>
                        ) : (
                          announcements.map((ann) => (
                            <div key={ann.id} className="bg-white rounded-[2rem] p-6 border border-slate/5 shadow-xl shadow-navy/5 space-y-3 group hover:bg-gold/5 transition-all duration-500">
                              <p className="text-[9px] font-black text-gold uppercase tracking-[0.2em]">{new Date(ann.createdAt).toLocaleDateString()}</p>
                              <h4 className="font-serif font-bold text-navy text-base leading-tight">{ann.title}</h4>
                              <p className="text-[11px] text-slate/60 font-medium line-clamp-2 leading-relaxed">{ann.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                   </div>
                </div>

                {/* Hub Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <MetricNode 
                      icon={Utensils} 
                      label="My Open Dining Bills" 
                      value={recentOrders.filter(o => o.status === 'OPEN').length > 0 ? 'Table Service Active' : 'No Open Bills'} 
                   />
                   <MetricNode 
                      icon={Calendar} 
                      label="My Scheduled Bookings" 
                      value={reservations.length > 0 ? `${reservations.length} Active` : 'No Bookings'} 
                   />
                    <MetricNode 
                       icon={Sparkles} 
                       label="Family Benefit" 
                       value="30% Food Discount" 
                       color="text-gold"
                    />
                </div>

                {/* Middle Layer: Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   {/* Recent Orders */}
                   <section className="space-y-8">
                      <div className="flex justify-between items-center px-4">
                        <h3 className="text-sm font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                          <Utensils size={18} className="text-gold" /> My Recent Dining
                        </h3>
                        <Link href="/member/restaurant" className="text-[9px] font-black text-gold uppercase tracking-widest hover:underline">New Order</Link>
                      </div>
                      <div className="space-y-4">
                         {recentOrders.length === 0 ? (
                           <div className="bg-white rounded-[2.5rem] p-10 border border-slate/5 text-center">
                             <p className="text-[10px] font-bold text-slate/40 uppercase tracking-widest">No recent dining logs.</p>
                           </div>
                         ) : (
                           recentOrders.map((ord) => (
                             <div key={ord.id} className="bg-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl shadow-navy/5 border border-slate/5 group hover:border-gold/30 transition-all duration-500">
                                <div className="flex items-center gap-6">
                                   <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                      <Utensils size={20} />
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold text-navy uppercase tracking-tighter">{ord.orderNumber}</p>
                                      <p className="text-[9px] text-slate/40 font-black uppercase tracking-widest">Table {ord.table?.number} • {new Date(ord.createdAt).toLocaleDateString()}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${ord.status === 'BILLED' ? 'text-green-600' : 'text-gold'}`}>{ord.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                                </div>
                             </div>
                           ))
                         )}
                      </div>
                   </section>

                   {/* Recent Reservations */}
                   <section className="space-y-8">
                      <div className="flex justify-between items-center px-4">
                        <h3 className="text-sm font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                          <Calendar size={18} className="text-gold" /> My Scheduled Bookings
                        </h3>
                        <Link href="/member/reservations" className="text-[9px] font-black text-gold uppercase tracking-widest hover:underline">All Bookings</Link>
                      </div>
                      <div className="space-y-4">
                        {reservations.length === 0 ? (
                          <div className="bg-white rounded-[2.5rem] p-10 border border-slate/5 text-center">
                            <p className="text-[10px] font-bold text-slate/40 uppercase tracking-widest">No upcoming schedules.</p>
                          </div>
                        ) : (
                          reservations.map((res) => (
                            <div key={res.id} className="bg-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl shadow-navy/5 border border-slate/5 group hover:border-gold/30 transition-all duration-500">
                               <div className="flex items-center gap-6">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${res.status === 'CONFIRMED' ? 'bg-green-50 text-green-600' : 'bg-gold/10 text-gold'}`}>
                                     <ShieldCheck size={20} />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-navy uppercase tracking-tighter">{res.activity.name}</p>
                                     <p className="text-[9px] text-slate/40 font-black uppercase tracking-widest">{new Date(res.activity.startTime).toLocaleDateString()} • {res.activity.location}</p>
                                  </div>
                               </div>
                               <ArrowRight size={14} className="text-slate/20 group-hover:text-gold transition-transform duration-500" />
                            </div>
                          ))
                        )}
                      </div>
                   </section>
                </div>

                {/* Quick Access Footer */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
                   <Link href="/member/activities" className="bg-navy text-gold p-10 rounded-[3rem] flex items-center justify-between group overflow-hidden relative shadow-2xl">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000"></div>
                      <div className="relative z-10 space-y-2">
                         <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gold/40">Programming</p>
                  <p className="text-2xl font-serif font-bold italic">Explore Activities</p>
                  <p className="text-white/40 text-[10px] font-medium max-w-[200px]">Discover club activities and events.</p>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold group-hover:text-navy transition-all duration-500 relative z-10 shadow-inner">
                         <ArrowRight size={32} />
                      </div>
                   </Link>
                   
                   <div className="grid grid-cols-2 gap-6">
                      <QuickNode href="/member/restaurant" label="Dining Room" sub="Dining" icon={Utensils} />
                    <QuickNode href="/member/complaints" label="Help Desk" sub="Support" icon={Bell} />
                   </div>
                </div>
              </>
            ) : (
                <div className="text-center py-32 space-y-6">
                <div className="w-24 h-24 bg-slate/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate/10 shadow-inner">
                   <User size={48} className="text-slate/20" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-navy tracking-tight">Family Member Not Found</h2>
                <p className="text-slate/40 text-[10px] font-black uppercase tracking-[0.2em]">Your family member details could not be loaded.</p>
              </div>
            )
          ) : (
            <>
              {/* 🌟 PRIMARY MEMBER DASHBOARD */}
              {/* Header Greeting */}
              <div className="flex justify-between items-end">
                 <div>
                    <h1 className="text-5xl font-serif font-bold text-navy italic">Welcome back, {(user?.name || member.nameAsAadhaar).split(' ')[0]}</h1>
                    <p className="text-slate font-bold uppercase tracking-[0.3em] text-[10px] opacity-60 mt-3">
                      {user?.affiliateId ? 'Family Member Portal' : 'Member Portal'} • Premium Access
                    </p>
                 </div>
                 <div className="hidden md:block">
                    <p className="text-[10px] font-black text-navy/40 uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                 </div>
              </div>

              {/* Elite Virtual Card / Passport Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                 {/* Passport ID */}
                 <div className="lg:col-span-2">
                    <div className="bg-white rounded-[3.5rem] p-12 md:p-16 shadow-2xl relative overflow-hidden group border border-navy/[0.03]">
                      <div className="absolute top-0 left-0 w-full h-2 gold-gradient opacity-50"></div>
                      
                      {/* Background Elements */}
                      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                      <div className="absolute top-10 right-10 w-48 h-20 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700">
                        <Image 
                          src="/Logo_no_Back.png" 
                          alt="" 
                          fill 
                          className="object-contain" 
                          style={{ filter: 'brightness(0) saturate(100%) invert(85%) sepia(35%) saturate(1313%) hue-rotate(353deg) brightness(96%) contrast(92%)' }} 
                          sizes="192px" 
                        />
                      </div>

                      <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
                         <div className="relative">
                            <div className="absolute inset-0 bg-gold/10 blur-3xl rounded-full"></div>
                            <div className="relative bg-white p-6 rounded-[2.5rem] border border-gold/10 shadow-2xl group-hover:rotate-2 transition-transform duration-700">
                              {qrCode ? (
                                <Image src={qrCode} alt="QR Card" width={180} height={180} className="mx-auto mix-blend-multiply" />
                              ) : (
                                <div className="w-44 h-44 flex items-center justify-center text-slate/20">
                                  <QrCode size={60} />
                                </div>
                              )}
                            </div>
                         </div>

                         <div className="flex-1 text-center md:text-left space-y-8">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-gold uppercase tracking-[0.5em] block opacity-80">Member Passport</span>
                               <h2 className="text-5xl font-serif font-bold text-navy tracking-tight leading-none">{member.nameAsAadhaar}</h2>
                            </div>
                            
                            <div className="flex flex-wrap justify-center md:justify-start gap-8">
                               <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Identity ID</p>
                                  <p className="font-mono text-xs font-black text-navy tracking-[0.2em] uppercase">{user?.membershipNumber || member.membershipNumber}</p>
                               </div>
                               <div className="w-px h-8 bg-navy/5 hidden md:block"></div>
                               <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Tier Status</p>
                                  <div className="text-xs font-black text-navy uppercase tracking-tighter flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full ${member.category === 'GOLD' ? 'bg-gold shadow-[0_0_10px_gold]' : member.category === 'SILVER' ? 'bg-slate-300' : 'bg-blue-400'}`}></div>
                                     {member.category}
                                  </div>
                               </div>
                               <div className="w-px h-8 bg-navy/5 hidden md:block"></div>
                               <div className="space-y-1">
                                   <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Expiry</p>
                                  <p className="text-xs font-black text-navy uppercase tracking-tighter">{new Date(member.expiryDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
                               </div>
                            </div>

                            <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                               <div className="inline-flex items-center gap-3 px-6 py-3 bg-gold text-navy rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-xl shadow-gold/20 hover:scale-105 transition-all">
                                  <div className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse"></div>
                                  Active & Verified
                               </div>
                               <Link href="/member/profile" className="inline-flex items-center gap-2 px-6 py-3 bg-navy/[0.03] border border-navy/[0.05] rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-navy hover:bg-navy/[0.06] transition-all">
                                  Manage Profile
                                  <ArrowRight size={12} className="text-gold" />
                               </Link>
                            </div>
                         </div>
                      </div>
                    </div>
                 </div>

                 {/* Notifications */}
                 <div className="lg:col-span-1 space-y-8">
                    <div className="flex justify-between items-center px-4">
                      <h3 className="text-sm font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                        <Bell size={18} className="text-gold" /> Notices
                      </h3>
                      <Link href="/member/announcements" className="text-[9px] font-black text-gold uppercase tracking-widest hover:underline">View All</Link>
                    </div>
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {announcements.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] p-10 border border-slate/5 text-center">
                          <p className="text-[10px] font-bold text-slate/40 uppercase tracking-widest">No active broadcasts.</p>
                        </div>
                      ) : (
                        announcements.map((ann) => (
                          <div key={ann.id} className="bg-white rounded-[2rem] p-6 border border-slate/5 shadow-xl shadow-navy/5 space-y-3 group hover:bg-gold/5 transition-all duration-500">
                            <p className="text-[9px] font-black text-gold uppercase tracking-[0.2em]">{new Date(ann.createdAt).toLocaleDateString()}</p>
                            <h4 className="font-serif font-bold text-navy text-base leading-tight">{ann.title}</h4>
                            <p className="text-[11px] text-slate/60 font-medium line-clamp-2 leading-relaxed">{ann.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                 </div>
              </div>

              {/* Hub Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   <MetricNode 
                      icon={CreditCard} 
                      label="Account Status" 
                    value={member.category === 'BLUE' ? 'Complimentary' : (member.amcStatus === 'PAID' ? `Active (${member.amcYear || 'Current'})` : 'Payment Due')} 
                    color={member.category === 'BLUE' || member.amcStatus === 'PAID' ? 'text-green-600' : 'text-red-600'}
                 />
                    <MetricNode 
                      icon={Receipt} 
                      label="Balance" 
                    value={`₹ ${Number(member.ledgerBalance || 0).toLocaleString()}`} 
                 />
                 <MetricNode 
                    icon={Utensils} 
                    label="Active Orders" 
                    value={recentOrders.filter(o => o.status === 'OPEN').length > 0 ? 'Table Service Active' : 'No Open Bills'} 
                 />
                 <MetricNode 
                    icon={Sparkles} 
                    label="Exclusive Benefit" 
                    value="30% Food Discount" 
                    color="text-gold"
                 />
              </div>

              {/* Middle Layer: Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 {/* Recent Invoices */}
                 <section className="space-y-8">
                    <div className="flex justify-between items-center px-4">
                      <h3 className="text-sm font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                        <Receipt size={18} className="text-gold" /> Recent Bills
                      </h3>
                      <Link href="/member/billing" className="text-[9px] font-black text-gold uppercase tracking-widest hover:underline">All Bills</Link>
                    </div>
                    <div className="space-y-4">
                       {recentInvoices.length === 0 ? (
                         <div className="bg-white rounded-[2.5rem] p-10 border border-slate/5 text-center">
                           <p className="text-[10px] font-bold text-slate/40 uppercase tracking-widest">No recent transactions.</p>
                         </div>
                       ) : (
                         recentInvoices.map((inv) => (
                           <div key={inv.id} className="bg-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl shadow-navy/5 border border-slate/5 group hover:border-gold/30 transition-all duration-500">
                              <div className="flex items-center gap-6">
                                 <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <CreditCard size={20} />
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-navy uppercase tracking-tighter">{inv.invoiceNumber}</p>
                                    <p className="text-[9px] text-slate/40 font-black uppercase tracking-widest">{inv.department} • {new Date(inv.createdAt).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-lg font-serif font-bold text-navy">₹ {Number(inv.total).toLocaleString()}</p>
                                 <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${inv.status === 'PAID' ? 'text-green-600' : 'text-red-400'}`}>{inv.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </section>

                 {/* Recent Reservations */}
                 <section className="space-y-8">
                    <div className="flex justify-between items-center px-4">
                      <h3 className="text-sm font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                        <Calendar size={18} className="text-gold" /> Schedule
                      </h3>
                      <Link href="/member/reservations" className="text-[9px] font-black text-gold uppercase tracking-widest hover:underline">All Bookings</Link>
                    </div>
                    <div className="space-y-4">
                      {reservations.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] p-10 border border-slate/5 text-center">
                          <p className="text-[10px] font-bold text-slate/40 uppercase tracking-widest">No upcoming schedules.</p>
                        </div>
                      ) : (
                        reservations.map((res) => (
                          <div key={res.id} className="bg-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl shadow-navy/5 border border-slate/5 group hover:border-gold/30 transition-all duration-500">
                             <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${res.status === 'CONFIRMED' ? 'bg-green-50 text-green-600' : 'bg-gold/10 text-gold'}`}>
                                   <ShieldCheck size={20} />
                                </div>
                                <div>
                                   <p className="text-sm font-bold text-navy uppercase tracking-tighter">{res.activity.name}</p>
                                   <p className="text-[9px] text-slate/40 font-black uppercase tracking-widest">{new Date(res.activity.startTime).toLocaleDateString()} • {res.activity.location}</p>
                                </div>
                             </div>
                             <ArrowRight size={14} className="text-slate/20 group-hover:text-gold transition-transform duration-500" />
                          </div>
                        ))
                      )}
                    </div>
                 </section>
              </div>

              {/* Quick Access Footer */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
                 <Link href="/member/activities" className="bg-navy text-gold p-10 rounded-[3rem] flex items-center justify-between group overflow-hidden relative shadow-2xl">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000"></div>
                    <div className="relative z-10 space-y-2">
                       <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gold/40">Programming</p>
                       <p className="text-2xl font-serif font-bold italic">Explore Activities</p>
                        <p className="text-white/40 text-[10px] font-medium max-w-[200px]">Discover club activities and events.</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold group-hover:text-navy transition-all duration-500 relative z-10 shadow-inner">
                       <ArrowRight size={32} />
                    </div>
                 </Link>
                 
                 <div className="grid grid-cols-2 gap-6">
                    <QuickNode href="/member/billing" label="Billing" sub="Invoices" icon={CreditCard} />
                    <QuickNode href="/member/complaints" label="Help Desk" sub="Support" icon={Bell} />
                 </div>
              </div>
            </>
          )
        ) : (
          <div className="text-center py-32 space-y-6">
            <div className="w-24 h-24 bg-slate/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate/10 shadow-inner">
               <User size={48} className="text-slate/20" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-navy tracking-tight">Details Required</h2>
            <p className="text-slate/40 text-[10px] font-black uppercase tracking-[0.2em]">Please sign in with your registered account.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function MetricNode({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color?: string }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-navy/5 border border-slate/5 flex flex-col items-center gap-4 text-center group hover:border-gold/30 transition-all duration-500 hover:-translate-y-1">
      <div className="p-4 rounded-2xl bg-gold/5 text-gold group-hover:scale-110 transition-transform duration-500 border border-gold/10">
        <Icon size={24} />
      </div>
      <div className="space-y-1">
         <span className="text-[9px] font-black text-slate/40 uppercase tracking-[0.3em] block">{label}</span>
         <span className={`text-sm font-black uppercase tracking-tight ${color || 'text-navy'}`}>{value}</span>
      </div>
    </div>
  )
}

function QuickNode({ href, label, sub, icon: Icon }: { href: string, label: string, sub: string, icon: any }) {
  return (
    <Link href={href} className="bg-white p-8 rounded-[2.5rem] border border-slate/5 shadow-xl shadow-navy/5 flex flex-col items-center justify-center text-center gap-4 group hover:bg-gold/5 transition-all duration-500">
       <div className="p-3 rounded-xl bg-navy/5 text-navy group-hover:bg-navy group-hover:text-gold transition-colors">
          <Icon size={20} />
       </div>
       <div>
          <p className="text-base font-bold text-navy tracking-tighter">{label}</p>
          <p className="text-[9px] font-black text-slate/40 uppercase tracking-[0.2em]">{sub}</p>
       </div>
    </Link>
  )
}

