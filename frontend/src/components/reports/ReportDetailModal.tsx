'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Download, Table, CreditCard, Users, Calculator } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ReportModalProps {
  type: 'DAILY' | 'AMC' | 'GST' | 'TABLE';
  onClose: () => void;
}

export default function ReportDetailModal({ type, onClose }: ReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        let endpoint = '';
        if (type === 'DAILY') endpoint = 'reports/daily-summary';
        if (type === 'AMC') endpoint = 'reports/amc-defaulters';
        if (type === 'GST') endpoint = 'reports/gst-summary';
        if (type === 'TABLE') endpoint = 'reports/table-turnaround';

        const response = await api.get(endpoint);
        setData(response.data);
      } catch {
        toast.error('Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [type]);

  const getTitle = () => {
    if (type === 'DAILY') return 'Daily Sales Summary (Last 24h)';
    if (type === 'AMC') return 'AMC Defaulters';
    if (type === 'GST') return 'GST Filing Helper';
    if (type === 'TABLE') return 'Table Turnaround Efficiency';
    return 'System Report';
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center text-navy shadow-inner">
                {type === 'DAILY' ? <CreditCard size={24} /> : type === 'AMC' ? <Users size={24} /> : type === 'GST' ? <Calculator size={24} /> : <Table size={24} />}
             </div>
             <div>
                <h3 className="text-xl font-serif font-bold text-navy">{getTitle()}</h3>
                <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">Report Data</p>
             </div>
          </div>
          <div className="flex gap-4">
             <button onClick={() => window.print()} className="p-2.5 hover:bg-navy/5 rounded-xl transition-colors text-navy/40" title="Print/Export PDF">
                <Download size={20} />
             </button>
             <button onClick={onClose} className="p-2.5 hover:bg-navy/5 rounded-xl transition-colors text-slate/40">
                <X size={20} />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 print:p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <Loader2 className="animate-spin text-gold" size={48} />
               <p className="text-[10px] font-black text-slate/40 uppercase tracking-widest">Loading...</p>
            </div>
          ) : !data ? (
            <p className="text-center py-20 text-gray-400 font-medium">No data found.</p>
          ) : (
            <div className="space-y-8">
               {/* Daily Summary Render */}
               {type === 'DAILY' && (
                  <div className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.entries(data.summary || {}).map(([dept, stats]: any) => (
                           <div key={dept} className="bg-navy p-6 rounded-[2rem] text-white space-y-1">
                              <p className="text-[8px] font-black text-gold uppercase tracking-widest">{dept}</p>
                              <p className="text-2xl font-bold">₹ {stats.total.toLocaleString()}</p>
                              <p className="text-[9px] font-medium text-white/40 uppercase tracking-widest">{stats.count} Transactions</p>
                           </div>
                        ))}
                     </div>
                     <div className="border border-gray-100 rounded-3xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                           <thead className="bg-gray-50">
                              <tr>
                                 <th className="px-6 py-4 font-black uppercase tracking-widest">ID</th>
                                 <th className="px-6 py-4 font-black uppercase tracking-widest">Member</th>
                                 <th className="px-6 py-4 font-black uppercase tracking-widest text-right">Amount</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {(data.invoices || []).map((inv: any) => (
                                 <tr key={inv.id}>
                                    <td className="px-6 py-4 font-mono font-bold text-navy">{inv.invoiceNumber}</td>
                                    <td className="px-6 py-4 text-navy/60 font-medium">{inv.member?.nameAsAadhaar || inv.walkInGuest?.name || 'Guest'}</td>
                                    <td className="px-6 py-4 text-right font-bold text-navy">₹ {inv.total.toLocaleString()}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* AMC Defaulters Render */}
               {type === 'AMC' && (
                  <div className="border border-gray-100 rounded-3xl overflow-hidden">
                     <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50">
                           <tr>
                              <th className="px-6 py-4 font-black uppercase tracking-widest text-[9px]">Member</th>
                              <th className="px-6 py-4 font-black uppercase tracking-widest text-[9px]">ID</th>
                              <th className="px-6 py-4 font-black uppercase tracking-widest text-[9px]">Contact</th>
                              <th className="px-6 py-4 font-black uppercase tracking-widest text-[9px] text-right">Expiry</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {(data || []).map((m: any) => (
                              <tr key={m.id}>
                                 <td className="px-6 py-4 font-bold text-navy">{m.nameAsAadhaar}</td>
                                 <td className="px-6 py-4 font-mono text-gold">{m.membershipNumber}</td>
                                 <td className="px-6 py-4 text-navy/60 font-medium">{m.mobileNumber}</td>
                                 <td className="px-6 py-4 text-right font-black text-red-400">{new Date(m.expiryDate).toLocaleDateString()}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}

               {/* GST Helper Render */}
               {type === 'GST' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 space-y-6">
                        <div className="flex justify-between items-center">
                           <h4 className="text-xl font-serif font-bold text-navy italic">Basic (5%)</h4>
                           <span className="px-4 py-1 bg-white rounded-full text-[9px] font-black uppercase text-blue-600 border border-blue-100">Restaurant</span>
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between border-b border-blue-100 pb-2">
                              <p className="text-[10px] font-black text-navy/40 uppercase tracking-widest">Taxable Value</p>
                              <p className="font-bold text-navy">₹ {data.fivePercent.taxable.toLocaleString()}</p>
                           </div>
                           <div className="flex justify-between text-blue-600">
                              <p className="text-[10px] font-black uppercase tracking-widest">GST Accrued</p>
                              <p className="font-black">₹ {data.fivePercent.gst.toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                     <div className="p-8 bg-purple-50/50 rounded-[2.5rem] border border-purple-100 space-y-6">
                        <div className="flex justify-between items-center">
                           <h4 className="text-xl font-serif font-bold text-navy italic">Premium (18%)</h4>
                           <span className="px-4 py-1 bg-white rounded-full text-[9px] font-black uppercase text-purple-600 border border-purple-100">Dept/AMC</span>
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between border-b border-purple-100 pb-2">
                              <p className="text-[10px] font-black text-navy/40 uppercase tracking-widest">Taxable Value</p>
                              <p className="font-bold text-navy">₹ {data.eighteenPercent.taxable.toLocaleString()}</p>
                           </div>
                           <div className="flex justify-between text-purple-600">
                              <p className="text-[10px] font-black uppercase tracking-widest">GST Accrued</p>
                              <p className="font-black">₹ {data.eighteenPercent.gst.toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* Table Turnaround Render */}
               {type === 'TABLE' && (
                  <div className="border border-gray-100 rounded-3xl overflow-hidden">
                     <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50">
                           <tr>
                              <th className="px-6 py-4 font-black uppercase tracking-widest text-[9px]">Table Number</th>
                              <th className="px-6 py-4 font-black uppercase tracking-widest text-[9px]">Orders Processed</th>
                              <th className="px-6 py-4 font-black uppercase tracking-widest text-[9px] text-right">Avg. Duration (min)</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {(data || []).map((t: any, i: number) => (
                              <tr key={i}>
                                 <td className="px-6 py-4 font-bold text-navy">Table {t.table}</td>
                                 <td className="px-6 py-4 text-navy/60 font-medium">{t.orderCount} Transactions</td>
                                 <td className="px-6 py-4 text-right font-black text-gold">{t.avgDuration}m</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
