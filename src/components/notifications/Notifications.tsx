import { useEffect, useState } from 'react';
import {
  Bell, Utensils, Zap,
  AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw,
} from 'lucide-react';
import { useCatData } from '../../lib/useCatData';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import { getCurrentProfilePeriods, isTimestampInPeriods } from '../../lib/Profileperiods';
import type { FeedingLog } from '../../types';
import { UserRole } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Baru saja';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} mnt lalu`;
  if (diff < 7_200_000) return '1 jam lalu';
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`;
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function getDateLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yest = new Date(today.getTime() - 86_400_000);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Hari Ini';
  if (d.getTime() === yest.getTime()) return 'Kemarin';
  return new Date(ts).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
}

const isManual = (n?: string) => n === 'manual';
const isScheduled = (n?: string) => n === 'scheduled' || !n;

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeviceAlert {
  id: string;
  level: 'error' | 'warning';
  title: string;
  body: string;
}

interface LogGroup {
  label: string;
  logs: FeedingLog[];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AlertBanner({
  alert,
  onClick,
  isAdmin,
}: {
  alert: DeviceAlert;
  onClick?: () => void;
  isAdmin: boolean;
}) {
  const isErr = alert.level === 'error';
  const baseClass = cn(
    'w-full text-left rounded-2xl p-4 flex items-center gap-3 border transition-all',
    isErr
      ? 'bg-red-50 border-red-200 border-l-4 border-l-red-500'
      : 'bg-amber-50 border-amber-200 border-l-4 border-l-amber-400',
  );

  const inner = (
    <>
      {isErr
        ? <XCircle className="w-5 h-5 text-red-500 shrink-0" />
        : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className={cn('font-black text-sm', isErr ? 'text-red-700' : 'text-amber-700')}>
          {alert.title}
        </p>
        <p className={cn('text-xs mt-0.5 leading-relaxed', isErr ? 'text-red-500' : 'text-amber-600')}>
          {alert.body}
        </p>
      </div>
      {isAdmin && <span className="text-xs font-bold text-gray-400 shrink-0">Cek →</span>}
    </>
  );

  if (!isAdmin) {
    return <div className={baseClass}>{inner}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(baseClass, 'hover:shadow-md active:scale-[0.99]')}
    >
      {inner}
    </button>
  );
}

function FeedCard({
  log,
  catName,
  isNew,
  isAdmin,
  onClick,
}: {
  log: FeedingLog;
  catName?: string;
  isNew: boolean;
  isAdmin: boolean;
  onClick?: () => void;
}) {
  const manual = isManual(log.notes);
  const ok = log.status === 'success';
  const warn = log.status === 'warning';

  const StatusIcon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
  const statusColor = ok ? 'text-green-500' : warn ? 'text-amber-500' : 'text-red-500';

  const TriggerIcon = manual ? Utensils : Zap;
  const triggerColor = manual ? 'text-blue-500' : 'text-amber-500';
  const triggerBg = manual ? 'bg-blue-50' : 'bg-amber-50';
  const triggerLabel = manual ? 'Manual' : 'Otomatis';
  const triggerTxt = manual ? 'text-blue-600' : 'text-amber-600';
  const triggerBadge = manual ? 'bg-blue-100' : 'bg-amber-100';

  const cardBg = isNew
    ? (ok ? 'bg-green-50' : warn ? 'bg-amber-50/60' : 'bg-red-50')
    : 'bg-white';
  const cardBorder = ok
    ? 'border-green-100' : warn ? 'border-amber-100' : 'border-red-100';

  const title = ok
    ? (manual ? 'Feeding Manual Berhasil' : 'Feeding Otomatis Berhasil')
    : warn
      ? (manual ? 'Feeding Manual Kurang Akurat' : 'Feeding Otomatis Kurang Akurat')
      : (manual ? 'Feeding Manual Gagal' : 'Feeding Otomatis Gagal');

  const body = ok
    ? `${log.amountDispensed}g diberikan — sesuai target ${log.amountRequested}g`
    : warn
      ? `${log.amountDispensed}g diberikan — target ${log.amountRequested}g (toleransi terlampaui)`
      : `Target ${log.amountRequested}g tidak tercapai — periksa stok & servo`;

  const cardClass = cn(
    'w-full text-left rounded-2xl border p-4 flex items-start gap-3 transition-all',
    cardBg, cardBorder,
    isAdmin && 'hover:shadow-md active:scale-[0.99]',
  );

  const cardInner = (
    <>
      {/* Trigger icon */}
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', triggerBg)}>
        <TriggerIcon className={cn('w-4 h-4', triggerColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* App bar */}
        <div className="flex items-center gap-1 mb-1 flex-wrap">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">PawfectCare</span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] text-gray-400">{formatRelative(log.timestamp)}</span>
          {isNew && (
            <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black tracking-wide">
              BARU
            </span>
          )}
        </div>

        {/* Title */}
        <div className="flex items-center gap-1.5">
          <StatusIcon className={cn('w-3.5 h-3.5 shrink-0', statusColor)} />
          <p className="font-black text-sm text-gray-900 leading-snug">{title}</p>
        </div>

        {/* Body */}
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{body}</p>

        {/* Footer chips */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {catName && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              🐱 {catName}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5" />
            {formatClock(log.timestamp)}
          </span>
          <span className={cn(
            'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full',
            triggerBadge, triggerTxt,
          )}>
            <TriggerIcon className="w-2.5 h-2.5" />
            {triggerLabel}
          </span>
        </div>
      </div>
    </>
  );

  if (!isAdmin) {
    return <div className={cardClass}>{cardInner}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={cardClass}>
      {cardInner}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function Notifications({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { cat, device, feedingLogs, profileHistory, loading } = useCatData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === UserRole.SUPER_ADMIN;

  // Tick every 30 s so relative timestamps stay accurate
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Unread tracking: capture previous visit timestamp, then update to now
  const [lastReadAt] = useState<number>(() => {
    const prev = Number(localStorage.getItem('notif_last_read') ?? '0');
    localStorage.setItem('notif_last_read', String(Date.now()));
    return prev;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/load.gif" alt="loading" className="h-24 w-auto object-contain" />
      </div>
    );
  }

  const isNew = (ts: number) => ts > lastReadAt;

  // ── Device alerts ─────────────────────────────────────────────────────────
  const alerts: DeviceAlert[] = [];
  if (device) {
    if (device.servoStatus === 'jammed') {
      alerts.push({
        id: 'jammed', level: 'error',
        title: 'Servo Macet',
        body: 'Mekanisme dispenser terhambat — periksa fisik perangkat.',
      });
    }
    if (!device.isOnline) {
      alerts.push({
        id: 'offline', level: 'error',
        title: 'Perangkat Offline',
        body: 'Feeder tidak terhubung ke internet — periksa koneksi Wi-Fi.',
      });
    }
    if (device.foodStockLevel < 20) {
      alerts.push({
        id: 'stock', level: 'warning',
        title: 'Stok Pakan Hampir Habis',
        body: `Tersisa ${device.foodStockLevel}% — segera isi ulang agar jadwal feeding tidak terlewat.`,
      });
    }
  }

  // ── Feeding logs (7 hari terakhir, terbaru dulu) ─────────────────────────
  // Batasi hanya ke log milik profil kucing yang SEDANG aktif. Satu owner hanya
  // punya 1 dokumen cat (id tetap sama saat ganti profil), jadi catId saja
  // tidak cukup untuk membedakan profil lama vs baru — dipakai seluruh periode
  // aktif profil ini (activePeriods), sama seperti logika di FeedingHistory &
  // CatProfilePage. Ini juga mencakup periode lampau kalau profil ini pernah
  // non-aktif lalu diaktifkan kembali (bukan cuma cutoff tunggal).
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const activePeriods = getCurrentProfilePeriods(cat, profileHistory);
  const sortedLogs = [...feedingLogs]
    .filter(
      (l) =>
        (!cat?.id || l.catId === cat.id) &&
        l.timestamp >= sevenDaysAgo &&
        isTimestampInPeriods(l.timestamp, activePeriods)
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  // Group by date label
  const groups: LogGroup[] = [];
  for (const log of sortedLogs) {
    const label = getDateLabel(log.timestamp);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.logs.push(log);
    else groups.push({ label, logs: [log] });
  }

  const todayLogs = sortedLogs.filter((l) => getDateLabel(l.timestamp) === 'Hari Ini');
  const newCount = sortedLogs.filter((l) => isNew(l.timestamp)).length;
  const todayGram = todayLogs.reduce((s, l) => s + (l.amountDispensed ?? 0), 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-amber-500 shrink-0" />
            Notifikasi
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {newCount > 0
              ? `${newCount} notifikasi baru sejak kunjungan terakhir`
              : 'Semua notifikasi sudah dibaca'}
          </p>
        </div>
        {newCount > 0 && (
          <span className="shrink-0 self-start px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black">
            {newCount} baru
          </span>
        )}
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-2">
        {/* Today feeding count */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 flex flex-col items-center justify-center gap-1">
          <p className="text-xl font-black text-amber-600">{todayLogs.length}×</p>
          <p className="text-[10px] text-gray-400 font-medium text-center leading-tight">Feeding Hari Ini</p>
        </div>
        {/* Today total gram */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 flex flex-col items-center justify-center gap-1">
          <p className="text-xl font-black text-blue-600">{todayGram}g</p>
          <p className="text-[10px] text-gray-400 font-medium text-center leading-tight">Total Pakan</p>
        </div>
        {/* Stock */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 flex flex-col items-center justify-center gap-1">
          <p className={cn(
            'text-xl font-black',
            !device ? 'text-gray-400'
              : (device.foodStockLevel < 20 ? 'text-red-500' : 'text-green-600'),
          )}>
            {device ? `${device.foodStockLevel}%` : '—'}
          </p>
          <p className="text-[10px] text-gray-400 font-medium text-center leading-tight">Stok Pakan</p>
        </div>
      </div>

      {/* ── Device alerts (pinned system notifications) ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Peringatan Sistem
            </span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          {alerts.map((a) => (
            <AlertBanner
              key={a.id}
              alert={a}
              isAdmin={isAdmin}
              onClick={() => onNavigate?.('settings')}
            />
          ))}
        </div>
      )}

      {/* ── Feeding log notifications ── */}
      {sortedLogs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-14 text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-gray-600 font-black text-base">Belum Ada Aktivitas Feeding</p>
          <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
            Notifikasi feeding otomatis &amp; manual akan muncul di sini secara real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ label, logs: grpLogs }) => (
            <div key={label}>
              {/* Date separator */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">
                  {label}
                </span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              <div className="space-y-2">
                {grpLogs.map((log) => (
                  <FeedCard
                    key={log.id}
                    log={log}
                    catName={cat?.name}
                    isNew={isNew(log.timestamp)}
                    isAdmin={isAdmin}
                    onClick={() => onNavigate?.(isAdmin && isManual(log.notes) ? 'feeding-control' : 'history')}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Refresh hint */}
          <div className="flex items-center justify-center gap-1.5 pt-1 pb-2">
            <RefreshCw className="w-3 h-3 text-gray-300" />
            <span className="text-[10px] text-gray-300 font-medium">
              Data diperbarui secara real-time via Firestore
            </span>
          </div>
        </div>
      )}
    </div>
  );
}