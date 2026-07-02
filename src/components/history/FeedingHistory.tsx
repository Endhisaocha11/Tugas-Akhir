import {
  History,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarDays,
  Cat,
  Settings2,
  Flag,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCatData } from '../../lib/useCatData';
import { getCurrentProfilePeriods, isTimestampInPeriods } from '../../lib/profilePeriods';
import { useState, useMemo } from 'react';

const STATUS_MAP: Record<string, string> = {
  success: 'Sukses',
  failed: 'Gagal',
  warning: 'Peringatan',
  sent: 'Peringatan',
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

function FilterSelect({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
        {icon}
        {label}
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm font-medium text-gray-700 cursor-pointer focus:outline-none focus:border-amber-400 transition-colors"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

type DisplayRow = {
  id: string;
  date: string;
  time: string;
  cat: string;
  portion: string;
  actual: string;
  status: string;
  notes: string;
  isMatch: boolean;
  timestamp: number;
};

export function FeedingHistory() {
  const { cat, feedingLogs, profileHistory, loading } = useCatData();
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'scheduled'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'warning'>('all');

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStartMs = todayStart.getTime();

  // Semua periode saat profil kucing yang SEDANG AKTIF pernah aktif — termasuk
  // periode lampau kalau profil ini pernah diganti ke profil lain lalu
  // di-restore/diaktifkan kembali. Ini menggantikan cutoff tunggal
  // `profileUpdatedAt` yang sebelumnya menyembunyikan riwayat lama milik
  // profil yang sama saat profil tsb diaktifkan lagi.
  const activePeriods = useMemo(
    () => getCurrentProfilePeriods(cat, profileHistory),
    [cat, profileHistory]
  );
  void todayStartMs; // dipertahankan untuk kemungkinan filter "hari ini" di masa depan

  const toDateKey = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const dateOptions = useMemo(() => {
    const dates = new Set<string>();
    feedingLogs.forEach((log) => {
      if (cat?.id && log.catId !== cat.id) return;
      // Hanya tanggal yang punya log milik profil kucing yang SEDANG aktif —
      // termasuk periode-periode lampau kalau profil ini pernah non-aktif lalu
      // diaktifkan kembali (lihat getCurrentProfilePeriods).
      if (!isTimestampInPeriods(log.timestamp, activePeriods)) return;
      dates.add(toDateKey(log.timestamp));
    });
    return Array.from(dates).sort().reverse();
  }, [feedingLogs, cat?.id, activePeriods]);

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isFiltered =
    search !== '' || filterDate !== '' || filterType !== 'all' || filterStatus !== 'all';

  const resetFilters = () => {
    setSearch('');
    setFilterDate('');
    setFilterType('all');
    setFilterStatus('all');
  };

  const rows = useMemo((): DisplayRow[] => {
    const seen = new Set<string>();
    return feedingLogs
      .filter((log) => {
        if (cat?.id && log.catId !== cat.id) return false;
        // Batasi ke log milik profil kucing yang SEDANG aktif saja.
        // Karena 1 owner hanya punya 1 dokumen cat (id tetap sama saat ganti
        // profil), catId TIDAK cukup untuk membedakan profil lama vs baru —
        // dipakai seluruh periode aktif profil ini (activePeriods), bukan
        // cutoff tunggal. Contoh: profil "Momo" aktif jam 01–09, diganti ke
        // "Yudi" jam 10, lalu "Momo" diaktifkan lagi jam 15 → log "Momo" dari
        // jam 01–09 DAN dari jam 15-sekarang sama-sama tampil.
        if (!isTimestampInPeriods(log.timestamp, activePeriods)) return false;
        const ts1s = Math.floor(log.timestamp / 1_000) * 1_000;
        const key = `${log.catId}|${ts1s}|${log.amountRequested}|${log.notes}|${log.status}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((log) => {
        if (filterDate) {
          if (toDateKey(log.timestamp) !== filterDate) return false;
        }
        if (filterType !== 'all') {
          const isManual = log.notes === 'manual';
          if (filterType === 'manual' && !isManual) return false;
          if (filterType === 'scheduled' && isManual) return false;
        }
        if (filterStatus !== 'all') {
          const raw = (log.status as string)?.toLowerCase?.() ?? '';
          const normalized = raw === 'sent' ? 'warning' : raw;
          if (normalized !== filterStatus) return false;
        }
        if (search) {
          const dateStr = new Date(log.timestamp).toLocaleDateString('id-ID');
          const statusStr = STATUS_MAP[log.status] ?? log.status;
          const idStr = String(feedingLogs.indexOf(log) + 1).padStart(4, '0');
          if (
            !dateStr.includes(search) &&
            !statusStr.toLowerCase().includes(search.toLowerCase()) &&
            !(cat?.name ?? '').toLowerCase().includes(search.toLowerCase()) &&
            !idStr.includes(search)
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
        time: (() => {
          const d = new Date(log.timestamp);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        })(),
        cat: cat?.name ?? '—',
        portion: `${log.amountRequested}g`,
        actual: `${(log.amountDispensed ?? 0).toFixed(1)}g`,
        status: STATUS_MAP[log.status] ?? log.status,
        notes: log.notes === 'manual' ? 'Manual' : 'Terjadwal',
        isMatch: Number((log.amountDispensed ?? 0).toFixed(1)) >= log.amountRequested * 0.9,
        timestamp: log.timestamp,
      }));
  }, [feedingLogs, cat?.id, activePeriods, filterDate, filterType, filterStatus, search, cat?.name]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/load.gif" alt="loading" className="h-24 w-auto object-contain" />
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
        <span className="text-sm text-gray-400 font-medium shrink-0">{rows.length} event</span>
      </div>

      {/* Filter card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 flex flex-col gap-4">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari Event ID, tanggal, atau nama kucing..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FilterSelect
              icon={<CalendarDays className="w-3.5 h-3.5" />}
              label="Tanggal"
              value={filterDate}
              onChange={setFilterDate}
              options={[
                { value: '', label: 'Semua Tanggal' },
                ...dateOptions.map((d) => ({ value: d, label: formatDateLabel(d) })),
              ]}
            />
            <FilterSelect
              icon={<Cat className="w-3.5 h-3.5" />}
              label="Kucing"
              value={cat?.id ?? ''}
              onChange={() => {}}
              options={[{ value: cat?.id ?? '', label: cat?.name ?? 'Semua Kucing' }]}
            />
            <FilterSelect
              icon={<Settings2 className="w-3.5 h-3.5" />}
              label="Tipe Feeding"
              value={filterType}
              onChange={(v) => setFilterType(v as typeof filterType)}
              options={[
                { value: 'all', label: 'Semua Tipe' },
                { value: 'manual', label: 'Manual' },
                { value: 'scheduled', label: 'Terjadwal' },
              ]}
            />
            <FilterSelect
              icon={<Flag className="w-3.5 h-3.5" />}
              label="Status"
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as typeof filterStatus)}
              options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'success', label: 'Sukses' },
                { value: 'warning', label: 'Peringatan' },
                { value: 'failed', label: 'Gagal' },
              ]}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
                isFiltered
                  ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  : 'border-gray-100 text-gray-300 cursor-default'
              )}
              disabled={!isFiltered}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filter
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
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-gray-400">{row.id}</span>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm font-bold">{row.date}</span>
                    <span className="text-sm font-bold text-amber-600">{row.time}</span>
                  </div>
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
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{row.date}</p>
                            <p className="text-xs font-bold text-amber-600">{row.time}</p>
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