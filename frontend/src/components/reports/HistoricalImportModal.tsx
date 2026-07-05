'use client';

import React, { useState } from 'react';
import { X, Upload, Loader2, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function HistoricalImportModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('reports/import/revenue', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
      toast.success(`Imported ${response.data.imported} records`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Amount,Date,Department,InvoiceNo\n50000,2026-01-15,MEMBERSHIP,HIST-001\n2500,2026-01-20,RESTAURANT,HIST-002";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "stellaar_revenue_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="fixed inset-0 bg-navy/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-navy">Import Data</h2>
            <p className="text-slate text-xs font-bold uppercase tracking-wider opacity-60">Import Old Records</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-slate" />
          </button>
        </div>

        <div className="p-8">
          {!result ? (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-2xl flex gap-4 items-start">
                <AlertCircle className="text-blue-600 shrink-0" size={20} />
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                  Use this to add old financial records to your reports.
                </p>
              </div>

              <div 
                className={`border-2 border-dashed rounded-[2rem] p-12 text-center transition-all ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gold'}`}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${file ? 'bg-green-500 text-white' : 'bg-gray-100 text-slate'}`}>
                    <Upload size={32} />
                  </div>
                  {file ? (
                    <div className="space-y-1">
                      <p className="font-bold text-navy">{file.name}</p>
                      <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">File Ready</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-bold text-gray-500">Drop file here or click to browse</p>
                      <p className="text-[10px] text-slate/40 font-black uppercase tracking-widest">Supports CSV, XLSX</p>
                    </div>
                  )}
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={downloadTemplate}
                  className="flex-1 py-4 px-6 border border-navy/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-navy hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  Get Template
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-[2] py-4 px-6 bg-navy text-gold rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-navy/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Import
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6 py-4">
              <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-navy">Import Done</h3>
                <p className="text-slate text-sm font-medium mt-1">
                  Successfully imported {result.imported} records.
                </p>
              </div>
              {result.errors.length > 0 && (
                <div className="text-left bg-red-50 p-4 rounded-xl max-h-32 overflow-y-auto">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Warnings ({result.errors.length})</p>
                  {result.errors.map((err: string, i: number) => (
                    <p key={i} className="text-[10px] text-red-500 font-medium leading-tight">• {err}</p>
                  ))}
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-4 bg-gray-100 text-navy rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
