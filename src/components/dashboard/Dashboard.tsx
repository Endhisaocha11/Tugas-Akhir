import { useState } from 'react';
import { Database, AlertCircle, Weight, Wifi, Settings2, Utensils, Loader2, CheckCircle2, XCircle, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
type DayStatus = 'fed' | 'partial' | 'missed' | 'today-fed' | 'today-partial' | 'today-empty' | 'future';

function getDayStatus(date: Date, logsByDay: Record<string, FeedingLog[]>, dailyTarget: number): DayStatus {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isPast = date < now && !isToday;
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const logs = logsByDay[key] ?? [];
  const total = logs.reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0);
  const pct = dailyTarget > 0 ? total / dailyTarget : 0;

  if (!isToday && !isPast) return 'future';
  if (total === 0) return isToday ? 'today-empty' : 'missed';
  if (pct >= 0.8) return isToday ? 'today-fed' : 'fed';
  return isToday ? 'today-partial' : 'partial';
}

const STATUS_STYLE: Record<DayStatus, string> = {
  'fed':           'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  'partial':       'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
  'missed':        'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  'today-fed':     'bg-green-500 text-white border-green-600 ring-2 ring-green-400 ring-offset-1',
  'today-partial': 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400 ring-offset-1',
  'today-empty':   'bg-blue-500 text-white border-blue-600 ring-2 ring-blue-400 ring-offset-1',
  'future':        'bg-gray-50 text-gray-300 border-gray-100 cursor-default',
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
              return (
                <button
                  key={i}
                  type="button"
                  title={`${date.getDate()} ${MONTHS_ID[date.getMonth()]}`}
                  onClick={() => status !== 'future' ? setSelectedDay(date) : undefined}
                  className={cn(
                    'h-7 w-full rounded-lg border text-xs font-bold transition-all flex items-center justify-center',
                    STATUS_STYLE[status],
                    isSelected && 'ring-2 ring-offset-1 ring-gray-400 scale-110',
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-100">
            {[
              { color: 'bg-green-400', label: 'Terpenuhi' },
              { color: 'bg-amber-400', label: 'Sebagian' },
              { color: 'bg-red-400',   label: 'Terlewat' },
              { color: 'bg-blue-500',  label: 'Hari ini' },
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
                      selectedStatus === 'fed' || selectedStatus === 'today-fed' ? 'bg-green-100 text-green-700' :
                      selectedStatus === 'partial' || selectedStatus === 'today-partial' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
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

export function Dashboard() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === UserRole.SUPER_ADMIN;
  const { cat, device, feedingLogs, targetOwnerId, loading } = useCatData();

  // Manual feed modal state
  const [showModal, setShowModal] = useState(false);
  const [feedingAmount, setFeedingAmount] = useState(50);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedResult, setFeedResult] = useState<'success' | 'error' | null>(null);

  // ── Today's feeding total from real logs ──────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayLogs = feedingLogs.filter(
    (l) => l.timestamp >= todayStart.getTime()
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
  const isAtLimit = dailyTarget > 0 && todayTotal >= dailyTarget;

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
      {isOffline && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3">
          <Wifi className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-500">
            Perangkat saat ini offline. Pastikan koneksi Wi-Fi aktif.
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

        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-10 text-gray-400" />
            <span className="text-[20px] text-black font-medium">Stok Makanan</span>
          </div>
          <h1 className="text-4xl font-black text-gray-800 mt-5">
            {device ? `${foodStock}%` : '—'}
          </h1>
          {device && (
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${foodStock}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full rounded-full ${foodStock < 20 ? 'bg-red-400' : 'bg-amber-400'}`}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Weight className="w-6 h-10 text-gray-400" />
            <span className="text-[20px] text-black font-medium">Berat Mangkok</span>
          </div>
          <h1 className="text-4xl font-black text-gray-800 mt-5">
            {device ? `${device.currentWeightOnScale}g` : '—'}
          </h1>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Settings2 className="w-6 h-10 text-gray-400" />
            <span className="text-[20px] text-black font-medium">Status Servo</span>
          </div>
          <h1 className={`text-3xl font-black mt-5 ${
            device?.servoStatus === 'active' ? 'text-amber-500' :
            device?.servoStatus === 'jammed' ? 'text-red-500' : 'text-green-500'
          }`}>
            {device?.servoStatus === 'active' ? 'Aktif' :
             device?.servoStatus === 'jammed' ? 'Macet' :
             device ? 'Siaga' : '—'}
          </h1>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Wifi className="w-6 h-10 text-gray-400" />
            <span className="text-[20px] text-black font-medium">Perangkat</span>
          </div>
          <h1 className={`text-3xl font-black mt-5 ${device?.isOnline ? 'text-blue-500' : 'text-gray-400'}`}>
            {device ? (device.isOnline ? 'Online' : 'Offline') : '—'}
          </h1>
          {device?.lastPulse && (
            <p className="text-xs text-gray-400 mt-2">
              Terakhir aktif: {new Date(device.lastPulse).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
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

      {/* ── FEEDING CALENDAR ── */}
      <FeedingCalendar feedingLogs={feedingLogs} dailyTarget={dailyTarget} />

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
