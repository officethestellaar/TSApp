'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Feedback } from '@/types';
import { MessageSquare, Star, Search, CheckCircle, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';
import ExportButton from '@/components/ui/ExportButton';

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const canResolve = usePermission('feedback', 'update');

  const fetchFeedbacks = async () => {
    try {
      const res = await api.get('reports/feedback');
      setFeedbacks(res.data);
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleResolve = async (id: number) => {
    try {
      await api.patch(`reports/feedback/${id}/resolve`);
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, isResolved: true } : f));
      toast.success('Marked as handled');
    } catch {
      toast.error('Failed to resolve');
    }
  };

  const departments = [...new Set(feedbacks.map(f => f.department))];
  const filtered = feedbacks.filter(f => {
    if (deptFilter !== 'ALL' && f.department !== deptFilter) return false;
    if (search && !f.memberName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
          <p className="text-gray-500">View ratings and comments from members</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <ExportButton
            filename="feedback"
            headers={['Member', 'Department', 'Rating', 'Comment', 'Status', 'Created']}
            rows={filtered.map(f => [
              f.memberName || 'Guest',
              f.department,
              String(f.rating),
              f.comments || '',
              f.isResolved ? 'Handled' : 'Open',
              format(new Date(f.createdAt), 'MMM dd, h:mm a')
            ])}
          />
          <MessageSquare size={16} />
          {feedbacks.length} total
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by member name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold/40"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center">
          <MessageSquare size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-semibold">No feedback yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(f => (
            <div key={f.id} className={`bg-white rounded-2xl p-6 border transition-all ${!f.isResolved && f.rating <= 3 ? 'border-orange-200 shadow-lg shadow-orange-50' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={16} className={s <= f.rating ? 'text-gold fill-gold' : 'text-gray-200'} />
                      ))}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.isResolved ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {f.isResolved ? 'Handled' : 'Open'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-gray-900">{f.memberName || 'Guest'}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{f.department}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {format(new Date(f.createdAt), 'MMM dd, h:mm a')}
                    </span>
                  </div>
                  {f.comments && (
                    <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-xl p-4 italic border border-gray-100">
                      &ldquo;{f.comments}&rdquo;
                    </p>
                  )}
                  {f.member?.mobileNumber && (
                    <p className="mt-2 text-xs text-gray-400">Contact: {f.member.mobileNumber}</p>
                  )}
                </div>
                {!f.isResolved && canResolve && (
                  <button
                    onClick={() => handleResolve(f.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-all"
                  >
                    <CheckCircle size={14} /> Mark Handled
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
