import {
  History,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCatData } from '../../lib/useCatData';
import { useState } from 'react';

const STATUS_MAP: Record<string, string> = {
  success: 'Success',
  failed: 'Failed',
  warning: 'Warning',
};

export function FeedingHistory() {
  const { cat, feedingLogs, loading } = useCatData();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'warning'>('all');
  const [filterToday, setFilterToday] = useState(false);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const profileUpdatedAt = cat?.profileUpdatedAt ?? 0;

  const rows = feedingLogs
    .filter((log) => {
      if (log.timestamp < profileUpdatedAt) return false;
      if (filterToday && log.timestamp < todayStart.getTime()) return false;
      if (filterStatus !== 'all' && log.status !== filterStatus) return false;
      if (search) {
        const dateStr = new Date(log.timestamp).toLocaleDateString('id-ID');
        const statusStr = STATUS_MAP[log.status] ?? log.status;
        if (
          !dateStr.includes(search) &&
          !statusStr.toLowerCase().includes(search.toLowerCase()) &&
          !(cat?.name ?? '').toLowerCase().includes(search.toLowerCase())
        )
          return false;
      }
      return true;
    })
    .map((log) => ({
      id: `#${String(feedingLogs.length - feedingLogs.indexOf(log)).padStart(4, '0')}`,
      date: new Date(log.timestamp).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      time: new Date(log.timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      cat: cat?.name ?? '—',
      portion: `${log.amountRequested}g`,
      actual: `${(log.amountDispensed ?? 0).toFixed(2)}g`,
      status: STATUS_MAP[log.status] ?? log.status,
      notes: log.notes,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-1 flex items-center gap-3">
            <History className="w-8 h-8 text-amber-500" />
            Riwayat Pemberian Makan
          </h2>
          <p className="text-gray-400">
            Rekam jejak setiap gram pakan yang dikeluarkan perangkat.
          </p>
        </div>
        <div className="text-sm text-gray-400 font-medium">
          {rows.length} event ditemukan
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100 w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari tanggal, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'success', 'warning', 'failed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-4 py-2 rounded-xl border text-xs font-bold transition-all',
                  filterStatus === s
                    ? 'bg-amber-400 text-white border-amber-400'
                    : 'bg-white text-gray-500 border-gray-100 hover:border-amber-200'
                )}
              >
                {s === 'all' ? 'Semua' : STATUS_MAP[s]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilterToday((v) => !v)}
              className={cn(
                'px-4 py-2 rounded-xl border text-xs font-bold transition-all',
                filterToday
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
              )}
            >
              Hari Ini
            </button>
          </div>
        </div>

        {/* Table */}
        {rows.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Belum ada riwayat pemberian makan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  {['Event ID', 'Tanggal & Waktu', 'Kucing', 'Target Porsi', 'Aktual', 'Tipe', 'Status'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[2px]"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/30 transition-all">
                    <td className="px-6 py-5 font-mono text-xs font-bold text-gray-400">
                      {row.id}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-300 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-gray-900">{row.date}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{row.time}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-gray-900">{row.cat}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                        {row.portion}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={cn(
                          'font-black text-lg',
                          row.status === 'Success' ? 'text-gray-900' : 'text-amber-500 opacity-60'
                        )}
                      >
                        {row.actual}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-semibold text-gray-500">
                        {row.notes === 'manual' ? 'Manual' : 'Terjadwal'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-full w-fit border shadow-sm',
                          row.status === 'Success'
                            ? 'bg-green-50 border-green-100 text-green-500'
                            : row.status === 'Warning'
                            ? 'bg-amber-50 border-amber-100 text-amber-500'
                            : 'bg-red-50 border-red-100 text-red-500'
                        )}
                      >
                        {row.status === 'Success' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {row.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
