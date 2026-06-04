import { useState } from 'react';
import { Layers, AlertCircle, Weight, Wifi, WifiOff, Settings2, X, Copy, Check, Link2, Clock, Info } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useCatData } from '../../lib/useCatData';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types';

function getBodyLabel(bc: number): string {
  if (bc <= 2) return 'Sangat Kurus';
  if (bc <= 4) return 'Kurus';
  if (bc <= 5) return 'Normal';
  if (bc <= 7) return 'Overweight';
  return 'Obesitas';
}

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
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

  // ── Profile-aware log filtering ───────────────────────
  // All logs are reset when profile changes (profileUpdatedAt is the cutoff)
  const [selectedDate, setSelectedDate] = useState(() => {
  return new Date().toISOString().split('T')[0];
  });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  // Filter ALL logs by profileUpdatedAt so charts reset when profile changes
  const profileUpdatedAt = cat?.profileUpdatedAt ?? 0;
  const filteredLogs = feedingLogs.filter((l) => l.timestamp >= profileUpdatedAt);
  const hiddenLogsCount = feedingLogs.length - filteredLogs.length;

  // Today's logs: since start of today (or profile update if it happened today)
  const profileUpdatedTodayMs =
    profileUpdatedAt >= todayStartMs ? profileUpdatedAt : todayStartMs;
  const selectedStart = new Date(selectedDate);
selectedStart.setHours(0, 0, 0, 0);

const selectedEnd = new Date(selectedDate);
selectedEnd.setHours(23, 59, 59, 999);

const selectedLogs = filteredLogs.filter(
  (l) =>
    l.timestamp >= selectedStart.getTime() &&
    l.timestamp <= selectedEnd.getTime()
);
  const selectedTotal = Math.round(
  selectedLogs.reduce(
    (sum, l) => sum + (l.amountDispensed ?? 0),
    0
  )
);

  const dailyTarget = cat?.dailyGramTarget ?? 0;
  const progressPct =
    dailyTarget > 0 ? Math.min(Math.round((selectedTotal / dailyTarget) * 100), 100) : 0;
  const foodStock = device?.foodStockLevel ?? 0;

  // ── Area chart: feeding by 4-hour buckets today ───────
  const bucketLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  const buckets: Record<string, number> = Object.fromEntries(
    bucketLabels.map((l) => [l, 0])
  );
  selectedLogs.forEach((log) => {
    const hour = new Date(log.timestamp).getHours();
    const label = bucketLabels[Math.floor(hour / 4)];
    if (label !== undefined) buckets[label] += log.amountDispensed ?? 0;
  });
  const feedingDynamics = bucketLabels.map((time) => ({
    time,
    weight: Math.round(buckets[time]),
  }));

  // ── Bar chart: weekly totals (filteredLogs resets on profile change) ─────────
  const weeklyMap: Record<string, number> = {};
  const now = Date.now();
  selectedLogs.forEach((log) => {
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
  const isOverfed = dailyTarget > 0 && selectedTotal >= dailyTarget;
  const isLowStock = foodStock > 0 && foodStock < 20;
  const isOffline = device !== null && !device.isOnline;

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

      {/* ── PROFILE RESET BANNER ── */}
      {profileUpdatedAt > 0 && hiddenLogsCount > 0 && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-700">
              Data analitik direset setelah profil diperbarui
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              Profil kucing diperbarui pada{' '}
              <span className="font-semibold">
                {new Date(profileUpdatedAt).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
              . Analitik sekarang hanya menghitung data sejak profil terbaru.{' '}
              {hiddenLogsCount} log sebelumnya disembunyikan agar target feeding tidak tercampur data profil lama.
            </p>
          </div>
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
        <div className="lg:col-span-2 bg-white rounded-4xl border border-gray-200 p-5 md:p-8 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center gap-5 md:gap-8">

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
              <h1 className="text-2xl md:text-[42px] leading-none font-black text-gray-900">
                {cat?.name ?? '—'}
              </h1>

              <div className="flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-5">
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

              <div className="flex flex-wrap gap-6 md:gap-12 mt-4 md:mt-8">
                <div>
                  <p className="text-sm md:text-lg text-gray-500 font-medium">Target Harian</p>
                  <h2 className="text-2xl md:text-[42px] font-black text-amber-500 leading-none mt-1 md:mt-2">
                    {dailyTarget > 0 ? `${dailyTarget}g` : '—'}
                  </h2>
                </div>
                <div>
                  <p className="text-sm md:text-lg text-gray-500 font-medium">Kalori/Hari</p>
                  <h2 className="text-2xl md:text-[42px] font-black text-blue-500 leading-none mt-1 md:mt-2">
                    {cat?.dailyCalorieTarget ? `${cat.dailyCalorieTarget}` : '—'}
                  </h2>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PROGRESS CARD */}
        <div className="bg-white rounded-4xl border border-gray-200 p-5 md:p-8 shadow-sm flex flex-col justify-center">
          <p className="text-sm md:text-lg font-bold uppercase tracking-[4px] text-amber-500">
            Progress Pemberian
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(selectedDate).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <div className="my-5 md:my-10 text-center">
            <h1 className="text-5xl md:text-[72px] leading-none font-black text-gray-900">
              {selectedTotal}g
            </h1>
            <p className="text-lg md:text-2xl text-gray-500 mt-2 md:mt-4 font-medium">
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

        {/* 1 — Food Stock Level */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-500" />
            </div>
            <span className={cn('text-xs font-bold px-3 py-1 rounded-full',
              !device           ? 'bg-gray-100 text-gray-400'
              : foodStock > 50  ? 'bg-green-100 text-green-700'
              : foodStock > 20  ? 'bg-yellow-100 text-yellow-700'
              :                   'bg-red-100 text-red-700'
            )}>
              {!device ? 'No Device' : foodStock > 50 ? 'High' : foodStock > 20 ? 'Medium' : 'Low'}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-400 font-medium">Food Stock Level</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-4xl font-black text-gray-900">{device ? `${foodStock}%` : '—'}</span>
              {device && (
                <span className={cn('text-sm font-semibold',
                  foodStock > 50 ? 'text-amber-500' : foodStock > 20 ? 'text-yellow-500' : 'text-red-500'
                )}>
                  {foodStock > 50 ? 'Full' : foodStock > 20 ? 'Medium' : 'Critical'}
                </span>
              )}
            </div>
          </div>

          {/* Segmented bar */}
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }, (_, i) => {
              const filled = device && (i + 1) * 20 <= foodStock;
              return (
                <div key={i} className={cn('h-2 flex-1 rounded-full',
                  filled
                    ? foodStock > 50 ? 'bg-amber-400' : foodStock > 20 ? 'bg-yellow-400' : 'bg-red-400'
                    : 'bg-gray-100'
                )} />
              );
            })}
          </div>
        </div>

        {/* 2 — Current Bowl Weight */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Weight className="w-5 h-5 text-blue-500" />
            </div>
            <span className={cn('text-xs font-bold px-3 py-1 rounded-full',
              device?.lastPulse && Date.now() - device.lastPulse < 120000
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-400'
            )}>
              {!device ? 'No Device'
               : device.lastPulse && Date.now() - device.lastPulse < 120000 ? 'Updated Just Now'
               : device.lastPulse ? `${Math.floor((Date.now() - device.lastPulse) / 60000)}m ago`
               : 'No Signal'}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-400 font-medium">Current Bowl Weight</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-4xl font-black text-gray-900">{device?.currentWeightOnScale ?? 0}g</span>
              <span className="text-sm font-semibold text-gray-400">Remaining</span>
            </div>
          </div>

          {selectedLogs.length > 0 && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span>↘</span>
              <span>-{selectedLogs[0].amountDispensed}g dari pemberian terakhir</span>
            </p>
          )}
        </div>

        {/* 3 — Servo Status */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-orange-500" />
            </div>
            {device && (
              <span className={cn('flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full',
                device.servoStatus === 'jammed'  ? 'bg-red-100 text-red-700'
                : device.servoStatus === 'active' ? 'bg-amber-100 text-amber-700'
                :                                   'bg-green-100 text-green-700'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full',
                  device.servoStatus === 'jammed'  ? 'bg-red-500'
                  : device.servoStatus === 'active' ? 'bg-amber-500 animate-pulse'
                  :                                   'bg-green-500'
                )} />
                {device.servoStatus === 'jammed' ? 'Error' : device.servoStatus === 'active' ? 'Active' : 'Ready'}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 font-medium">Servo Status</p>
          <p className="text-4xl font-black text-gray-900 mt-1 flex-1">
            {device?.servoStatus === 'active' ? 'Running'
             : device?.servoStatus === 'jammed' ? 'Jammed'
             : device ? 'Idle' : '—'}
          </p>

          <div className="pt-3 mt-3 border-t border-gray-50 flex justify-between items-center">
            <span className="text-xs text-gray-400">Last calibration</span>
            <span className="text-xs font-bold text-gray-600">
              {device?.lastPulse
                ? (() => {
                    const d = Math.floor((Date.now() - device.lastPulse) / 86400000);
                    return d === 0 ? 'Today' : `${d}d ago`;
                  })()
                : '—'}
            </span>
          </div>
        </div>

        {/* 4 — Device Status */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-violet-500" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-500">5GHz</span>
          </div>

          <p className="text-xs text-gray-400 font-medium">Device Status</p>
          <div className="flex items-center gap-2 mt-1 flex-1">
            <span className="text-4xl font-black text-gray-900">
              {device ? (device.isOnline ? 'Online' : 'Offline') : '—'}
            </span>
            {device?.isOnline && (
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>

          {/* Decorative network nodes */}
          <svg className="absolute bottom-3 right-3 opacity-[0.06] w-24 h-24" viewBox="0 0 80 80" fill="none">
            <circle cx="62" cy="62" r="6" fill="#374151" />
            <circle cx="42" cy="50" r="5" fill="#374151" />
            <circle cx="62" cy="32" r="5" fill="#374151" />
            <circle cx="22" cy="42" r="4" fill="#374151" />
            <line x1="62" y1="62" x2="42" y2="50" stroke="#374151" strokeWidth="1.5" />
            <line x1="42" y1="50" x2="62" y2="32" stroke="#374151" strokeWidth="1.5" />
            <line x1="42" y1="50" x2="22" y2="42" stroke="#374151" strokeWidth="1.5" />
            <line x1="62" y1="62" x2="62" y2="32" stroke="#374151" strokeWidth="1" strokeDasharray="2 3" />
          </svg>
        </div>
      </div>
      <div className="bg-amber-50 rounded-3xl border border-amber-200 p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-gray-800">
            Filter Monitoring
          </h3>
          <p className="text-sm text-gray-400">
            Pilih tanggal untuk melihat riwayat monitoring kucing
          </p>
        </div>

        <input
          type="date"
          aria-label="Pilih tanggal untuk filter"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 rounded-xl border border-amber-400 bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-676rsz00"
        />
      </div>
    </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800">Dinamika Pemberian Makan</h2>
              <p className="text-sm text-gray-400 mt-1">Tren konsumsi tanggal dipilih (gram)</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-500 text-xs font-bold">
              {selectedLogs.length} event
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
        feedingLogs={selectedLogs}
        bowlWeight={device?.currentWeightOnScale ?? 0}
        catName={cat?.name ?? 'Kucing'}
        catPhotoUrl={(cat as any)?.photoUrl}
      />


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