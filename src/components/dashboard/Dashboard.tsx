import { useState } from 'react';
import { Database, AlertCircle, Weight, Wifi, WifiOff, Settings2, Utensils, Loader2, CheckCircle2, XCircle, AlertTriangle, X, ChevronLeft, ChevronRight, Copy, Check, Link2, Clock } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useCatData } from '../../lib/useCatData';
import { useAuth } from '../../lib/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { FeedingLog, UserRole } from '../../types';

function getBodyLabel(bc: number): string {
  if (bc <= 2) return 'Sangat Kurus';
  if (bc <= 4) return 'Kurus';
  if (bc <= 5) return 'Normal';
  if (bc <= 7) return 'Overweight';
  return 'Obesitas';
}

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// ── FEEDING CALENDAR ──────────────────────────────────────
type DayStatus =
  | 'overfed' | 'met' | 'under' | 'none' | 'future'
  | 'today-overfed' | 'today-met' | 'today-under' | 'today-empty';

function getDayStatus(date: Date, logsByDay: Record<string, FeedingLog[]>, dailyTarget: number): DayStatus {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isPast = date < now && !isToday;
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const logs = logsByDay[key] ?? [];
  const total = logs.reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0);

  if (!isToday && !isPast) return 'future';
  if (total === 0) return isToday ? 'today-empty' : 'none';

  const target = dailyTarget > 0 ? dailyTarget : total;
  if (total > target) return isToday ? 'today-overfed' : 'overfed';
  if (total >= target * 0.85) return isToday ? 'today-met' : 'met';
  return isToday ? 'today-under' : 'under';
}

const STATUS_STYLE: Record<DayStatus, string> = {
  'overfed':       'bg-red-400 text-white border-red-500 hover:bg-red-500',
  'met':           'bg-green-400 text-white border-green-500 hover:bg-green-500',
  'under':         'bg-yellow-300 text-yellow-900 border-yellow-400 hover:bg-yellow-400',
  'none':          'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200',
  'future':        'bg-gray-50 text-gray-300 border-gray-100 cursor-default',
  'today-overfed': 'bg-red-500 text-white border-red-600 ring-2 ring-red-400 ring-offset-1',
  'today-met':     'bg-green-500 text-white border-green-600 ring-2 ring-green-400 ring-offset-1',
  'today-under':   'bg-yellow-400 text-white border-yellow-500 ring-2 ring-yellow-300 ring-offset-1',
  'today-empty':   'bg-blue-500 text-white border-blue-600 ring-2 ring-blue-400 ring-offset-1',
};

function FeedingCalendar({ feedingLogs, dailyTarget }: { feedingLogs: FeedingLog[]; dailyTarget: number }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Group logs by day key
  const logsByDay: Record<string, FeedingLog[]> = {};
  feedingLogs.forEach((log) => {
    const d = new Date(log.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!logsByDay[key]) logsByDay[key] = [];
    logsByDay[key].push(log);
  });

  // Build calendar grid (Sun-Sat)
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectedKey = selectedDay
    ? `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`
    : null;
  const selectedLogs = (selectedKey ? logsByDay[selectedKey] ?? [] : [])
    .sort((a, b) => a.timestamp - b.timestamp);
  const selectedTotal = selectedLogs.reduce((s, l) => s + (l.amountDispensed ?? 0), 0);
  const selectedStatus = selectedDay ? getDayStatus(selectedDay, logsByDay, dailyTarget) : null;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-gray-700">Kalender Pemberian Makan</h2>
        <div className="flex items-center gap-1">
          <button type="button" title="Bulan sebelumnya" onClick={prevMonth}
            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-3 h-3 text-gray-500" />
          </button>
          <span className="text-xs font-bold text-gray-600 w-28 text-center">
            {MONTHS_ID[month]} {year}
          </span>
          <button type="button" title="Bulan berikutnya" onClick={nextMonth}
            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronRight className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* ── Calendar grid ── */}
        <div className="flex-1 min-w-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_ID.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const status = getDayStatus(date, logsByDay, dailyTarget);
              const isSelected = selectedDay?.toDateString() === date.toDateString();
              const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const dayTotal = (logsByDay[dayKey] ?? []).reduce((s, l) => s + (l.amountDispensed ?? 0), 0);
              return (
                <button
                  key={i}
                  type="button"
                  title={`${date.getDate()} ${MONTHS_ID[date.getMonth()]} — ${dayTotal}g`}
                  onClick={() => status !== 'future' ? setSelectedDay(date) : undefined}
                  className={cn(
                    'h-9 w-full rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5',
                    STATUS_STYLE[status],
                    isSelected && 'ring-2 ring-offset-1 ring-gray-400 scale-110',
                  )}
                >
                  <span>{date.getDate()}</span>
                  {dayTotal > 0 && (
                    <span className="text-[8px] opacity-75 leading-none">{dayTotal}g</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-2 border-t border-gray-100">
            {[
              { color: 'bg-green-400',  label: 'Terpenuhi' },
              { color: 'bg-yellow-300', label: 'Kurang' },
              { color: 'bg-red-400',    label: 'Berlebih' },
              { color: 'bg-gray-300',   label: 'Tidak Ada' },
              { color: 'bg-blue-500',   label: 'Hari ini' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className="w-48 shrink-0">
          <AnimatePresence mode="wait">
            {selectedDay ? (
              <motion.div
                key={selectedDay.toDateString()}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="h-full"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-black text-gray-700">
                      {selectedDay.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {selectedDay.toLocaleDateString('id-ID', { weekday: 'long' })}
                    </p>
                  </div>
                  <button type="button" title="Tutup detail" onClick={() => setSelectedDay(null)}
                    className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0">
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>

                {selectedLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <XCircle className="w-7 h-7 text-red-300 mb-1" />
                    <p className="text-[10px] text-red-400 font-semibold">Tidak ada pemberian makan</p>
                  </div>
                ) : (
                  <>
                    <div className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-black inline-block mb-2',
                      selectedStatus === 'overfed' || selectedStatus === 'today-overfed' ? 'bg-red-100 text-red-700' :
                      selectedStatus === 'met'     || selectedStatus === 'today-met'     ? 'bg-green-100 text-green-700' :
                      selectedStatus === 'under'   || selectedStatus === 'today-under'   ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {selectedTotal}g / {dailyTarget > 0 ? `${dailyTarget}g` : '—'}
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-36">
                      {selectedLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                              log.status === 'success' ? 'bg-green-400' : log.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                            )} />
                            <span className="text-[11px] font-bold text-gray-600">
                              {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {log.notes && (
                              <span className="text-[9px] text-gray-400">{log.notes}</span>
                            )}
                          </div>
                          <span className="text-[11px] font-black text-amber-600">{log.amountDispensed}g</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full py-6 text-center"
              >
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
                  <Utensils className="w-4 h-4 text-gray-300" />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">Klik tanggal<br/>untuk detail</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Circular Gauge (speedometer style) ───────────────────────────────────────

function CircularGauge({
  value, max, unit = 'GR', overrideColor,
}: {
  value: number;
  max: number;
  unit?: string;
  overrideColor?: string;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75;
  const fillLength = arcLength * pct;
  const isOverfed = max > 0 && value > max;
  const color = overrideColor ?? (isOverfed ? '#ef4444' : pct > 0.75 ? '#f59e0b' : '#22c55e');

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg width="112" height="112" viewBox="0 0 120 120" className="rotate-[-225deg]">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb"
          strokeWidth="10" strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" />
        {fillLength > 1 && (
          <circle cx="60" cy="60" r={r} fill="none" stroke={color}
            strokeWidth="10" strokeDasharray={`${fillLength} ${circumference}`} strokeLinecap="round" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-gray-900 leading-none">{value}</span>
        <span className="text-xs text-gray-400 font-bold">{unit}</span>
      </div>
    </div>
  );
}

// ── Cat Monitoring Card ───────────────────────────────────────────────────────

function CatMonitoringCard({ feedingLogs, bowlWeight, catName }: {
  feedingLogs: { timestamp: number; amountDispensed: number; notes?: string }[];
  bowlWeight: number;
  catName: string;
}) {
  const lastLog = feedingLogs[0];
  const lastTime = lastLog
    ? new Date(lastLog.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;
  const minsAgo = lastLog ? Math.floor((Date.now() - lastLog.timestamp) / 60000) : null;

  // Eating detection: bowl weight < 75% of last dispensed = cat ate some food
  const isEating = lastLog && bowlWeight < lastLog.amountDispensed * 0.75;
  const isRecent = minsAgo !== null && minsAgo < 60;

  const statusLabel = !lastLog ? 'Tidak Ada Data'
    : isEating && isRecent ? 'Terlihat' : 'Menunggu';
  const statusColor = statusLabel === 'Terlihat'
    ? 'bg-green-500 text-white' : statusLabel === 'Menunggu'
    ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-600 text-gray-300';

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐱</span>
          <p className="text-sm font-black text-gray-700">Monitoring Kucing</p>
        </div>
        <span className={cn('text-xs font-black px-2.5 py-1 rounded-full', statusColor)}>
          {statusLabel === 'Terlihat' ? '⚡ Terlihat' : statusLabel === 'Menunggu' ? '⏳ Menunggu' : '— Tidak Ada Data'}
        </span>
      </div>

      {/* Cat info area */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-3xl">
            🐈
          </div>
          {isEating && isRecent && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-black text-base text-gray-900">{catName}</p>
          {lastTime ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">
                Terakhir: <span className="text-amber-500 font-bold">{lastTime}</span>
                {minsAgo !== null && <span className="text-gray-400"> ({minsAgo < 60 ? `${minsAgo} mnt lalu` : `${Math.floor(minsAgo / 60)} jam lalu`})</span>}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Belum ada riwayat pemberian</p>
          )}
        </div>
      </div>

      {/* History */}
      {feedingLogs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Riwayat Terakhir</p>
          {feedingLogs.slice(0, 4).map((log) => (
            <div key={log.timestamp} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <div className="flex items-center gap-2">
                <div className={cn('w-1.5 h-1.5 rounded-full', log.notes === 'manual' ? 'bg-blue-400' : 'bg-amber-400')} />
                <span className="text-xs text-gray-600">
                  {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-500">{log.amountDispensed}g</span>
                <span className="text-[10px] text-gray-400">{log.notes === 'manual' ? 'Manual' : 'Otomatis'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === UserRole.SUPER_ADMIN;
  const { cat, device, feedingLogs, targetOwnerId, loading } = useCatData();

  // Manual feed modal state
  const [showModal, setShowModal] = useState(false);
  const [feedingAmount, setFeedingAmount] = useState(50);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedResult, setFeedResult] = useState<'success' | 'error' | null>(null);

  // Connect device modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyUID = () => {
    navigator.clipboard.writeText(targetOwnerId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Today's feeding total from real logs ──────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const profileUpdatedTodayMs =
    cat?.profileUpdatedAt && cat.profileUpdatedAt >= todayStartMs
      ? cat.profileUpdatedAt
      : todayStartMs;
  const todayLogs = feedingLogs.filter(
    (l) => l.timestamp >= profileUpdatedTodayMs
  );
  const todayTotal = Math.round(
    todayLogs.reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0)
  );

  const dailyTarget = cat?.dailyGramTarget ?? 0;
  const progressPct =
    dailyTarget > 0 ? Math.min(Math.round((todayTotal / dailyTarget) * 100), 100) : 0;
  const foodStock = device?.foodStockLevel ?? 0;

  // ── Would this feed exceed the daily limit? ───────────
  const remainingToday = dailyTarget > 0 ? Math.max(0, dailyTarget - todayTotal) : Infinity;
  const wouldExceed = dailyTarget > 0 && (todayTotal + feedingAmount) > dailyTarget;
  const isAtLimit = cat?.dailyLimitReachedDate === todayStr;

  // ── Area chart: feeding by 4-hour buckets today ───────
  const bucketLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  const buckets: Record<string, number> = Object.fromEntries(
    bucketLabels.map((l) => [l, 0])
  );
  todayLogs.forEach((log) => {
    const hour = new Date(log.timestamp).getHours();
    const label = bucketLabels[Math.floor(hour / 4)];
    if (label !== undefined) buckets[label] += log.amountDispensed ?? 0;
  });
  const feedingDynamics = bucketLabels.map((time) => ({
    time,
    weight: Math.round(buckets[time]),
  }));

  // ── Bar chart: weekly totals ──────────────────────────
  const weeklyMap: Record<string, number> = {};
  const now = Date.now();
  feedingLogs.forEach((log) => {
    const daysAgo = Math.floor((now - log.timestamp) / 86400000);
    if (daysAgo < 7) {
      const label = DAYS_ID[new Date(log.timestamp).getDay()];
      weeklyMap[label] = (weeklyMap[label] ?? 0) + (log.amountDispensed ?? 0);
    }
  });
  const weeklyConsumption = DAYS_ID.map((day) => ({
    day,
    amount: Math.round(weeklyMap[day] ?? 0),
  }));

  // ── Alerts ────────────────────────────────────────────
  const isOverfed = dailyTarget > 0 && todayTotal >= dailyTarget;
  const isLowStock = foodStock > 0 && foodStock < 20;
  const isOffline = device !== null && !device.isOnline;

  // ── Manual feed handler ───────────────────────────────
  const handleManualFeed = async () => {
    if (!user || isFeeding) return;
    setIsFeeding(true);
    setFeedResult(null);
    try {
      const logId = `${targetOwnerId}_${Date.now()}`;
      await setDoc(doc(db, 'feedingLogs', logId), {
        id: logId,
        catId: `${targetOwnerId}_main`,
        timestamp: Date.now(),
        amountRequested: feedingAmount,
        amountDispensed: feedingAmount,
        status: 'success',
        notes: 'manual',
      });
      setFeedResult('success');
    } catch {
      setFeedResult('error');
    } finally {
      setIsFeeding(false);
      setTimeout(() => {
        setFeedResult(null);
        if (feedResult !== 'error') setShowModal(false);
      }, 2500);
    }
  };

  const openModal = () => {
    setFeedResult(null);
    setFeedingAmount(50);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── DEVICE STATUS BANNER ── */}
      {!device && (
        <div className="flex items-center justify-between gap-4 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-700">Perangkat ESP32 belum terhubung</p>
              <p className="text-xs text-orange-500 mt-0.5">Fitur otomatis tidak aktif. Hubungkan perangkat untuk mulai monitoring.</p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Hubungkan
            </button>
          )}
        </div>
      )}
      {isOffline && (
        <div className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-600">Perangkat offline</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Terakhir aktif: {device?.lastPulse
                  ? new Date(device.lastPulse).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : '—'}. Periksa koneksi Wi-Fi ESP32.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="shrink-0 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold transition-colors"
            >
              Info Koneksi
            </button>
          )}
        </div>
      )}

      {/* ── ALERTS ── */}
      {isOverfed && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-600">
            Batas pemberian makan harian telah tercapai untuk mencegah overfeeding dan risiko FLUTD.
          </p>
        </div>
      )}
      {isLowStock && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3">
          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
          <p className="text-sm text-orange-600">
            Stok makanan hampir habis ({foodStock}%). Segera isi ulang wadah pakan.
          </p>
        </div>
      )}

      {/* ── NO DATA STATE ── */}
      {!cat && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-xl">🐱</span>
          <p className="text-sm text-amber-700">
            Belum ada data kucing. Admin perlu mengisi profil kucing melalui Onboarding Flow.
          </p>
        </div>
      )}

      {/* ── TOP SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* PROFILE CARD */}
        <div className="lg:col-span-2 bg-white rounded-4xl border border-gray-200 p-8 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center gap-8">

            {/* AVATAR */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 rounded-full border-[5px] border-amber-400 overflow-hidden shadow-xl bg-gray-100">
                <img
                  src={
                    (cat as any)?.photoUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${cat?.name ?? 'Cat'}`
                  }
                  alt="cat"
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className={`absolute bottom-3 right-3 w-6 h-6 border-4 border-white rounded-full ${
                  device?.isOnline ? 'bg-green-400' : 'bg-gray-300'
                }`}
              />
            </div>

            {/* INFO */}
            <div className="flex-1">
              <h1 className="text-[42px] leading-none font-black text-gray-900">
                {cat?.name ?? '—'}
              </h1>

              <div className="flex flex-wrap gap-3 mt-5">
                <span className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-700 text-lg font-semibold">
                  Berat {cat?.weight ?? '—'}kg
                </span>
                <span className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-700 text-lg font-semibold">
                  {cat?.gender === 'male' ? '♂ Jantan' : cat?.gender === 'female' ? '♀ Betina' : '—'}
                </span>
                {cat?.isSterilized && (
                  <span className="px-4 py-2 rounded-2xl bg-teal-50 text-teal-600 text-lg font-semibold border border-teal-100">
                    Sterilisasi
                  </span>
                )}
                {cat?.bodyCondition && (
                  <span className="px-4 py-2 rounded-2xl bg-amber-50 text-amber-700 text-lg font-semibold border border-amber-100">
                    {getBodyLabel(cat.bodyCondition as unknown as number)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-12 mt-8">
                <div>
                  <p className="text-lg text-gray-500 font-medium">Target Harian</p>
                  <h2 className="text-[42px] font-black text-amber-500 leading-none mt-2">
                    {dailyTarget > 0 ? `${dailyTarget}g` : '—'}
                  </h2>
                </div>
                <div>
                  <p className="text-lg text-gray-500 font-medium">Kalori/Hari</p>
                  <h2 className="text-[42px] font-black text-blue-500 leading-none mt-2">
                    {cat?.dailyCalorieTarget ? `${cat.dailyCalorieTarget}` : '—'}
                  </h2>
                </div>
              </div>
            </div>

            {/* FEED BUTTON — hanya tampil untuk admin */}
            {isAdmin && <div className="shrink-0">
              <button
                type="button"
                onClick={openModal}
                disabled={isAtLimit}
                className={cn(
                  'flex items-center gap-4 px-8 py-5 rounded-3xl font-bold text-2xl shadow-lg transition-all',
                  isAtLimit
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-amber-400 hover:bg-amber-500 text-white shadow-amber-200'
                )}
              >
                <Utensils className="w-8 h-8" />
                Beri Makan
              </button>
              {isAtLimit && (
                <p className="text-xs text-red-500 font-semibold mt-2 text-center">
                  Limit harian tercapai
                </p>
              )}
            </div>}
          </div>
        </div>

        {/* PROGRESS CARD */}
        <div className="bg-white rounded-4xl border border-gray-200 p-8 shadow-sm flex flex-col justify-center">
          <p className="text-lg font-bold uppercase tracking-[4px] text-amber-500">
            Progress Pemberian
          </p>

          <div className="my-10 text-center">
            <h1 className="text-[72px] leading-none font-black text-gray-900">
              {todayTotal}g
            </h1>
            <p className="text-2xl text-gray-500 mt-4 font-medium">
              dari {dailyTarget > 0 ? `${dailyTarget}g` : '—'}
            </p>
          </div>

          <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1 }}
              className={`h-full rounded-full ${progressPct >= 100 ? 'bg-red-400' : 'bg-amber-400'}`}
            />
          </div>
          <p className="text-lg text-center text-gray-500 mt-4 font-medium">
            {progressPct}% target harian tercapai
          </p>
        </div>
      </div>

      {/* ── SMALL CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Status Tabung — circular gauge */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500 font-semibold">Status Tabung</span>
          </div>
          <div className="flex items-center gap-4">
            <CircularGauge
              value={device ? foodStock : 0}
              max={100}
              unit="%"
              overrideColor={
                !device ? '#d1d5db'
                : foodStock < 20 ? '#ef4444'
                : foodStock < 50 ? '#f59e0b'
                : '#22c55e'
              }
            />
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-lg font-black leading-tight',
                !device ? 'text-gray-300'
                : foodStock < 20 ? 'text-red-500'
                : foodStock < 50 ? 'text-yellow-500'
                : 'text-green-500'
              )}>
                {!device ? '—'
                  : foodStock < 20 ? 'Hampir Habis'
                  : foodStock < 50 ? 'Berkurang'
                  : 'Cukup'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Sisa: {device ? `${foodStock}%` : '—'}</p>
              <div className="mt-2 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${foodStock}%` }}
                  transition={{ duration: 0.8 }}
                  className={cn('h-full rounded-full',
                    foodStock < 20 ? 'bg-red-400' : foodStock < 50 ? 'bg-yellow-400' : 'bg-green-400'
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Berat Makanan — circular gauge */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Weight className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500 font-semibold">Berat Makanan</span>
          </div>
          <div className="flex items-center gap-4">
            <CircularGauge
              value={device?.currentWeightOnScale ?? 0}
              max={dailyTarget || 100}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Target: {dailyTarget > 0 ? `${dailyTarget}g` : '—'}</p>
              <div className="mt-2 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyTarget > 0 ? Math.min(((device?.currentWeightOnScale ?? 0) / dailyTarget) * 100, 100) : 0}%` }}
                  transition={{ duration: 0.8 }}
                  className={cn('h-full rounded-full', dailyTarget > 0 && (device?.currentWeightOnScale ?? 0) > dailyTarget ? 'bg-red-400' : 'bg-green-400')}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {device?.currentWeightOnScale ?? 0} / {dailyTarget > 0 ? dailyTarget : '—'} gram
              </p>
            </div>
          </div>
        </div>

        {/* Status Servo */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500 font-semibold">Status Servo</span>
          </div>
          <p className={`text-3xl font-black mt-1 ${
            device?.servoStatus === 'active' ? 'text-amber-500' :
            device?.servoStatus === 'jammed' ? 'text-red-500' : 'text-green-500'
          }`}>
            {device?.servoStatus === 'active' ? 'Aktif' :
             device?.servoStatus === 'jammed' ? 'Macet' :
             device ? 'Siaga' : '—'}
          </p>
          <div className="mt-auto h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full w-full',
              device?.servoStatus === 'jammed' ? 'bg-red-400' :
              device?.servoStatus === 'active' ? 'bg-amber-400 animate-pulse' : 'bg-green-400'
            )} />
          </div>
        </div>

        {/* Perangkat */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500 font-semibold">Perangkat</span>
          </div>
          <p className={`text-3xl font-black mt-1 ${device?.isOnline ? 'text-blue-500' : 'text-gray-400'}`}>
            {device ? (device.isOnline ? 'Online' : 'Offline') : '—'}
          </p>
          {device?.lastPulse && (
            <p className="text-xs text-gray-400 mt-auto">
              Terakhir: {new Date(device.lastPulse).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: device?.isOnline ? '100%' : '0%' }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-blue-400"
            />
          </div>
        </div>
      </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800">Dinamika Pemberian Makan</h2>
              <p className="text-sm text-gray-400 mt-1">Tren konsumsi hari ini (gram)</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-500 text-xs font-bold">
              {todayLogs.length} event
            </span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={feedingDynamics}>
                <defs>
                  <linearGradient id="colorFeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} unit="g" />
                <Tooltip formatter={(v) => [`${v}g`, 'Pakan']} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorFeed)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-800">Analisis Konsumsi Mingguan</h2>
            <p className="text-sm text-gray-400 mt-1">Statistik konsumsi makanan 7 hari terakhir</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyConsumption}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} unit="g" />
                <Tooltip formatter={(v) => [`${v}g`, 'Konsumsi']} />
                <Bar dataKey="amount" radius={[12, 12, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── MONITORING KUCING ── */}
      <CatMonitoringCard
        feedingLogs={feedingLogs}
        bowlWeight={device?.currentWeightOnScale ?? 0}
        catName={cat?.name ?? 'Kucing'}
      />

      {/* ── FEEDING CALENDAR ── */}
      <FeedingCalendar feedingLogs={feedingLogs} dailyTarget={dailyTarget} />

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
              className="bg-white rounded-4xl p-8 w-full max-w-md shadow-2xl relative"
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
                  { num: '1', text: 'Upload firmware ke ESP32 dengan library Firebase ESP Client.' },
                  { num: '2', text: `Set OWNER_UID = "${targetOwnerId.slice(0, 8)}..." di config firmware.` },
                  { num: '3', text: 'Set WIFI_SSID dan WIFI_PASSWORD sesuai jaringan lokal.' },
                  { num: '4', text: 'ESP32 akan menulis ke path: devices/{ownerId}_device di Firestore.' },
                  { num: '5', text: 'Setelah terhubung, status perangkat muncul otomatis di dashboard.' },
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
                  Firestore path yang harus ditulis ESP32:<br />
                  <code className="font-black">devices/{targetOwnerId}_device</code>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MANUAL FEED MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget && !isFeeding) setShowModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white rounded-4xl p-8 w-full max-w-md shadow-2xl relative"
            >
              {/* Close */}
              {!isFeeding && (
                <button
                  type="button"
                  aria-label="Tutup modal"
                  title="Tutup"
                  onClick={() => setShowModal(false)}
                  className="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-amber-50 rounded-3xl flex items-center justify-center shrink-0">
                  <Utensils className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Beri Makan Manual</h3>
                  <p className="text-sm text-gray-400">Kirim porsi ke perangkat sekarang</p>
                </div>
              </div>

              {/* Daily progress info */}
              {dailyTarget > 0 && (
                <div className="mb-5 p-4 bg-gray-50 rounded-2xl">
                  <div className="flex justify-between text-sm font-semibold text-gray-600 mb-2">
                    <span>Sudah diberikan hari ini</span>
                    <span className="font-black">{todayTotal}g / {dailyTarget}g</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${progressPct >= 100 ? 'bg-red-400' : 'bg-amber-400'}`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Sisa kapasitas: <span className="font-bold text-gray-600">{remainingToday === Infinity ? '—' : `${remainingToday}g`}</span>
                  </p>
                </div>
              )}

              {/* Slider */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-black text-gray-400 uppercase tracking-widest">
                    Ukuran Porsi
                  </label>
                  <span className="text-3xl font-black text-amber-500">
                    {feedingAmount}<span className="text-lg ml-0.5">g</span>
                  </span>
                </div>
                <input
                  aria-label="Ukuran Porsi"
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={feedingAmount}
                  onChange={(e) => setFeedingAmount(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5g</span>
                  <span>200g</span>
                </div>
              </div>

              {/* Alerts */}
              {isAtLimit && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl mb-5">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-red-700">Batas harian tercapai!</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Kucing sudah mendapat {todayTotal}g dari {dailyTarget}g. Pemberian tambahan berisiko overfeeding.
                    </p>
                  </div>
                </div>
              )}
              {!isAtLimit && wouldExceed && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl mb-5">
                  <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-orange-700">Porsi melebihi sisa kapasitas!</p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      {feedingAmount}g akan membuat total hari ini menjadi {todayTotal + feedingAmount}g (melebihi {dailyTarget}g).
                    </p>
                  </div>
                </div>
              )}

              {/* Result feedback */}
              {feedResult && (
                <div className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold mb-4',
                  feedResult === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                  {feedResult === 'success'
                    ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                    : <XCircle className="w-5 h-5 shrink-0" />}
                  {feedResult === 'success'
                    ? 'Berhasil dikirim ke perangkat!'
                    : 'Gagal mengirim. Periksa koneksi perangkat.'}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isFeeding}
                  className="flex-1 py-4 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleManualFeed}
                  disabled={isFeeding || isAtLimit}
                  className={cn(
                    'flex-1 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all',
                    isFeeding || isAtLimit
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : wouldExceed
                      ? 'bg-orange-400 hover:bg-orange-500 text-white shadow-lg shadow-orange-100'
                      : 'bg-amber-400 hover:bg-amber-500 text-white shadow-lg shadow-amber-100'
                  )}
                >
                  {isFeeding ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
                  ) : (
                    <><Utensils className="w-5 h-5" /> {wouldExceed ? 'Kirim Tetap' : 'Kirim Sekarang'}</>
                  )}
                </button>
              </div>
              {wouldExceed && !isAtLimit && !isFeeding && (
                <p className="text-xs text-center text-orange-500 font-semibold mt-2">
                  Tekan "Kirim Tetap" untuk konfirmasi meski melebihi batas.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}