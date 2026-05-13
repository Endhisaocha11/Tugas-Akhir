import React from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowDownToLine, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Settings2
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function FeedingHistory() {
  const historyData = [
    { id: '#4291', date: '13 May 2026', time: '07:00:24', cat: 'Luna', portion: '21g', actual: '21.04g', status: 'Success' },
    { id: '#4290', date: '12 May 2026', time: '19:00:12', cat: 'Luna', portion: '21g', actual: '21.01g', status: 'Success' },
    { id: '#4289', date: '12 May 2026', time: '13:12:05', cat: 'Luna', portion: '20g', actual: '19.82g', status: 'Warning' },
    { id: '#4288', date: '12 May 2026', time: '07:05:33', cat: 'Luna', portion: '21g', actual: '21.00g', status: 'Success' },
    { id: '#4287', date: '11 May 2026', time: '19:02:11', cat: 'Luna', portion: '21g', actual: '0.00g', status: 'Failed' },
    { id: '#4286', date: '11 May 2026', time: '13:00:03', cat: 'Luna', portion: '20g', actual: '20.05g', status: 'Success' },
  ];

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-text-main mb-1">Feeding History 📜</h2>
          <p className="text-gray-400">Audit trail of every single gram dispensed by the device.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary py-3 px-6 text-sm flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4" /> Export CSV
          </button>
          <button className="btn-primary py-3 px-8 text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Report Issue
          </button>
        </div>
      </div>

      <div className="card-premium p-0 overflow-hidden">
        <div className="p-8 border-b border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-secondary-warm/20">
           <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-2xl border border-amber-100 w-full md:w-96 shadow-sm">
             <Search className="w-4 h-4 text-gray-400" />
             <input type="text" placeholder="Search by date or status..." className="bg-transparent border-none outline-none text-sm w-full" />
           </div>
           
           <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-white rounded-xl border border-amber-100 text-xs font-bold text-gray-500 flex items-center gap-2 hover:border-primary/30 transition-all">
                <Filter className="w-3 h-3" /> All Status
              </button>
              <button className="px-4 py-2 bg-white rounded-xl border border-amber-100 text-xs font-bold text-gray-500 flex items-center gap-2 hover:border-primary/30 transition-all">
                 Today
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-bg-warm">
              <tr>
                {['Event ID', 'Date & Time', 'Cat Profile', 'Portion Target', 'Actual Yield', 'Status'].map((header) => (
                  <th key={header} className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[2px]">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {historyData.map((row, idx) => (
                <tr key={idx} className="group hover:bg-amber-50/30 transition-all cursor-default">
                  <td className="px-8 py-6 font-mono text-xs font-bold text-gray-400">{row.id}</td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-300" />
                        <div>
                           <p className="text-sm font-bold text-text-main">{row.date}</p>
                           <p className="text-[10px] text-gray-400 font-medium">{row.time}</p>
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary-warm flex items-center justify-center border border-amber-100">
                           <Cat className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-text-main">{row.cat}</span>
                     </div>
                  </td>
                  <td className="px-8 py-6">
                     <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">{row.portion}</span>
                  </td>
                  <td className="px-8 py-6">
                     <span className={cn(
                       "font-display font-black text-lg",
                       row.status === 'Success' ? "text-text-main" : "text-amber-500 opacity-50"
                     )}>{row.actual}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full w-fit border shadow-sm",
                      row.status === 'Success' ? "bg-green-50 border-green-100 text-green-500" :
                      row.status === 'Warning' ? "bg-amber-50 border-amber-100 text-amber-500" :
                      "bg-red-50 border-red-100 text-red-500"
                    )}>
                      {row.status === 'Success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      <span className="text-[10px] font-black uppercase tracking-wider">{row.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t border-amber-100 bg-bg-warm/50 flex justify-center">
           <div className="flex gap-2">
              <button className="w-10 h-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center font-bold text-text-main shadow-sm">1</button>
              <button className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center font-bold text-gray-400 hover:text-primary">2</button>
              <button className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center font-bold text-gray-400 hover:text-primary">3</button>
           </div>
        </div>
      </div>
    </div>
  );
}

import { Cat } from 'lucide-react';
