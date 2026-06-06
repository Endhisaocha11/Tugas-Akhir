import { useState, useMemo } from 'react';
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

  // ── Filter state ─────────────────────────────────────
  type FilterMode = 'all' | 'today' | 'date';
  const [filterMode, setFilterMode] = useState<FilterMode>('today');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

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

  // ── Area chart: per-hari (mode all) atau per-4-jam (mode tanggal) ────────────
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

  // ── Bar chart: selalu 7 hari terakhir — tidak ikut filter apapun ─────────────
  const weeklyConsumption = useMemo(() => {
    const weeklyMap: Record<string, number> = {};
    const now = Date.now();
    allCatLogs.forEach((log) => {
      const daysAgo = Math.floor((now - log.timestamp) / 86400000);
      if (daysAgo < 7) {
        const label = DAYS_ID[new Date(log.timestamp).getDay()];
        weeklyMap[label] = (weeklyMap[label] ?? 0) + (log.amountDispensed ?? 0);
      }
    });
    return DAYS_ID.map((day) => ({ day, amount: Math.round(weeklyMap[day] ?? 0) }));
  }, [allCatLogs]);

  // ── Alerts ────────────────────────────────────────────
  const isOverfed = dailyTarget > 0 && selectedTotal >= dailyTarget;
  // Notif muncul saat device ada + stok < 20% (termasuk 0%)
  // Hilang hanya saat stok sudah ≥ 20% lagi
  const isLowStock = device !== null && foodStock < 20;
  const isOffline = device !== null && !device.isOnline;

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
        {isOffline && (
          <div className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5">
            <div className="flex items-center gap-3">
              <WifiOff className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="text-sm font-semibold text-gray-600">
                Perangkat offline — terakhir aktif:{' '}
                {device?.lastPulse
                  ? new Date(device.lastPulse).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
            {isAdmin && (
              <button type="button" onClick={() => setShowConnectModal(true)}
                className="shrink-0 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold transition-colors">
                Info
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
              Profil diperbarui pada {new Date(profileUpdatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}.
              {' '}{hiddenLogsCount} log lama disembunyikan agar tidak tercampur data profil baru.
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

      {/* ── MONITORING KUCING + FILTER ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header dengan filter inline */}
        <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-base text-gray-900">Monitoring Pakan</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeLogs.length > 0
                ? `${activeLogs.length} pemberian · ${filterLabel}`
                : `Tidak ada data · ${filterLabel}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'today', 'date'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={cn(
                  'px-4 py-1.5 rounded-xl text-xs font-black transition-all',
                  filterMode === mode
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                {mode === 'all' ? 'Semua' : mode === 'today' ? 'Hari Ini' : 'Pilih Tanggal'}
              </button>
            ))}
            {filterMode === 'date' && (
              <input
                type="date"
                aria-label="Pilih tanggal"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-xs font-bold text-gray-700"
              />
            )}
          </div>
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

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Tren Pemberian — mengikuti filter */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-gray-800">Tren Pemberian Pakan</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {filterMode === 'all' ? 'Total per hari — 7 hari terakhir' : `Distribusi per sesi · ${filterLabel}`}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
              {activeLogs.length} sesi
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={feedingDynamics}>
                <defs>
                  <linearGradient id="colorFeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f9fafb" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} unit="g" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}g`, 'Pakan']} />
                <Area type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFeed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Konsumsi Mingguan — selalu 7 hari, bebas filter */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-gray-800">Konsumsi Mingguan</h2>
              <p className="text-xs text-gray-400 mt-0.5">7 hari terakhir — tidak terpengaruh filter</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
              7 hari
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyConsumption}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f9fafb" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} unit="g" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}g`, 'Konsumsi']} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
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