'use client';

import React, { useState } from 'react';
import { X, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';

interface ExportPermissionModalProps {
  page: string;
  params?: Record<string, string>;
  onClose: () => void;
  onApproved: () => void;
  requestId?: number;
  requestStatus?: string;
}

export default function ExportPermissionModal({
  page,
  params,
  onClose,
  onApproved,
  requestId: existingRequestId,
  requestStatus: existingStatus,
}: ExportPermissionModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(existingRequestId ?? null);
  const [status, setStatus] = useState<string>(existingStatus ?? 'IDLE');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for exporting this data.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('export-requests', { page, reason, params });
      setRequestId(res.data.id);
      setStatus('PENDING');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-navy/40 hover:text-navy transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-navy mb-2">Export Permission Required</h3>
        <p className="text-sm text-navy/60 mb-5">
          {status === 'IDLE'
            ? 'You need approval from SUPER ADMIN to export this data. Please explain why you need it.'
            : status === 'PENDING'
            ? 'Your request has been sent to SUPER ADMIN. You will be notified when it is approved.'
            : status === 'APPROVED'
            ? 'Your export request has been approved. You can now download.'
            : 'Your export request was rejected.'}
        </p>

        {status === 'IDLE' && (
          <>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder="Why do you need to export this data?"
              rows={4}
              className="w-full px-4 py-3 border border-navy/10 rounded-xl text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-navy/10 rounded-xl text-sm text-navy hover:bg-navy/5 transition-all">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy/90 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Request'}
              </button>
            </div>
          </>
        )}

        {status === 'PENDING' && (
          <div className="text-center py-4">
            <Clock className="w-12 h-12 text-gold mx-auto mb-3" />
            <p className="text-sm text-navy/60">Awaiting approval...</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 border border-navy/10 rounded-xl text-sm text-navy hover:bg-navy/5 transition-all">
              Close
            </button>
          </div>
        )}

        {status === 'APPROVED' && (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-navy/60 mb-4">Your request has been approved.</p>
            <button
              onClick={onApproved}
              className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all"
            >
              Download Now
            </button>
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="text-center py-4">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-navy/60">Your request was rejected by SUPER ADMIN.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 border border-navy/10 rounded-xl text-sm text-navy hover:bg-navy/5 transition-all">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
