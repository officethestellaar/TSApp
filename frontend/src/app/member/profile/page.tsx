'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Phone, MapPin, Shield, Heart, Briefcase, ArrowLeft, History, CheckCircle2, XCircle, Users, QrCode, CreditCard } from 'lucide-react';
import { Member, FamilyMember } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import AMCPaymentModal from '@/components/members/AMCPaymentModal';
import EditProfileModal from '@/components/members/EditProfileModal';
import RequestFamilyMemberModal from '@/components/members/RequestFamilyMemberModal';
import { Edit2 } from 'lucide-react';

interface FamilyWithQR extends FamilyMember {
  qrCodeDataUrl?: string;
}

export default function MemberProfilePage() {
  const { user } = useAuth();
  const [member, setMember] = useState<(Member & { familyMembers: FamilyWithQR[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAMCModal, setShowAMCModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRequestFamilyModal, setShowRequestFamilyModal] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('members/me');
      const memberData = response.data;
      
      // Fetch QR codes for each family member
      if (memberData.familyMembers && memberData.familyMembers.length > 0) {
        const familyWithQRs = await Promise.all(
          memberData.familyMembers.map(async (fm: FamilyMember) => {
            try {
              const qrRes = await api.get(`members/family/${fm.id}/qr`);
              return { ...fm, qrCodeDataUrl: qrRes.data.qrCodeDataUrl };
            } catch (err) {
              console.error(`Failed to fetch QR for family member ${fm.id}`, err);
              return fm;
            }
          })
        );
        memberData.familyMembers = familyWithQRs;
      }
      
      setMember(memberData);
    } catch {
      console.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>;

  return (
    <ProtectedRoute allowedRoles={['MEMBER']}>
      <div className="max-w-6xl mx-auto px-6 pb-32 space-y-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 px-4">
          <div className="space-y-4">
            <Link href="/member/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black text-gold uppercase tracking-[0.3em] hover:translate-x-[-4px] transition-transform">
              <ArrowLeft size={14} /> Back to Passport
            </Link>
            <h1 className="text-5xl font-serif font-bold text-navy tracking-tighter leading-none">My Profile</h1>
            <p className="text-slate/40 text-xs font-black uppercase tracking-[0.2em]">Personal Details</p>
          </div>
          <div className="px-8 py-3 bg-white border border-gold/20 rounded-2xl text-[10px] font-black text-gold uppercase tracking-[0.4em] shadow-lg">
             Member ID: {member?.membershipNumber}
          </div>
        </div>

        {member ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Core Identity */}
            <div className="lg:col-span-1 space-y-12">
              <div className="bg-white p-10 rounded-[3.5rem] text-center relative overflow-hidden group border border-slate/5 shadow-2xl shadow-navy/5">
                <div className="absolute top-0 left-0 w-full h-1.5 gold-gradient"></div>
                <div className="relative w-40 h-40 mx-auto mb-8 rounded-[2.5rem] overflow-hidden border-2 border-gold/20 bg-navy/5 flex items-center justify-center">
                  {member.photoUrl ? (
                    <Image src={member.photoUrl} alt={member.nameAsAadhaar} fill className="object-cover" />
                  ) : (
                    <User size={80} className="text-gold/20" />
                  )}
                </div>
                <h2 className="text-2xl font-serif font-bold text-navy tracking-tight">{member.nameAsAadhaar}</h2>
                <p className="text-[10px] font-black text-gold uppercase tracking-[0.4em] mt-3">{member.category} Member</p>
                
                <div className="mt-10 pt-10 border-t border-slate/5 space-y-6">
                   <div className="flex items-center gap-4 text-left">
                      <div className="p-2.5 bg-gold/5 rounded-xl text-gold border border-gold/10"><Mail size={16} /></div>
                      <div>
                        <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Email</p>
                        <p className="text-xs font-bold text-navy truncate max-w-[180px]">{member.email}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 text-left">
                      <div className="p-2.5 bg-gold/5 rounded-xl text-gold border border-gold/10"><Phone size={16} /></div>
                      <div>
                        <p className="text-[8px] font-black text-slate/40 uppercase tracking-widest">Phone</p>
                        <p className="text-xs font-bold text-navy">{member.mobileNumber}</p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] space-y-8 border border-slate/5 shadow-xl shadow-navy/5">
                  <h3 className="text-xs font-black text-navy uppercase tracking-[0.4em] flex items-center gap-3">
                     <Shield size={16} className="text-gold" /> Account Status
                  </h3>
                <div className="space-y-6">
                   <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate/40 uppercase tracking-widest">Access Status</span>
                      <span className="px-3 py-1 bg-green-50 text-green-700 text-[9px] font-black rounded-full border border-green-100 uppercase tracking-widest">{member.accessStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-slate/5 pb-6">
                      <span className="text-[10px] font-black text-slate/40 uppercase tracking-widest">AMC Status</span>
                      <span className={`px-3 py-1 text-[9px] font-black rounded-full border uppercase tracking-widest ${member.amcStatus === 'PAID' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{member.amcStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                   </div>
                   {/* HIGH VISIBILITY AMC ACTION NODE */}
                   {member.amcStatus !== 'PAID' && member.category !== 'BLUE' && !user?.affiliateId && (
                     <button 
                        onClick={() => setShowAMCModal(true)}
                        className="w-full bg-navy text-gold p-8 rounded-[2rem] text-center space-y-3 group hover:bg-black transition-all duration-500 shadow-2xl shadow-navy/20 relative overflow-hidden"
                     >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="flex justify-center">
                           <div className="p-3 bg-gold/10 rounded-xl text-gold group-hover:scale-110 transition-transform duration-500">
                              <CreditCard size={24} />
                           </div>
                        </div>
                        <div className="space-y-1 relative z-10">
                           <p className="text-[10px] font-black uppercase tracking-[0.3em]">Payment Required</p>
                           <p className="text-2xl font-serif font-bold italic tracking-tight">Make Payment</p>
                           <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Annual Membership Fee</p>
                        </div>
                     </button>
                   )}

                   <div className="flex justify-between items-center pt-2">
                       <span className="text-[10px] font-black text-slate/40 uppercase tracking-widest">Expiry Date</span>
                      <span className="text-[10px] font-black text-navy uppercase">{new Date(member.expiryDate).toLocaleDateString()}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Columns: Detailed Registry */}
            <div className="lg:col-span-2 space-y-12">
               {/* Personal Details Section */}
               <div className="bg-white p-12 rounded-[4rem] border border-slate/5 shadow-2xl shadow-navy/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="space-y-10">
                        <section className="space-y-6">
                           <div className="flex justify-between items-center">
                              <h4 className="text-[11px] font-black text-gold uppercase tracking-[0.5em] flex items-center gap-4">
                                  <User size={14} /> Personal Details
                               </h4>
                              {!user?.affiliateId && (
                                <button
                                  onClick={() => setShowEditModal(true)}
                                  className="p-2 bg-gold/5 text-gold rounded-xl border border-gold/10 hover:bg-gold/10 transition-all flex items-center gap-2 group"
                                >
                                  <Edit2 size={12} className="group-hover:scale-110 transition-transform" />
                                  <span className="text-[8px] font-black uppercase tracking-widest">Modify</span>
                                </button>
                              )}
                              </div>

                           <div className="grid grid-cols-1 gap-6">
                              <InfoNode label="Father/Husband" value={member.fatherHusbandName} />
                              <div className="grid grid-cols-2 gap-4">
                                 <InfoNode label="Gender" value={member.gender} />
                                 <InfoNode label="Blood Group" value={member.bloodGroup} />
                              </div>
                              <InfoNode label="Birth Date" value={new Date(member.dob).toLocaleDateString()} />
                           </div>
                        </section>

                        <section className="space-y-6">
                           <h4 className="text-[11px] font-black text-gold uppercase tracking-[0.5em] flex items-center gap-4">
                               <Briefcase size={14} /> Professional Details
                            </h4>
                           <div className="grid grid-cols-1 gap-6">
                              <InfoNode label="Occupation" value={member.occupation} />
                               <InfoNode label="Organization" value={member.companyName || 'Private'} />
                              <InfoNode label="Designation" value={member.designation || 'N/A'} />
                           </div>
                        </section>
                     </div>

                     <div className="space-y-10">
                        <section className="space-y-6">
                           <h4 className="text-[11px] font-black text-gold uppercase tracking-[0.5em] flex items-center gap-4">
                               <MapPin size={14} /> Address
                            </h4>
                           <div className="grid grid-cols-1 gap-6">
                               <InfoNode label="Residential Address" value={member.residentialAddress} />
                              <div className="grid grid-cols-2 gap-4">
                                 <InfoNode label="City" value={member.city} />
                                 <InfoNode label="State" value={member.state} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <InfoNode label="Pincode" value={member.pincode} />
                                 <InfoNode label="Nationality" value={member.nationality} />
                              </div>
                           </div>
                        </section>

                        <section className="space-y-6">
                           <h4 className="text-[11px] font-black text-gold uppercase tracking-[0.5em] flex items-center gap-4">
                               <Heart size={14} /> Emergency Contact
                            </h4>
                           <div className="grid grid-cols-1 gap-6">
                               <InfoNode label="Contact Name" value={member.emergencyContactName} />
                               <InfoNode label="Contact Number" value={member.emergencyContactNumber} />
                           </div>
                        </section>
                     </div>
                  </div>
               </div>

               {/* Access Logs Section */}
               <div className="bg-white p-10 rounded-[3rem] border border-slate/5 shadow-xl shadow-navy/5">
                  <div className="flex justify-between items-center mb-10">
                      <h4 className="text-[11px] font-black text-navy uppercase tracking-[0.6em] flex items-center gap-4 px-4">
                         <History size={16} className="text-gold" /> Recent Activity
                      </h4>
                  </div>
                  <div className="space-y-4">
                     {(!member.accessLogs || member.accessLogs.length === 0) ? (
                        <p className="text-center py-10 text-slate/40 text-[10px] font-black uppercase tracking-[0.4em]">No history found.</p>
                     ) : (
                        (member.accessLogs as any[]).map((log: any) => (
                           <div key={log.id} className="flex items-center justify-between p-6 bg-slate/5 rounded-2xl group hover:bg-gold/5 transition-colors duration-500">
                              <div className="flex items-center gap-6">
                                 <div className={`p-2.5 rounded-xl ${log.isAllowed ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                    {log.isAllowed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                 </div>
                                 <div className="space-y-1">
                                    <p className="text-xs font-black text-navy uppercase tracking-widest">{log.accessType} Protocol</p>
                                    <p className="text-[9px] font-bold text-slate/40 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-black text-slate/30 uppercase tracking-[0.2em]">{log.deviceLocation || 'Main Entry'}</p>
                                 {!log.isAllowed && <p className="text-[8px] font-bold text-red-500 uppercase mt-1">{log.denialReason}</p>}
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>

               {/* Family Passports Section */}
               <div className="space-y-8">
                  <div className="flex justify-between items-center px-4">
                      <h3 className="text-sm font-black text-navy uppercase tracking-[0.3em] flex items-center gap-3">
                        <Users size={18} className="text-gold" /> Family Members
                      </h3>
                     {!user?.affiliateId && (
                        <button 
                           onClick={() => setShowRequestFamilyModal(true)}
                           className="px-6 py-2 bg-navy text-gold text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black transition-all shadow-lg"
                        >
                            Add Family Member
                         </button>
                     )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {(!member.familyMembers || member.familyMembers.length === 0) ? (
                      <div className="col-span-full bg-white p-12 rounded-[3rem] border border-dashed border-slate/20 text-center">
                        <p className="text-[10px] font-black text-slate/30 uppercase tracking-widest">No family members added.</p>
                      </div>
                    ) : (
                      member.familyMembers.map((fm: any) => (
                        <div key={fm.id} className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-navy/5 border border-slate/5 relative overflow-hidden group">
                           <div className="flex flex-col sm:flex-row items-center gap-8">
                              <div className="relative bg-white p-4 rounded-3xl border border-gold/10 shadow-lg shrink-0">
                                {fm.qrCodeDataUrl ? (
                                  <Image src={fm.qrCodeDataUrl} alt={`${fm.name} QR`} width={120} height={120} className="mix-blend-multiply" />
                                ) : (
                                  <div className="w-24 h-24 flex items-center justify-center text-slate/10"><QrCode size={48} /></div>
                                )}
                              </div>
                              <div className="space-y-4 text-center sm:text-left flex-1">
                                 <div>
                                    <div className="flex items-center gap-2 mb-1">
                                       <p className="text-[8px] font-black text-gold uppercase tracking-[0.4em]">{fm.relation}</p>
                                       {fm.status && fm.status !== 'APPROVED' && (
                                          <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                                             fm.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-red-50 text-red-600 border-red-100'
                                          }`}>
                                             {fm.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                          </span>
                                       )}
                                    </div>
                                    <h4 className="text-xl font-serif font-bold text-navy tracking-tight">{fm.name}</h4>
                                 </div>
                                 <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                                    <div className="space-y-0.5">
                                        <p className="text-[7px] font-black text-slate/40 uppercase tracking-widest">Added On</p>
                                       <p className="text-[10px] font-bold text-navy uppercase">{new Date(fm.dob).toLocaleDateString()}</p>
                                    </div>
                                    <div className="w-px h-6 bg-slate/10"></div>
                                    <div className="space-y-0.5">
                                        <p className="text-[7px] font-black text-slate/40 uppercase tracking-widest">Mobile</p>
                                        <p className="text-[10px] font-bold text-navy">{fm.mobileNumber || 'Primary'}</p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => {
                                const link = document.createElement('a');
                                link.href = fm.qrCodeDataUrl || '';
                                link.download = `Passport_${fm.name}.png`;
                                link.click();
                              }} className="p-2 bg-navy text-gold rounded-full shadow-lg hover:scale-110 transition-transform">
                                <QrCode size={14} />
                              </button>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          </div>
        ) : null}

        {showAMCModal && member && (
           <AMCPaymentModal 
             amcAmount={member.amcAmount as number}
             onClose={() => setShowAMCModal(false)}
             onSuccess={fetchProfile}
           />
        )}

        {showEditModal && member && (
           <EditProfileModal 
             member={member}
             onClose={() => setShowEditModal(false)}
             onSuccess={fetchProfile}
           />
        )}

        {showRequestFamilyModal && (
          <RequestFamilyMemberModal 
            onClose={() => setShowRequestFamilyModal(false)}
            onSuccess={fetchProfile}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

function InfoNode({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-navy leading-snug">{value}</p>
    </div>
  );
}
