'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ArrowLeft, Calendar, Phone, Mail, MapPin, User, ShieldCheck, QrCode, RefreshCcw, AlertTriangle, UserPlus } from 'lucide-react';
import { Member, FamilyMember } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import AddFamilyMemberModal from '@/components/members/AddFamilyMemberModal';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

export default function MemberDetailPage() {
  const canCreateMember = usePermission('members', 'create');
  const canUpdateMember = usePermission('members', 'update');
  const { id } = useParams();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const router = useRouter();

  const fetchQrCode = useCallback(async () => {
    try {
      const response = await api.get(`members/${id}/qr`);
      setQrCode(response.data.qrCodeDataUrl);
      setShowQrModal(true);
    } catch {
      alert('Failed to generate QR code');
    }
  }, [id]);

  const fetchMember = useCallback(async () => {
    try {
      const response = await api.get(`members/${id}`);
      setMember(response.data);
    } catch {
      console.error('Failed to fetch member details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const loadData = async () => {
      await fetchMember();
    };
    loadData();
  }, [fetchMember]);

  const handleStatusUpdate = async (status: string) => {
    try {
      await api.patch(`members/${id}/status`, { status });
      alert(`Member ${status.toLowerCase()} successfully!`);
      void fetchMember();
    } catch {
      alert('Failed to update status');
    }
  };

  const handleProcessFamilyRequest = async (familyId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`members/family-requests/${familyId}/process`, { status });
      toast.success(`Family member ${status.toLowerCase()} successfully.`);
      void fetchMember();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process request');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!member) return <div className="p-10 text-center">Member not found</div>;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft size={20} className="mr-2" /> Back to List
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Basic Info & Actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="h-24 w-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold mx-auto mb-4 border-4 border-white shadow-sm">
                {member.nameAsAadhaar?.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{member.nameAsAadhaar}</h2>
              <p className="text-gray-500 text-sm mb-4">{member.membershipNumber}</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-6 ${
                member.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                member.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {member.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </div>

              {canUpdateMember && member.status === 'PENDING' && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => handleStatusUpdate('APPROVED')}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold transition-all"
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('REJECTED')}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-semibold transition-all"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}

              {canUpdateMember && member.status === 'TERMINATED' && (
                <button
                  onClick={() => handleStatusUpdate('APPROVED')}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  <RefreshCcw size={16} /> Restore Account
                </button>
              )}

              {member.status === 'APPROVED' && (
                <>
                  <button
                    onClick={fetchQrCode}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold transition-all"
                  >
                    <QrCode size={16} /> View QR Card
                  </button>
                  <Link
                    href={`/dashboard/billing/new?memberId=${member.id}&department=PENALTY`}
                    className="w-full mt-3 flex items-center justify-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-800 py-2 rounded-lg text-sm font-semibold transition-all border border-orange-200"
                  >
                    <AlertTriangle size={16} /> Charge Penalty
                  </Link>
                </>
              )}
            </div>

            {/* QR Modal */}
            {showQrModal && qrCode && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
                  <h3 className="text-xl font-bold mb-4">Virtual Membership Card</h3>
                  <div className="bg-gray-50 p-6 rounded-xl mb-6 border border-gray-100">
                    <div className="relative mx-auto w-48 h-48">
                      <Image src={qrCode} alt="Member QR Code" fill className="object-contain" />
                    </div>
                    <p className="mt-4 font-mono text-sm font-bold text-gray-700">{member.membershipNumber}</p>
                    <p className="text-gray-900 font-semibold">{member.nameAsAadhaar}</p>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{member.category}</p>
                  </div>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="w-full py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck size={18} className="text-blue-600" /> Membership Status</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">AMC Status:</span>
                <span className={`font-bold ${member.amcStatus === 'PAID' ? 'text-green-600' : 'text-red-600'}`}>{member.amcStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Access Status:</span>
                <span className="font-semibold text-gray-900">{member.accessStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valid Upto:</span>
                <span className="font-semibold text-gray-900">{new Date(member.expiryDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">Applicant Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Father/Husband Name</p>
                      <p className="text-gray-900 font-medium">{member.fatherHusbandName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Date of Birth</p>
                      <p className="text-gray-900 font-medium">{new Date(member.dob).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Mobile Number</p>
                      <p className="text-gray-900 font-medium">{member.mobileNumber}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Email ID</p>
                      <p className="text-gray-900 font-medium">{member.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Aadhaar Number</p>
                      <p className="text-gray-900 font-medium">{member.aadhaarNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Address</p>
                      <p className="text-gray-900 font-medium">{member.residentialAddress}, {member.city}, {member.state}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Family Members Section */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6 pb-2 border-b">
                <h3 className="text-xl font-bold text-gray-900">Family Members ({member.familyMembers?.length || 0})</h3>
                {canCreateMember && (
                  <button
                    onClick={() => setShowAddFamilyModal(true)}
                    disabled={(member.familyMembers?.length || 0) >= 3}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  >
                    <UserPlus size={16} /> Add Family Member
                  </button>
                )}
              </div>
              {member.familyMembers && member.familyMembers.length >= 3 && (
                <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mb-4 bg-orange-50 p-2 rounded-md border border-orange-100 flex items-center gap-2">
                  <AlertTriangle size={12} /> Limit reached: Maximum 3 family members allowed.
                </p>
              )}
              {!member.familyMembers || member.familyMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No family members enrolled.</p>
              ) : (
                <div className="space-y-4">
                  {member.familyMembers.map((fm: FamilyMember) => (
                    <div key={fm.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                          {fm.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{fm.name}</p>
                          <p className="text-xs text-gray-500">{fm.relation} • {fm.gender}</p>
                          {fm.mobileNumber && (
                            <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-1">
                              <Phone size={10} /> {fm.mobileNumber}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <p className="text-xs text-gray-400 font-bold uppercase text-right">DOB</p>
                          <p className="text-sm font-medium text-right">{new Date(fm.dob).toLocaleDateString()}</p>
                        </div>
                        
                        {canUpdateMember && (fm as any).status === 'PENDING' && (
                          <div className="flex gap-2">
                             <button 
                                onClick={() => handleProcessFamilyRequest(fm.id, 'APPROVED')}
                                className="p-1.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-md border border-green-200 transition-all shadow-sm"
                                title="Approve"
                             >
                                <CheckCircle size={14} />
                             </button>
                             <button 
                                onClick={() => handleProcessFamilyRequest(fm.id, 'REJECTED')}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-md border border-red-200 transition-all shadow-sm"
                                title="Reject"
                             >
                                <XCircle size={14} />
                             </button>
                          </div>
                        )}
                        {(fm as any).status === 'APPROVED' && (
                           <span className="text-[8px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded border border-green-100">Live</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showAddFamilyModal && member && (
        <AddFamilyMemberModal 
          memberId={member.id}
          onClose={() => setShowAddFamilyModal(false)}
          onSuccess={fetchMember}
        />
      )}
    </div>
  );
}
