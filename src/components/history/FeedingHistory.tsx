import {
  History,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCatData } from '../../lib/useCatData';
import { useState } from 'react';

const STATUS_MAP: Record<string, string> = {
  success: 'Sukses',
  failed: 'Gagal',
  warning: 'Peringatan',
};

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === 'Sukses';
  const isWarning = status === 'Peringatan';
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider w-fit',
        isSuccess
          ? 'bg-green-50 border-green-100 text-green-600'
          : isWarning
          ? 'bg-amber-50 border-amber-100 text-amber-600'
          : 'bg-red-50 border-red-100 text-red-500'
      )}
    >
      {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {status}
    </div>
  );
}

export function FeedingHistory() {
  const { cat, feedingLogs, loading } = useCatData();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'warning'>('all');
  const [filterToday, setFilterToday] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
    .map((log, _, arr) => ({
      id: `#${String(arr.length - arr.indexOf(log)).padStart(4, '0')}`,
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
      actual: `${(log.amountDispensed ?? 0).toFixed(1)}g`,
      status: STATUS_MAP[log.status] ?? log.status,
      notes: log.notes === 'manual' ? 'Manual' : 'Terjadwal',
      isMatch:
        Number((log.amountDispensed ?? 0).toFixed(1)) >= log.amountRequested * 0.9,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2.5">
            <History className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 shrink-0" />
            Riwayat Pemberian Makan
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Rekam jejak setiap gram pakan yang dikeluarkan perangkat.
          </p>
        </div>
        <span className="text-sm text-gray-400 font-medium shrink-0">
          {rows.length} event
        </span>
      </div>

      {/* Filter card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 flex flex-col gap-3">
          {/* Search + toggle filter button */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 flex-1 min-w-0">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Cari tanggal, status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full min-w-0"
              />
            </div>
            {/* Mobile: toggle filter chips */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'sm:hidden px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                showFilters
                  ? 'bg-amber-400 text-white border-amber-400'
                  : 'bg-gray-50 text-gray-500 border-gray-100'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
            </button>
          </div>

          {/* Filter chips — always visible on sm+, toggle on mobile */}
          <div className={cn('flex flex-wrap gap-2', showFilters ? 'flex' : 'hidden sm:flex')}>
            {(['all', 'success', 'warning', 'failed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 py-1.5 rounded-xl border text-xs font-bold transition-all',
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
                'px-3 py-1.5 rounded-xl border text-xs font-bold transition-all',
                filterToday
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
              )}
            >
              Hari Ini
            </button>
          </div>
        </div>

        {/* Empty state */}
        {rows.length === 0 ? (
          <div className="py-16 text-center text-gray-400 border-t border-gray-50">
            <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-sm">Belum ada riwayat pemberian makan.</p>
          </div>
        ) : (
          <>
            {/* ── Mobile: card list ── */}
            <div className="md:hidden divide-y divide-gray-50 border-t border-gray-50">
              {rows.map((row, idx) => (
                <div key={idx} className="px-4 py-4 flex flex-col gap-2">
                  {/* Top row: id + status */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-gray-400">{row.id}</span>
                    <StatusBadge status={row.status} />
                  </div>

                  {/* Date + time */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span className="text-sm font-bold">{row.date}</span>
                    <span className="text-xs text-gray-400">{row.time}</span>
                  </div>

                  {/* Metrics row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">Target</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                        {row.portion}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400">Aktual</span>
                      <span
                        className={cn(
                          'text-sm font-black',
                          row.isMatch ? 'text-gray-900' : 'text-amber-500'
                        )}
                      >
                        {row.actual}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full',
                        row.notes === 'Manual'
                          ? 'bg-blue-50 text-blue-500'
                          : 'bg-purple-50 text-purple-500'
                      )}
                    >
                      {row.notes}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop: table ── */}
            <div className="hidden md:block overflow-x-auto border-t border-gray-50">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    {['Event ID', 'Tanggal & Waktu', 'Kucing', 'Target', 'Aktual', 'Tipe', 'Status'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-gray-400 whitespace-nowrap">
                        {row.id}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{row.date}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{row.time}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-gray-900">{row.cat}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                          {row.portion}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'font-black text-base',
                            row.isMatch ? 'text-gray-900' : 'text-amber-500'
                          )}
                        >
                          {row.actual}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'text-xs font-semibold px-2.5 py-1 rounded-full',
                            row.notes === 'Manual'
                              ? 'bg-blue-50 text-blue-500'
                              : 'bg-purple-50 text-purple-500'
                          )}
                        >
                          {row.notes}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
