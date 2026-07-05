'use client';

import React, { useState, useCallback, useContext, useEffect } from 'react';
import { Download } from 'lucide-react';
import { exportToCSV, exportToExcel } from '@/lib/export';
import ExportPermissionModal from './ExportPermissionModal';
import { SocketContext } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

interface ExportButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  disabled?: boolean;
  className?: string;
  pageName?: string;
}

export default function ExportButton({ filename, headers, rows, disabled, className = '', pageName }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [requestStatus, setRequestStatus] = useState<string>('IDLE');

  const { user } = useAuth();
  const socketData = useContext(SocketContext);

  useEffect(() => {
    if (!socketData?.exportApprovals) return;
    const match = socketData.exportApprovals.find(
      (a: { requestId: number; status: string }) => a.requestId === pendingRequestId
    );
    if (match) {
      setRequestStatus(match.status);
    }
  }, [socketData?.exportApprovals, pendingRequestId]);

  const canExportDirectly = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const doExport = useCallback((format: 'csv' | 'excel') => {
    if (format === 'csv') {
      exportToCSV(filename, headers, rows);
    } else {
      exportToExcel(filename, headers, rows);
    }
    setOpen(false);
    setShowPermissionModal(false);
  }, [filename, headers, rows]);

  const handleClick = () => {
    if (canExportDirectly) {
      setOpen(true);
    } else {
      setShowPermissionModal(true);
    }
  };

  const handleApproved = () => {
    doExport('csv');
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`flex items-center gap-2 px-4 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl text-sm font-semibold hover:bg-gold/20 transition-all disabled:opacity-40 ${className}`}
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-2 z-20 bg-white border border-navy/10 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
              <button
                onClick={() => doExport('csv')}
                className="w-full px-4 py-2.5 text-left text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                Export as CSV
              </button>
              <button
                onClick={() => doExport('excel')}
                className="w-full px-4 py-2.5 text-left text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                Export as Excel
              </button>
            </div>
          </>
        )}
      </div>

      {showPermissionModal && (
        <ExportPermissionModal
          page={pageName || filename}
          onClose={() => { setShowPermissionModal(false); setRequestStatus('IDLE'); setPendingRequestId(null); }}
          onApproved={handleApproved}
          requestId={pendingRequestId ?? undefined}
          requestStatus={requestStatus}
        />
      )}
    </>
  );
}
