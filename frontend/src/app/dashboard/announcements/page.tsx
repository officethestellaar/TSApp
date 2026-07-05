'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Megaphone, Plus, Calendar, User, Edit2, Trash2 } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { usePermission } from '@/hooks/usePermission';
import { Announcement } from '@/types';
import toast from 'react-hot-toast';
import ExportButton from '@/components/ui/ExportButton';

export const dynamic = 'force-dynamic';

export default function AnnouncementsAdminPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', targetAudience: 'ALL', priority: 'NORMAL' });
  const { socket } = useSocket();
  const canCreateNotice = usePermission('notices', 'create');
  const canUpdateNotice = usePermission('notices', 'update');
  const canDeleteNotice = usePermission('notices', 'delete');

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await api.get('announcements');
      setAnnouncements(response.data);
    } catch {
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`announcements/${editingId}`, formData);
        toast.success('Announcement updated successfully!');
      } else {
        await api.post('announcements', formData);
        toast.success('Announcement posted successfully!');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ title: '', content: '', targetAudience: 'ALL', priority: 'NORMAL' });
      void fetchAnnouncements();
    } catch {
      toast.error('Failed to save announcement');
    }
  };

  const handleEdit = (ann: Announcement) => {
    setFormData({
      title: ann.title,
      content: ann.content,
      targetAudience: ann.targetAudience,
      priority: ann.priority || 'NORMAL'
    });
    setEditingId(ann.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await api.delete(`announcements/${id}`);
      toast.success('Notice deleted');
      fetchAnnouncements();
    } catch {
      toast.error('Failed to delete notice');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchAnnouncements();
    };
    loadData();
  }, [fetchAnnouncements]);

  // Real-time Data Hydration
  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        console.log('[Notices] Real-time signal received. Loading announcements...');
        fetchAnnouncements();
      };

      socket.on('new_announcement', handleUpdate);

      return () => {
        socket.off('new_announcement', handleUpdate);
      };
    }
  }, [socket, fetchAnnouncements]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notices</h1>
            <p className="text-gray-500">Post news, events, and updates</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              filename="announcements"
              headers={['Title', 'Audience', 'Priority', 'Created', 'Active']}
              rows={announcements.map(a => [
                a.title,
                a.targetAudience,
                a.priority || 'NORMAL',
                new Date(a.createdAt).toLocaleDateString(),
                'Yes'
              ])}
            />
            {canCreateNotice && (
              <button
                onClick={() => {
                setEditingId(null);
                setFormData({ title: '', content: '', targetAudience: 'ALL', priority: 'NORMAL' });
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-all"
            >
              <Plus size={20} />
              New Notice
            </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
          ) : announcements.length === 0 ? (
            <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-2xl border-2 border-dashed">No notices found.</div>
          ) : (
            announcements.map((a: Announcement) => (
              <div key={a.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Megaphone size={20} /></div>
                    <div className="flex gap-2">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 uppercase">{a.targetAudience}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        {canUpdateNotice && <button onClick={() => handleEdit(a)} className="text-gray-400 hover:text-blue-500"><Edit2 size={14} /></button>}
                        {canDeleteNotice && <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{a.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-6">{a.content}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1"><User size={12} /> {a.createdBy.name}</div>
                  <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(a.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-6">{editingId ? 'Edit Notice' : 'New Notice'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Title</label>
                  <input
                    required
                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="E.g., Swimming Pool Maintenance"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Audience</label>
                    <select
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    >
                      <option value="ALL">Everyone</option>
                      <option value="MEMBERS">Members Only</option>
                      <option value="STAFF">Staff Only</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Priority</label>
                    <select
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Content</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Full announcement details..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all"
                  >
                    {editingId ? 'Save Changes' : 'Post Now'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
