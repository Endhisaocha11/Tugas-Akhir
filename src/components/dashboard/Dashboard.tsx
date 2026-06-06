import { useState, useMemo } from 'react';
import { Layers, AlertCircle, Weight, Wifi, WifiOff, Settings2, X, Copy, Check, Link2, Clock, Info, TrendingUp, Activity, BarChart3, PieChart as PieIcon, Calendar, ChevronLeft, ChevronRight, Utensils } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useCatData } from '../../lib/useCatData';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types';
import type { FeedingLog } from '../../types';

function getBodyLabel(bc: number): string {
  if (bc <= 2) return 'Sangat Kurus';
  if (bc <= 4) return 'Kurus';
  if (bc <= 5) return 'Normal';
  if (bc <= 7) return 'Overweight';
  return 'Obesitas';
}

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

type FeedStatus = 'overfeed'|'met'|'under'|'none'|'future'|'today-overfeed'|'today-met'|'today-under'|'today-none';
function getFeedStatus(date: Date, logsByDay: Record<string, FeedingLog[]>, dailyTarget: number): FeedStatus {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isPast  = date < now && !isToday;
  if (!isToday && !isPast) return 'future';
  const key   = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const logs  = logsByDay[key] ?? [];
  const total = logs.reduce((s, l) => s + (l.amountDispensed ?? 0), 0);
  if (total === 0)               return isToday ? 'today-none'     : 'none';
  if (dailyTarget === 0)         return isToday ? 'today-met'      : 'met';
  if (total > dailyTarget)       return isToday ? 'today-overfeed' : 'overfeed';
  if (total >= dailyTarget*0.85) return isToday ? 'today-met'      : 'met';
  return isToday ? 'today-under' : 'under';
}
const STATUS_STYLE: Record<FeedStatus, string> = {
  'overfeed':       'bg-red-400 text-white border-red-500 hover:bg-red-500',
  'met':            'bg-green-400 text-white border-green-500 hover:bg-green-500',
  'under':          'bg-yellow-300 text-yellow-900 border-yellow-400 hover:bg-yellow-400',
  'none':           'bg-gray-100 text-gray-400 border-gray-200',
  'future':         'bg-gray-50 text-gray-300 border-gray-100 cursor-default',
  'today-overfeed': 'bg-red-500 text-white border-red-600 ring-2 ring-red-400 ring-offset-1',
  'today-met':      'bg-green-500 text-white border-green-600 ring-2 ring-green-400 ring-offset-1',
  'today-under':    'bg-yellow-400 text-white border-yellow-500 ring-2 ring-yellow-300 ring-offset-1',
  'today-none':     'bg-blue-500 text-white border-blue-600 ring-2 ring-blue-400 ring-offset-1',
};

function FeedingCalendarAnalytics({ feedingLogs, dailyTarget }: { feedingLogs: FeedingLog[]; dailyTarget: number }) {
  const [viewDate, setViewDate]   = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const logsByDay: Record<string, FeedingLog[]> = {};
  feedingLogs.forEach((log) => {
    const d   = new Date(log.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!logsByDay[key]) logsByDay[key] = [];
    logsByDay[key].push(log);
  });
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const selectedKey  = selectedDay ? `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}` : null;
  const selectedLogs = (selectedKey ? logsByDay[selectedKey] ?? [] : []).sort((a, b) => a.timestamp - b.timestamp);
  const selectedTotal  = selectedLogs.reduce((s, l) => s + (l.amountDispensed ?? 0), 0);
  const selectedStatus = selectedDay ? getFeedStatus(selectedDay, logsByDay, dailyTarget) : null;
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h4 className="text-base font-black text-gray-800 flex items-center gap-2">
            <Calendar className="text-green-500 w-4 h-4" /> Kalender Pemberian Pakan
          </h4>
          <p className="text-xs text-gray-400 mt-0.5">🟢 Terpenuhi · 🟡 Kurang · 🔴 Overfeeding</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" title="Bulan sebelumnya"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-xs font-bold text-gray-600 w-28 text-center">{MONTHS_ID[month]} {year}</span>
          <button type="button" title="Bulan berikutnya"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-7 mb-1.5">
            {DAYS_ID.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const status    = getFeedStatus(date, logsByDay, dailyTarget);
              const isSelected = selectedDay?.toDateString() === date.toDateString();
              const key2      = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const dayTotal  = (logsByDay[key2] ?? []).reduce((s, l) => s + (l.amountDispensed ?? 0), 0);
              return (
                <button key={i} type="button"
                  title={`${date.getDate()} ${MONTHS_ID[date.getMonth()]} — ${dayTotal}g`}
                  onClick={() => status !== 'future' ? setSelectedDay(date) : undefined}
                  className={cn('h-9 w-full rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5',
                    STATUS_STYLE[status], isSelected && 'ring-2 ring-offset-1 ring-gray-500 scale-110')}>
                  <span>{date.getDate()}</span>
                  {dayTotal > 0 && <span className="text-[8px] opacity-75 leading-none">{dayTotal}g</span>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {[{ color:'bg-green-400', label:'Terpenuhi (≥85%)' },{ color:'bg-yellow-300', label:'Kurang' },
              { color:'bg-red-400', label:'Overfeeding' },{ color:'bg-gray-200', label:'Tidak ada' }].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={cn('w-2.5 h-2.5 rounded shrink-0', color)} />
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-44 shrink-0">
          <AnimatePresence mode="wait">
            {selectedDay ? (
              <motion.div key={selectedDay.toDateString()} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:8 }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-black text-gray-700">
                      {selectedDay.toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {selectedDay.toLocaleDateString('id-ID', { weekday:'long' })}
                    </p>
                  </div>
                  <button type="button" title="Tutup" onClick={() => setSelectedDay(null)}
                    className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
                <div className={cn('px-2.5 py-1 rounded-full text-xs font-black inline-block mb-2',
                  selectedStatus?.includes('overfeed') ? 'bg-red-100 text-red-700' :
                  selectedStatus?.includes('met')      ? 'bg-green-100 text-green-700' :
                  selectedStatus?.includes('under')    ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500')}>
                  {selectedStatus?.includes('overfeed') ? '🔴 Overfeeding' :
                   selectedStatus?.includes('met')      ? '🟢 Terpenuhi' :
                   selectedStatus?.includes('under')    ? '🟡 Kurang' : '— Tidak ada'}
                </div>
                <p className="text-xl font-black text-gray-800 mb-0.5">{selectedTotal}g</p>
                {dailyTarget > 0 && (
                  <p className="text-xs text-gray-400 mb-2">dari {dailyTarget}g ({Math.round((selectedTotal/dailyTarget)*100)}%)</p>
                )}
                <div className="space-y-1 overflow-y-auto max-h-44">
                  {selectedLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-2.5 py-2 border border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', log.notes==='manual' ? 'bg-blue-400' : 'bg-amber-400')} />
                        <span className="text-xs font-bold text-gray-600">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-amber-600">{log.amountDispensed}g</span>
                        <span className="text-[9px] text-gray-400 ml-1">{log.notes==='manual'?'M':'A'}</span>
                      </div>
                    </div>
                  ))}
                  {selectedLogs.length === 0 && (
                    <div className="flex flex-col items-center py-4 text-center">
                      <Utensils className="w-6 h-6 text-gray-200 mb-1" />
                      <p className="text-[10px] text-gray-400">Tidak ada pemberian</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="placeholder" initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="flex flex-col items-center justify-center h-full py-8 text-center">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400">Klik tanggal<br />untuk detail</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Cat Monitoring Card ───────────────────────────────────────────────────────

function CatMonitoringCard({ feedingLogs, bowlWeight, catName, catPhotoUrl }: {
  feedingLogs: { timestamp: number; amountDispensed: number; notes?: string }[];
  bowlWeight: number;
  catName: string;
  catPhotoUrl?: string;
}) {
  const lastLog = feedingLogs[0];
  const minsAgo = lastLog ? Math.floor((Date.now() - lastLog.timestamp) / 60000) : null;
  const isRecent = minsAgo !== null && minsAgo < 120;

  // Eating detection from bowl weight vs last dispensed
  const dispensed = lastLog?.amountDispensed ?? 0;
  const remaining = dispensed > 0 ? Math.max(0, Math.min(dispensed, bowlWeight)) : Math.max(0, bowlWeight);
  const eaten = dispensed > 0 ? Math.max(0, Math.round(dispensed - remaining)) : 0;
  const eatenPct = dispensed > 0 ? Math.min(100, Math.round((eaten / dispensed) * 100)) : 0;
  const catAte = eaten > 0 && isRecent;

  const statusLabel = !lastLog ? 'Tidak Ada Data'
    : catAte ? 'Makan Terdeteksi' : isRecent ? 'Menunggu' : 'Tidak Ada Data';
  const statusColor = statusLabel === 'Makan Terdeteksi'
    ? 'bg-green-500 text-white'
    : statusLabel === 'Menunggu'
    ? 'bg-yellow-400 text-yellow-900'
    : 'bg-gray-500 text-gray-300';

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐱</span>
          <p className="text-sm font-black text-gray-700">Monitoring Kucing</p>
        </div>
        <span className={cn('text-xs font-black px-2.5 py-1 rounded-full', statusColor)}>
          {statusLabel === 'Makan Terdeteksi' ? '🍽️ Makan Terdeteksi'
           : statusLabel === 'Menunggu' ? '⏳ Menunggu'
           : '— Tidak Ada Data'}
        </span>
      </div>

      {/* Cat info + eating summary */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full bg-amber-100 overflow-hidden border-2 border-amber-200">
            <img
              src={catPhotoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${catName}`}
              alt={catName}
              className="w-full h-full object-cover"
            />
          </div>
          {catAte && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-base text-gray-900">{catName}</p>
          {lastLog ? (
            <div className="mt-1.5 space-y-1.5">
              {/* Eating progress for latest feed */}
              {dispensed > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">Pakan terakhir: {dispensed}g</span>
                    <span className={cn('text-[10px] font-black', catAte ? 'text-green-500' : 'text-gray-400')}>
                      {catAte ? `Dimakan ${eaten}g (${eatenPct}%)` : `Sisa ${Math.round(remaining)}g`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', catAte ? 'bg-green-400' : 'bg-gray-300')}
                      style={{ width: `${eatenPct}%` }}
                    />
                  </div>
                </>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">
                  {new Date(lastLog.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {minsAgo !== null && (
                    <span className="text-gray-400">
                      {' '}({minsAgo < 60 ? `${minsAgo} mnt lalu` : `${Math.floor(minsAgo / 60)} jam lalu`})
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Belum ada riwayat pemberian</p>
          )}
        </div>
      </div>

      {/* Berat mangkuk saat ini */}
      {lastLog && (
        <div className="flex items-center justify-between bg-blue-50 rounded-2xl px-4 py-2.5 border border-blue-100">
          <div className="flex items-center gap-2">
            <span className="text-base">⚖️</span>
            <span className="text-xs font-bold text-blue-700">Berat di mangkuk sekarang</span>
          </div>
          <span className="text-sm font-black text-blue-600">{Math.max(0, Math.round(bowlWeight))}g</span>
        </div>
      )}

      {/* Riwayat Pakan & Makan */}
      {feedingLogs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Riwayat Pakan & Makan</p>
          {feedingLogs.slice(0, 4).map((log, idx) => {
            const isLatest = idx === 0;
            const logTime = new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const logEaten = isLatest ? eaten : null;
            const logEatenPct = isLatest ? eatenPct : null;
            const logRemaining = isLatest ? Math.round(remaining) : null;

            return (
              <div key={log.timestamp} className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 space-y-2">
                {/* Row: waktu + jenis + jumlah */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', log.notes === 'manual' ? 'bg-blue-400' : 'bg-amber-400')} />
                    <span className="text-xs font-bold text-gray-700">{logTime}</span>
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                      log.notes === 'manual' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                    )}>
                      {log.notes === 'manual' ? 'Manual' : 'Otomatis'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-600">{log.amountDispensed}g diberikan</span>
                </div>

                {/* Eating indicator - hanya untuk log terbaru (pakai data real bowl weight) */}
                {isLatest && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', (logEaten ?? 0) > 0 ? 'bg-green-400' : 'bg-gray-300')}
                        style={{ width: `${logEatenPct ?? 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">
                        Sisa di mangkuk: <span className="font-bold text-gray-500">{logRemaining}g</span>
                      </span>
                      <span className={cn('text-[10px] font-black', (logEaten ?? 0) > 0 ? 'text-green-500' : 'text-gray-400')}>
                        {(logEaten ?? 0) > 0
                          ? `✅ ${logEaten}g dimakan`
                          : '⏳ Belum dimakan'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Older logs: dianggap sudah dimakan (mangkuk sudah berubah) */}
                {!isLatest && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 flex-1 bg-green-200 rounded-full" />
                    <span className="text-[10px] text-green-500 font-bold shrink-0">✅ Sudah dimakan</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === UserRole.SUPER_ADMIN;
  const { cat, device, feedingLogs, targetOwnerId, loading } = useCatData();

  // Connect device modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyUID = () => {
    navigator.clipboard.writeText(targetOwnerId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Filter state ─────────────────────────────────────
  type FilterMode = 'all' | 'today' | 'date';
  const [filterMode, setFilterMode] = useState<FilterMode>('today');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // ── Weekly consumption chart mode ────────────────────
  type WeeklyMode = '7d' | 'month' | 'year';
  const [weeklyMode, setWeeklyMode] = useState<WeeklyMode>('7d');

  const todayStr = new Date().toISOString().split('T')[0];
  const profileUpdatedAt = cat?.profileUpdatedAt ?? 0;

  // Semua log milik kucing aktif — tanpa filter waktu (untuk chart mingguan)
  const allCatLogs = useMemo(
    () => feedingLogs.filter((l) => l.catId === cat?.id),
    [feedingLogs, cat?.id]
  );
  // Log sejak profil terakhir diperbarui — untuk filter harian & progress
  const catLogs = useMemo(
    () => allCatLogs.filter((l) => l.timestamp >= profileUpdatedAt),
    [allCatLogs, profileUpdatedAt]
  );
  const hiddenLogsCount = allCatLogs.length - catLogs.length;

  // Log aktif berdasarkan filter yang dipilih
  const activeLogs = useMemo(() => {
    if (filterMode === 'all') return catLogs;
    const dateStr = filterMode === 'today' ? todayStr : selectedDate;
    const start = new Date(dateStr + 'T00:00:00').getTime();
    const end   = new Date(dateStr + 'T23:59:59.999').getTime();
    return catLogs.filter((l) => l.timestamp >= start && l.timestamp <= end);
  }, [filterMode, selectedDate, catLogs, todayStr]);

  const selectedTotal = Math.round(
    activeLogs.reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0)
  );

  const dailyTarget = cat?.dailyGramTarget ?? 0;
  const progressPct =
    dailyTarget > 0 ? Math.min(Math.round((selectedTotal / dailyTarget) * 100), 100) : 0;
  const foodStock = device?.foodStockLevel ?? 0;


  // ── Consumption chart data — mode-aware ──────────────────────────────────────
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const consumptionChartData = useMemo(() => {
    const now = new Date();
    if (weeklyMode === '7d') {
      const map: Record<string, number> = {};
      allCatLogs.forEach((log) => {
        const daysAgo = Math.floor((Date.now() - log.timestamp) / 86400000);
        if (daysAgo < 7) {
          const lbl = DAYS_ID[new Date(log.timestamp).getDay()];
          map[lbl] = (map[lbl] ?? 0) + (log.amountDispensed ?? 0);
        }
      });
      return DAYS_ID.map((day) => ({ label: day, amount: Math.round(map[day] ?? 0) }));
    }
    if (weeklyMode === 'month') {
      const yr = now.getFullYear();
      const mo = now.getMonth();
      const daysInMonth = new Date(yr, mo + 1, 0).getDate();
      const weeks = [
        { label: 'M1', start: 1, end: 7 },
        { label: 'M2', start: 8, end: 14 },
        { label: 'M3', start: 15, end: 21 },
        { label: 'M4', start: 22, end: 28 },
        ...(daysInMonth > 28 ? [{ label: 'M5', start: 29, end: daysInMonth }] : []),
      ];
      return weeks.map(({ label, start, end }) => {
        const startMs = new Date(yr, mo, start, 0, 0, 0).getTime();
        const endMs   = new Date(yr, mo, end, 23, 59, 59, 999).getTime();
        const amount  = allCatLogs
          .filter((l) => l.timestamp >= startMs && l.timestamp <= endMs)
          .reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0);
        return { label, amount: Math.round(amount) };
      });
    }
    // year
    const yr = now.getFullYear();
    return MONTHS_SHORT.map((label, m) => {
      const startMs = new Date(yr, m, 1, 0, 0, 0).getTime();
      const endMs   = new Date(yr, m + 1, 0, 23, 59, 59, 999).getTime();
      const amount  = allCatLogs
        .filter((l) => l.timestamp >= startMs && l.timestamp <= endMs)
        .reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0);
      return { label, amount: Math.round(amount) };
    });
  }, [allCatLogs, weeklyMode]);

  // ── Area chart data (ikut filter) ────────────────────────────────────────────
  const bucketLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  const feedingDynamics = useMemo(() => {
    if (filterMode === 'all') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dStr = d.toISOString().split('T')[0];
        const total = catLogs
          .filter((l) => new Date(l.timestamp).toISOString().split('T')[0] === dStr)
          .reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0);
        return { time: DAYS_ID[d.getDay()], weight: Math.round(total) };
      });
    }
    const buckets: Record<string, number> = Object.fromEntries(bucketLabels.map((l) => [l, 0]));
    activeLogs.forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      const label = bucketLabels[Math.floor(hour / 4)];
      if (label !== undefined) buckets[label] += log.amountDispensed ?? 0;
    });
    return bucketLabels.map((time) => ({ time, weight: Math.round(buckets[time]) }));
  }, [filterMode, activeLogs, catLogs]);

  // ── Analytics data (7 days rolling, uses catLogs — not affected by date filter) ─
  const ANALYTICS_COLORS = ['#F59E0B', '#374151'];

  const analyticsLineData = useMemo(() => {
    const now = Date.now();
    const dayTotals: Record<string, number> = {};
    catLogs.forEach((log) => {
      const key = new Date(log.timestamp).toDateString();
      dayTotals[key] = (dayTotals[key] ?? 0) + (log.amountDispensed ?? 0);
    });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86400000);
      return { gram: Math.round(dayTotals[d.toDateString()] ?? 0) };
    });
  }, [catLogs]);

  const analyticsDailyAvg = analyticsLineData.length > 0
    ? Math.round(analyticsLineData.reduce((s, d) => s + d.gram, 0) / analyticsLineData.length)
    : 0;
  const analyticsNonZero = analyticsLineData.filter((d) => d.gram > 0);
  const analyticsMax = Math.max(...analyticsNonZero.map((d) => d.gram), 0);
  const analyticsMin = analyticsNonZero.length > 1 ? Math.min(...analyticsNonZero.map((d) => d.gram)) : analyticsMax;
  const analyticsVariation = analyticsDailyAvg > 0
    ? Math.round(((analyticsMax - analyticsMin) / analyticsDailyAvg) * 100)
    : 0;

  const analyticsBarData = useMemo(() => {
    const pm = { Pagi: 0, Siang: 0, Sore: 0, Malam: 0 };
    catLogs.forEach((log) => {
      const h = new Date(log.timestamp).getHours();
      if (h < 11)       pm.Pagi   += log.amountDispensed ?? 0;
      else if (h < 15)  pm.Siang  += log.amountDispensed ?? 0;
      else if (h < 19)  pm.Sore   += log.amountDispensed ?? 0;
      else              pm.Malam  += log.amountDispensed ?? 0;
    });
    return Object.entries(pm).map(([period, grams]) => ({ period, grams: Math.round(grams) }));
  }, [catLogs]);

  const analyticsManualCount = catLogs.filter((l) => l.notes === 'manual').length;
  const analyticsScheduledCount = catLogs.length - analyticsManualCount;
  const analyticsPieData = [
    { name: 'Terjadwal', value: catLogs.length > 0 ? Math.round((analyticsScheduledCount / catLogs.length) * 100) : 0 },
    { name: 'Manual',    value: catLogs.length > 0 ? Math.round((analyticsManualCount   / catLogs.length) * 100) : 0 },
  ];

  // ── Alerts ────────────────────────────────────────────
  const isOverfed = dailyTarget > 0 && selectedTotal >= dailyTarget;
  // Notif muncul saat device ada + stok < 20% (termasuk 0%)
  // Hilang hanya saat stok sudah ≥ 20% lagi
  const isLowStock = device !== null && foodStock < 20;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  // Label filter aktif untuk ditampilkan di progress card
  const filterLabel = filterMode === 'all'
    ? 'Semua riwayat'
    : filterMode === 'today'
    ? new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5 pb-8">

      {/* ── HEADER ── */}
      <div>
        <h2 className="text-3xl font-black text-gray-900">Dashboard</h2>
        <p className="text-gray-400 mt-1 text-sm">
          Pantau kondisi dan pola makan {cat?.name ?? 'kucing'} secara real-time.
        </p>
      </div>

      {/* ── BANNERS (hanya tampil jika relevan) ── */}
      <div className="space-y-3">
        {!cat && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
            <span className="text-lg shrink-0">🐱</span>
            <p className="text-sm font-semibold text-amber-700">
              Belum ada profil kucing. Admin perlu mengisi profil melalui Onboarding Flow.
            </p>
          </div>
        )}
        {!device && (
          <div className="flex items-center justify-between gap-4 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3.5">
            <div className="flex items-center gap-3">
              <WifiOff className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm font-semibold text-orange-700">
                Perangkat ESP32 belum terhubung — fitur otomatis tidak aktif.
              </p>
            </div>
            {isAdmin && (
              <button type="button" onClick={() => setShowConnectModal(true)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors">
                <Link2 className="w-3.5 h-3.5" /> Hubungkan
              </button>
            )}
          </div>
        )}
        {isOverfed && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm font-semibold text-red-600">
              Batas pakan harian tercapai — pemberian tambahan berisiko overfeeding dan FLUTD.
            </p>
          </div>
        )}
        {isLowStock && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-600">
              Stok pakan rendah ({foodStock}%) — segera isi ulang wadah.
            </p>
          </div>
        )}
        {profileUpdatedAt > 0 && hiddenLogsCount > 0 && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-600">
              <span className="font-bold">Data direset.</span>{' '}
              Profil diperbarui pada {new Date(profileUpdatedAt).toLocaleString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
            </p>
          </div>
        )}
      </div>

      {/* ── PROFIL + PROGRESS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Profil Kucing */}
        <div className="lg:col-span-2 bg-white rounded-4xl border border-gray-100 p-6 md:p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-5">Profil Kucing</p>
          <div className="flex items-center gap-5 md:gap-8">
            <div className="relative shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-amber-400 overflow-hidden bg-gray-100 shadow-lg">
                <img
                  src={(cat as any)?.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cat?.name ?? 'Cat'}`}
                  alt="cat"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className={cn(
                'absolute bottom-1 right-1 w-5 h-5 border-[3px] border-white rounded-full',
                device?.isOnline ? 'bg-green-400' : 'bg-gray-300'
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 truncate">
                {cat?.name ?? '—'}
              </h1>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">
                  {cat?.weight ?? '—'} kg
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">
                  {cat?.gender === 'male' ? '♂ Jantan' : cat?.gender === 'female' ? '♀ Betina' : '—'}
                </span>
                {cat?.isSterilized && (
                  <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-600 text-sm font-semibold border border-teal-100">
                    Sterilisasi
                  </span>
                )}
                {cat?.bodyCondition && (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold border border-amber-100">
                    {getBodyLabel(cat.bodyCondition as unknown as number)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100">
                  <p className="text-xs text-amber-600 font-semibold">Target Harian</p>
                  <p className="text-2xl font-black text-amber-600 mt-0.5">
                    {dailyTarget > 0 ? `${dailyTarget}g` : '—'}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-2xl px-4 py-3 border border-blue-100">
                  <p className="text-xs text-blue-600 font-semibold">Kalori / Hari</p>
                  <p className="text-2xl font-black text-blue-600 mt-0.5">
                    {cat?.dailyCalorieTarget ? `${cat.dailyCalorieTarget}` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Pemberian */}
        <div className="bg-white rounded-4xl border border-gray-100 p-6 md:p-8 shadow-sm flex flex-col">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Progress Pemberian</p>
          <p className="text-sm text-gray-400 mt-1">{filterLabel}</p>
          <div className="flex-1 flex flex-col items-center justify-center my-6">
            <p className="text-6xl font-black text-gray-900 leading-none">{selectedTotal}g</p>
            <p className="text-base text-gray-400 mt-2 font-medium">
              dari {dailyTarget > 0 ? `${dailyTarget}g` : '—'}
            </p>
          </div>
          <div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8 }}
                className={cn('h-full rounded-full', progressPct >= 100 ? 'bg-red-400' : 'bg-amber-400')}
              />
            </div>
            <p className="text-sm text-center text-gray-500 mt-2 font-semibold">
              {progressPct}% target tercapai
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 STATUS MINI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Stok Pakan */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Layers className="w-4 h-4 text-amber-500" />
            </div>
            <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full',
              !device          ? 'bg-gray-100 text-gray-400'
              : foodStock > 50 ? 'bg-green-100 text-green-700'
              : foodStock > 20 ? 'bg-yellow-100 text-yellow-700'
              :                  'bg-red-100 text-red-700'
            )}>
              {!device ? 'Tidak ada' : foodStock > 50 ? 'Penuh' : foodStock > 20 ? 'Sedang' : 'Kritis'}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">Stok Pakan</p>
            <p className="text-3xl font-black text-gray-900 mt-0.5">{device ? `${foodStock}%` : '—'}</p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={cn('h-1.5 flex-1 rounded-full',
                device && (i + 1) * 20 <= foodStock
                  ? foodStock > 50 ? 'bg-amber-400' : foodStock > 20 ? 'bg-yellow-400' : 'bg-red-400'
                  : 'bg-gray-100'
              )} />
            ))}
          </div>
        </div>

        {/* Berat Mangkuk */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Weight className="w-4 h-4 text-blue-500" />
            </div>
            <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full',
              device?.lastPulse && Date.now() - device.lastPulse < 120000
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-400'
            )}>
              {!device ? 'Tidak ada'
               : device.lastPulse && Date.now() - device.lastPulse < 120000 ? 'Baru diperbarui'
               : device.lastPulse ? `${Math.floor((Date.now() - device.lastPulse) / 60000)} mnt lalu`
               : 'Tidak ada sinyal'}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">Berat Mangkuk</p>
            <p className="text-3xl font-black text-gray-900 mt-0.5">{device?.currentWeightOnScale ?? 0}g</p>
          </div>
          {allCatLogs.length > 0 && (
            <p className="text-xs text-gray-400">
              Pemberian terakhir: <span className="font-bold text-gray-600">{allCatLogs[0].amountDispensed}g</span>
            </p>
          )}
        </div>

        {/* Status Dispenser */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-orange-500" />
            </div>
            {device ? (
              <span className={cn('flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full',
                device.servoStatus === 'jammed'  ? 'bg-red-100 text-red-700'
                : device.servoStatus === 'active' ? 'bg-amber-100 text-amber-700'
                :                                   'bg-green-100 text-green-700'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full',
                  device.servoStatus === 'jammed'  ? 'bg-red-500'
                  : device.servoStatus === 'active' ? 'bg-amber-500 animate-pulse'
                  :                                   'bg-green-500'
                )} />
                {device.servoStatus === 'jammed' ? 'Error' : device.servoStatus === 'active' ? 'Aktif' : 'Siaga'}
              </span>
            ) : <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">Tidak ada</span>}
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">Status Dispenser</p>
            <p className="text-3xl font-black text-gray-900 mt-0.5">
              {device?.servoStatus === 'active' ? 'Jalan'
               : device?.servoStatus === 'jammed' ? 'Macet'
               : device ? 'Standby' : '—'}
            </p>
          </div>
        </div>

        {/* Koneksi Perangkat */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-violet-500" />
            </div>
            <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full',
              device?.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            )}>
              {device?.isOnline ? 'Terhubung' : 'Terputus'}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">Koneksi Perangkat</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-3xl font-black text-gray-900">
                {device ? (device.isOnline ? 'Online' : 'Offline') : '—'}
              </p>
              {device?.isOnline && <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />}
            </div>
          </div>
          {device?.lastPulse && (
            <p className="text-xs text-gray-400">
              Aktif: <span className="font-bold text-gray-600">
                {new Date(device.lastPulse).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ── FILTER BAR (mandiri) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-5 rounded-full bg-amber-400" />
          <div>
            <p className="text-sm font-black text-gray-800">Filter Data</p>
            <p className="text-[11px] text-gray-400">
              {activeLogs.length > 0 ? `${activeLogs.length} pemberian · ${filterLabel}` : `Tidak ada data · ${filterLabel}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'today', 'date'] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setFilterMode(mode)}
              className={cn('px-4 py-2 rounded-xl text-xs font-black transition-all',
                filterMode === mode ? 'bg-amber-500 text-white shadow-sm shadow-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
              {mode === 'all' ? 'Semua' : mode === 'today' ? 'Hari Ini' : 'Pilih Tanggal'}
            </button>
          ))}
          {filterMode === 'date' && (
            <input type="date" aria-label="Pilih tanggal" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-xs font-bold text-gray-700" />
          )}
        </div>
      </div>

      {/* ── MONITORING KUCING ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="font-black text-base text-gray-900">Monitoring Pakan</h3>
          <p className="text-xs text-gray-400 mt-0.5">{filterLabel}</p>
        </div>
        <div className="p-5">
          <CatMonitoringCard
            feedingLogs={activeLogs}
            bowlWeight={device?.currentWeightOnScale ?? 0}
            catName={cat?.name ?? 'Kucing'}
            catPhotoUrl={(cat as any)?.photoUrl}
          />
        </div>
      </div>

      {/* ══ ANALITIK PEMBERIAN ══ */}
      <div className="space-y-5">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-amber-300 to-transparent" />
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm">
            <Activity className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-black text-amber-700">Analitik Pemberian</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-amber-300 to-transparent" />
        </div>

        {/* Stats card + Area chart (Tren Pemberian, ikut filter) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-3xl text-white p-7 relative overflow-hidden bg-slate-900">
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-amber-500/10" />
            <div className="absolute bottom-0 -left-4 w-24 h-24 rounded-full bg-white/[0.03]" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
                <Activity className="w-3.5 h-3.5" /> Rata-rata Harian
              </div>
              <div>
                <span className="text-5xl font-black leading-none text-white">
                  {analyticsDailyAvg > 0 ? analyticsDailyAvg : '—'}
                </span>
                {analyticsDailyAvg > 0 && <span className="text-amber-400 font-bold text-xl ml-2">g</span>}
              </div>
              {dailyTarget > 0 && analyticsDailyAvg > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-white/40">
                    <span>0g</span><span>Target {dailyTarget}g</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((analyticsDailyAvg / dailyTarget) * 100))}%` }} />
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-white/40 leading-relaxed">
                  {dailyTarget > 0
                    ? `Variasi ±${analyticsVariation}% · target ${dailyTarget}g/hari`
                    : 'Belum ada target harian dikonfigurasi.'}
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-black text-gray-800 flex items-center gap-2">
                  <TrendingUp className="text-amber-500 w-4 h-4" /> Tren Pemberian Pakan
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filterMode === 'all' ? 'Total per hari — 7 hari terakhir' : `Distribusi per sesi · ${filterLabel}`}
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
                {activeLogs.length} sesi
              </span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={feedingDynamics}>
                  <defs>
                    <linearGradient id="colorFeed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tickLine={false} axisLine={false} unit="g" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  {dailyTarget > 0 && filterMode === 'all' && (
                    <ReferenceLine y={dailyTarget} stroke="#22c55e" strokeDasharray="5 4" strokeWidth={1.5}
                      label={{ value: `${dailyTarget}g`, position: 'insideTopRight', fontSize: 10, fill: '#22c55e' }} />
                  )}
                  <Tooltip formatter={(v) => [`${v}g`, 'Pakan']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                  <Area type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorFeed)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bar + Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-base font-black text-gray-800 flex items-center gap-2">
                <BarChart3 className="text-violet-500 w-4 h-4" /> Distribusi Waktu Pemberian
              </h4>
              <span className="text-xs font-bold text-violet-500 bg-violet-50 px-3 py-1.5 rounded-xl border border-violet-100">
                {Math.round(analyticsBarData.reduce((s, d) => s + d.grams, 0))}g total
              </span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsBarData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 700 }} />
                  <Tooltip formatter={(v) => [`${v}g`, 'Pakan']} cursor={{ fill: '#F8FAFC', radius: 8 }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="grams" radius={[10, 10, 0, 0]}>
                    {analyticsBarData.map((_, i) => (
                      <Cell key={i} fill={['#F59E0B','#FB923C','#A78BFA','#60A5FA'][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-black text-gray-800 flex items-center gap-2">
                <PieIcon className="text-rose-400 w-4 h-4" /> Terjadwal vs Manual
              </h4>
              <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                {catLogs.length} event
              </span>
            </div>
            <div className="flex-1 flex gap-4 items-center">
              <div className="w-1/2 min-h-40">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={analyticsPieData} innerRadius={48} outerRadius={70} paddingAngle={5} dataKey="value" startAngle={90} endAngle={-270}>
                      {analyticsPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}%`, '']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4">
                {analyticsPieData.map((item, idx) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', idx === 0 ? 'bg-amber-400' : 'bg-gray-800')} />
                        <span className="text-sm font-bold text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-xl font-black text-gray-900">{item.value}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', idx === 0 ? 'bg-amber-400' : 'bg-gray-700')}
                        style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
                {catLogs.length > 0 && analyticsScheduledCount > analyticsManualCount && (
                  <div className="mt-2 p-3 bg-green-50 rounded-2xl border border-green-100">
                    <p className="text-xs font-bold text-green-600 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Jadwal berjalan baik
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ REKAP HISTORIS (tidak terpengaruh filter) ══ */}
      <div className="space-y-5">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-blue-300 to-transparent" />
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-sm">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-black text-blue-700">Rekap Historis</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-blue-300 to-transparent" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Konsumsi Chart */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm shadow-blue-200">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">Konsumsi Pakan</h3>
                  <p className="text-xs text-gray-400">
                    {weeklyMode === '7d'
                      ? '7 hari terakhir'
                      : weeklyMode === 'month'
                      ? `${MONTHS_ID[new Date().getMonth()]} ${new Date().getFullYear()}`
                      : `Tahun ${new Date().getFullYear()}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(['7d', 'month', 'year'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setWeeklyMode(m)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                      weeklyMode === m
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    )}
                  >
                    {m === '7d' ? '7 Hari' : m === 'month' ? 'Bulan' : 'Tahun'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consumptionChartData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 700 }} />
                  <YAxis tickLine={false} axisLine={false} unit="g" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip
                    formatter={(v) => [`${v}g`, 'Konsumsi']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {consumptionChartData.map((entry, i) => {
                      const now = new Date();
                      let highlight = false;
                      if (weeklyMode === '7d') highlight = DAYS_ID[now.getDay()] === entry.label;
                      else if (weeklyMode === 'month') {
                        const day = now.getDate();
                        highlight = entry.label === (day <= 7 ? 'M1' : day <= 14 ? 'M2' : day <= 21 ? 'M3' : day <= 28 ? 'M4' : 'M5');
                      } else {
                        highlight = MONTHS_SHORT[now.getMonth()] === entry.label;
                      }
                      return <Cell key={i} fill={highlight ? '#6366f1' : '#93C5FD'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Kalender Pakan */}
          <FeedingCalendarAnalytics feedingLogs={catLogs} dailyTarget={dailyTarget} />
        </div>
      </div>

      {/* ── CONNECT DEVICE MODAL ── */}
      <AnimatePresence>
        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowConnectModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white rounded-4xl p-5 md:p-8 w-full max-w-md shadow-2xl relative"
            >
              <button
                type="button"
                aria-label="Tutup"
                title="Tutup"
                onClick={() => setShowConnectModal(false)}
                className="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-orange-50 rounded-3xl flex items-center justify-center shrink-0">
                  <Link2 className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Hubungkan ESP32</h3>
                  <p className="text-sm text-gray-400">Konfigurasi perangkat agar terhubung ke akun ini</p>
                </div>
              </div>

              {/* UID */}
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Owner UID (salin ke firmware ESP32)</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                  <code className="flex-1 text-sm font-bold text-gray-800 break-all">{targetOwnerId}</code>
                  <button
                    type="button"
                    title="Salin UID"
                    onClick={handleCopyUID}
                    className="shrink-0 w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-amber-50 hover:border-amber-300 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                {copied && <p className="text-xs text-green-500 font-semibold mt-1 ml-1">UID berhasil disalin!</p>}
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Langkah Konfigurasi ESP32</p>
                {[
                  { num: '1', text: 'Pastikan perangkat sudah terdaftar di Firestore oleh pengelola sistem (collection: devices/).' },
                  { num: '2', text: 'Upload firmware ke ESP32 dengan library Firebase ESP Client.' },
                  { num: '3', text: 'Set DEVICE_ID sesuai ID perangkat yang sudah diklaim di firmware.' },
                  { num: '4', text: 'Set WIFI_SSID dan WIFI_PASSWORD sesuai jaringan lokal.' },
                  { num: '5', text: 'ESP32 menulis heartbeat ke devices/{DEVICE_ID}. Setelah online, status muncul otomatis.' },
                ].map((s) => (
                  <div key={s.num} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      {s.num}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-xs text-blue-700 font-semibold">
                  Firestore path yang ditulis ESP32:<br />
                  <code className="font-black">devices/{'{'}{'{'}DEVICE_ID{'}'}{'}'}  </code><span className="font-normal">(bukan owner UID)</span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}