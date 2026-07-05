'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ total: number; imported: number; skipped: number; errors: string[] } | null>(null);

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
      const response = await api.post('members/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(response.data);
      if (response.data.imported > 0) {
        toast.success(`Successfully imported ${response.data.imported} members`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold shadow-inner">
                <FileSpreadsheet size={24} />
             </div>
             <div>
                <h3 className="text-xl font-serif font-bold text-navy">Bulk Member Import</h3>
                <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">Excel Registry Upload</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-navy/5 rounded-full transition-colors text-slate/40 hover:text-navy">
            <X size={20} />
          </button>
        </div>

        <div className="p-10">
          {!results ? (
            <div className="space-y-8">
               <div className="bg-navy/5 p-8 rounded-[2rem] border-2 border-dashed border-gold/20 text-center space-y-4 group hover:border-gold transition-all">
                  <input 
                    type="file" 
                    id="excel-upload" 
                    className="hidden" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  <label htmlFor="excel-upload" className="cursor-pointer block">
                     <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-gold shadow-lg group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                     </div>
                     <p className="text-sm font-bold text-navy">{file ? file.name : 'Select Estate Registry (.xlsx)'}</p>
                     <p className="text-[10px] text-slate/40 font-black uppercase tracking-widest mt-2">Maximum file size: 5MB</p>
                  </label>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-navy uppercase tracking-widest px-2">Required Fields Specification</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {['Full name', 'Mobile no', 'email', 'DOB', 'MEMBERSHIP TIER', 'SERIAL NUMBER', 'Address', 'AADHAAR NO'].map(field => (
                        <div key={field} className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-bold text-slate/60 text-center">
                           {field}
                        </div>
                     ))}
                  </div>
               </div>

               <button
                 onClick={handleUpload}
                 disabled={!file || uploading}
                 className="w-full py-5 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50"
               >
                 {uploading ? (
                   <><Loader2 className="animate-spin" size={18} /> Processing Node...</>
                 ) : (
                   <><Upload size={18} /> Transmit Registry Data</>
                 )}
               </button>
            </div>
          ) : (
            <div className="space-y-8">
               <div className="grid grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-6 rounded-[2rem] text-center space-y-1 border border-gray-100 shadow-sm">
                     <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest">Total Nodes</p>
                     <p className="text-3xl font-serif font-bold text-navy">{results.total}</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-[2rem] text-center space-y-1 border border-green-100 shadow-sm">
                     <p className="text-[9px] font-black text-green-400 uppercase tracking-widest">Imported</p>
                     <p className="text-3xl font-serif font-bold text-green-600">{results.imported}</p>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-[2rem] text-center space-y-1 border border-orange-100 shadow-sm">
                     <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Skipped</p>
                     <p className="text-3xl font-serif font-bold text-orange-600">{results.skipped}</p>
                  </div>
               </div>

               {results.errors.length > 0 && (
                 <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-xl shadow-navy/5">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                       <AlertCircle size={14} className="text-orange-500" />
                       <p className="text-[9px] font-black text-navy uppercase tracking-widest">Conflict Resolution Logs</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-6 space-y-3">
                       {results.errors.slice(0, 10).map((err, i) => (
                         <div key={i} className="flex gap-3 text-[10px] text-slate/60 font-medium border-b border-gray-50 pb-2 last:border-0">
                            <span className="text-gold font-bold"># {i + 1}</span>
                            <p>{err}</p>
                         </div>
                       ))}
                       {results.errors.length > 10 && (
                         <p className="text-[9px] font-black text-slate/30 uppercase text-center pt-2 italic">... and {results.errors.length - 10} more conflicts suppressed</p>
                       )}
                    </div>
                 </div>
               )}

               <button
                 onClick={() => {
                   onSuccess();
                   onClose();
                 }}
                 className="w-full py-5 bg-navy text-gold rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
               >
                 Acknowledge & Close <CheckCircle2 size={18} />
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
