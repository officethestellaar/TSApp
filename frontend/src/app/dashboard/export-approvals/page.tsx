'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Shield, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ExportRequest {
  id: number;
  userId: number;
  page: string;
  reason: string;
  params: string | null;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
}

export default function ExportApprovalsPage() {
  const [requests, setRequests] = useState<ExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('export-requests/pending');
      setRequests(res.data);
    } catch {
      toast.error('Failed to load export requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    setActionId(id);
    try {
      await api.patch(`export-requests/${id}/approve`);
      toast.success('Export request approved');
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionId(id);
    try {
      await api.patch(`export-requests/${id}/reject`);
      toast.success('Export request rejected');
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-navy">Export Approvals</h1>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-navy/40">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">No pending export requests</p>
          <p className="text-sm">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white border border-navy/10 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-navy">{req.user.name}</span>
                    <span className="text-xs text-navy/40">({req.user.email})</span>
                  </div>
                  <p className="text-sm text-navy/80 mb-1">
                    wants to export <span className="font-semibold text-navy">{req.page}</span>
                  </p>
                  <p className="text-sm text-navy/60 bg-navy/[0.03] rounded-lg p-3 mt-2">
                    &ldquo;{req.reason}&rdquo;
                  </p>
                  <p className="text-xs text-navy/40 mt-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {format(new Date(req.createdAt), 'dd MMM yyyy, h:mm a')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={actionId === req.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {actionId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={actionId === req.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
