'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Search, MoreVertical, CheckCircle, XCircle, Clock, Trash2, ShieldOff, FileSpreadsheet, Download, RefreshCcw } from 'lucide-react';
import { Member } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { usePermission } from '@/hooks/usePermission';
import BulkImportModal from '@/components/members/BulkImportModal';

export default function MemberListPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();

  const canImport = user && ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER'].includes(user.role);
  const canCreateMember = usePermission('members', 'create');
  const canUpdateMember = usePermission('members', 'update');
  const canDeleteMember = usePermission('members', 'delete');

  const fetchMembers = useCallback(async () => {
    try {
      const response = await api.get('members', { 
        params: { 
          search,
          status: statusFilter === 'ALL' ? undefined : statusFilter 
        } 
      });
      setMembers(response.data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Real-time Data Hydration
  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        console.log('[Members] Update received. Refreshing list...');
        fetchMembers();
      };

      socket.on('new_member', handleUpdate);
      socket.on('bulk_import_complete', handleUpdate);
      socket.on('member_status_updated', handleUpdate);

      return () => {
        socket.off('new_member', handleUpdate);
        socket.off('bulk_import_complete', handleUpdate);
        socket.off('member_status_updated', handleUpdate);
      };
    }
  }, [socket, fetchMembers]);

  const handleTerminate = async (id: number, name: string) => {
    if (!confirm(`End membership for ${name}? They will lose all club access.`)) return;
    try {
      await api.patch(`members/${id}/status`, { status: 'TERMINATED' });
      fetchMembers();
    } catch {
      alert('Failed to end membership. Please try again.');
    }
  };

  const handleRestore = async (id: number, name: string) => {
    if (!confirm(`Are you certain you wish to restore the membership of ${name}?`)) return;
    try {
      await api.patch(`members/${id}/status`, { status: 'APPROVED' });
      fetchMembers();
    } catch {
      alert('Failed to restore membership.');
    }
  };

  const handleRemove = async (id: number, name: string) => {
    if (!confirm(`Permanently delete all records for ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`members/${id}`);
      fetchMembers();
    } catch {
      alert('Failed to delete member.');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('members/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stellaar-members-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Export failed.');
    }
  };

  return (
    <div className="p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-5xl font-serif font-bold text-navy mb-3 tracking-tighter italic">Members</h1>
            <p className="text-slate font-bold uppercase tracking-[0.3em] text-[10px] opacity-60">View and manage all members</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleExport}
              className="flex items-center gap-3 bg-white border border-navy/10 hover:border-gold text-navy px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-500 transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-navy/5"
            >
              <Download size={18} className="text-navy/40" />
              Export CSV
            </button>
            {canImport && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-3 bg-white border border-navy/10 hover:border-gold text-navy px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-500 transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-navy/5"
              >
                <FileSpreadsheet size={18} className="text-gold" />
                Bulk Import
              </button>
            )}
            {canCreateMember && (
              <Link
                href="/dashboard/members/new"
                className="flex items-center gap-3 gold-gradient hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.4)] text-navy px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-500 transform hover:-translate-y-1 active:scale-95"
              >
                <UserPlus size={18} />
                Add Member
              </Link>
            )}
          </div>
        </header>

        {/* Search and Filter */}
        <div className="glass-panel p-8 rounded-[2rem] mb-12 flex gap-8 items-center shadow-2xl shadow-navy/5">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-gold">
              <Search size={20} />
            </span>
            <input
              type="text"
              className="block w-full pl-14 pr-6 py-4 bg-white/40 border border-navy/5 rounded-2xl focus:ring-2 focus:ring-gold focus:bg-white outline-none transition-all placeholder:text-slate/30 font-bold text-navy"
              placeholder="Search by name, ID, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex items-center gap-3 px-8 py-4 border border-navy/10 rounded-2xl text-navy font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-gold transition-all duration-500 outline-none appearance-none cursor-pointer bg-transparent"
          >
            <option value="ALL">All Status</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        {/* Member Table */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(10,25,47,0.08)] border border-navy/[0.03] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy/[0.02] border-b border-navy/[0.05]">
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Member</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Member ID</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Status</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em]">Status</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate uppercase tracking-[0.3em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/[0.03]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center text-slate font-bold uppercase tracking-widest text-xs opacity-40">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((member: Member) => (
                  <tr 
                    key={member.id} 
                    className="hover:bg-gold/[0.03] transition-all duration-700 cursor-pointer group"
                    onClick={() => router.push(`/dashboard/members/${member.id}`)}
                  >
                    <td className="px-10 py-7">
                      <div className="flex items-center">
                        <div className="h-14 w-14 rounded-[1.25rem] premium-gradient text-gold flex items-center justify-center font-serif text-2xl font-bold mr-6 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                          {member.nameAsAadhaar.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-navy group-hover:text-gold transition-colors text-lg">{member.nameAsAadhaar}</div>
                          <div className="text-[10px] text-slate font-black uppercase tracking-widest mt-1 opacity-60">{member.mobileNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <span className="font-mono text-xs font-black bg-navy/5 px-4 py-2 rounded-xl text-navy/60 border border-navy/5">
                        {member.membershipNumber}
                      </span>
                    </td>
                    <td className="px-10 py-7">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                          member.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-100' :
                          member.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                          'bg-gold/5 text-gold border-gold/20'
                        }`}>
                          {member.status === 'PENDING' && <Clock size={10} className="mr-2" />}
                          {member.status === 'APPROVED' && <CheckCircle size={10} className="mr-2" />}
                          {member.status === 'REJECTED' && <XCircle size={10} className="mr-2" />}
                          {member.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          member.category === 'GOLD' ? 'text-gold' : 
                          member.category === 'SILVER' ? 'text-slate-400' : 
                          'text-blue-500'
                        }`}>
                          {member.category} Membership
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-black text-slate uppercase tracking-widest opacity-40">AMC</div>
                        <span className={`text-xs font-black tracking-widest uppercase ${member.amcStatus === 'PAID' ? 'text-green-600' : 'text-red-500'}`}>
                          {member.amcStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-7 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {canUpdateMember && (member.status === 'TERMINATED' ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRestore(member.id, member.nameAsAadhaar); }}
                            className="text-slate/40 hover:text-green-500 transition-all p-2 hover:bg-green-500/10 rounded-xl"
                            title="Restore Membership"
                          >
                            <RefreshCcw size={18} />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleTerminate(member.id, member.nameAsAadhaar); }}
                            className="text-slate/40 hover:text-gold transition-all p-2 hover:bg-gold/10 rounded-xl"
                            title="End Membership"
                          >
                            <ShieldOff size={18} />
                          </button>
                        ))}
                        {canDeleteMember && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRemove(member.id, member.nameAsAadhaar); }}
                            className="text-slate/40 hover:text-red-500 transition-all p-2 hover:bg-red-500/10 rounded-xl"
                            title="Delete Member"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <button className="text-slate/40 hover:text-navy transition-all p-2 hover:bg-navy/5 rounded-xl">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isImportModalOpen && (
        <BulkImportModal 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={fetchMembers} 
        />
      )}
    </div>
  );
}
