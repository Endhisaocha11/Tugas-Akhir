import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Utensils, Clock, AlertTriangle, Play, Settings2,
  Check, Zap, ZapOff, Loader2, CheckCircle2, XCircle,
  Pencil, Info, WifiOff, Copy, ChevronDown, ChevronUp,
  History, Cpu, Scale, BanIcon,
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { useCatData } from '../../lib/useCatData';
import { cn } from '../../lib/utils';
import type { FeedingScheduleSlot, DeviceStatus } from '../../types';

// ── Color Utilities ───────────────────────────────────────────────────────────

function getFoodStockTheme(pct: number) {
  if (pct > 50) return { bar: 'bg-green-400', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: '🟢', label: 'Stok cukup' };
  if (pct > 20) return { bar: 'bg-yellow-400', text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: '🟡', label: 'Mulai berkurang' };
  return { bar: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: '🔴', label: 'Hampir habis' };
}

function getBowlWeightTheme(weightGrams: number) {
  if (weightGrams > 30) return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: '🟢', label: 'Masih tersedia' };
  if (weightGrams > 10) return { text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: '🟡', label: 'Berkurang' };
  return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: '🔴', label: weightGrams === 0 ? 'Habis' : 'Hampir habis' };
}

function getProgressBarColor(pct: number) {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 75) return 'bg-amber-400';
  return 'bg-green-400';
}

// ── Schedule helpers ──────────────────────────────────────────────────────────

function getSlotLabel(time: string): string {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 11) return 'Pagi';
  if (hour < 15) return 'Siang';
  if (hour < 19) return 'Sore';
  return 'Malam';
}

function getSlotIcon(time: string): string {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 11) return '🌅';
  if (hour < 15) return '☀️';
  if (hour < 19) return '🌤️';
  return '🌙';
}

// ── DeviceMonitorCard ─────────────────────────────────────────────────────────

interface DeviceMonitorCardProps {
  device: DeviceStatus | undefined;
  deviceNumber: 1 | 2;
  isSelected: boolean;
  onSelect: () => void;
}

function DeviceMonitorCard({ device, deviceNumber, isSelected, onSelect }: DeviceMonitorCardProps) {
  const stockTheme = getFoodStockTheme(device?.foodStockLevel ?? 0);
  const bowlTheme = getBowlWeightTheme(device?.currentWeightOnScale ?? 0);
  const label = device?.name ?? `Feeder ESP ${deviceNumber}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={cn(
        'flex-1 p-5 rounded-3xl border-2 cursor-pointer transition-all select-none',
        isSelected
          ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100'
          : 'border-gray-200 bg-white hover:border-amber-200'
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full shrink-0',
            device?.isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-300'
          )} />
          <span className="font-black text-gray-800 text-base">{label}</span>
          {isSelected && (
            <span className="text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-bold">Aktif</span>
          )}
        </div>
        <span className={cn(
          'text-xs font-bold px-2 py-1 rounded-lg',
          device?.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        )}>
          {device ? (device.isOnline ? 'Online' : 'Offline') : 'Belum terhubung'}
        </span>
      </div>

      {/* Food stock */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500 font-semibold">Stok pakan</span>
          <span className={cn('font-black', stockTheme.text)}>{device?.foodStockLevel ?? 0}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(device?.foodStockLevel ?? 0, 100)}%` }}
            transition={{ duration: 0.7 }}
            className={cn('h-full rounded-full', stockTheme.bar)}
          />
        </div>
        <p className={cn('text-xs mt-1 font-semibold', stockTheme.text)}>
          {stockTheme.dot} {stockTheme.label}
        </p>
      </div>

      {/* Bowl weight / food eaten indicator */}
      <div className={cn('px-3 py-2.5 rounded-2xl border mb-3', bowlTheme.bg, bowlTheme.border)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Scale className={cn('w-3.5 h-3.5', bowlTheme.text)} />
            <span className="text-xs text-gray-500 font-semibold">Mangkuk</span>
          </div>
          <span className={cn('font-black text-lg leading-none', bowlTheme.text)}>
            {device?.currentWeightOnScale ?? 0}g
          </span>
        </div>
        <p className={cn('text-xs font-bold mt-1', bowlTheme.text)}>
          {bowlTheme.dot} {bowlTheme.label}
        </p>
      </div>

      {/* Servo status */}
      <div className="flex items-center gap-2">
        <Cpu className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-400">Servo:</span>
        <span className={cn(
          'text-xs font-bold px-2 py-0.5 rounded-lg',
          device?.servoStatus === 'active' ? 'bg-blue-100 text-blue-700' :
          device?.servoStatus === 'jammed' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-500'
        )}>
          {device?.servoStatus === 'active' ? '⚡ Aktif' :
           device?.servoStatus === 'jammed' ? '⚠️ Macet' :
           '✓ Idle'}
        </span>
        {device?.lastPulse && (
          <span className="text-xs text-gray-300 ml-auto">
            {new Date(device.lastPulse).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Usage History Row ─────────────────────────────────────────────────────────

interface UsageDayData {
  total: number;
  count: number;
  manual: number;
  auto: number;
  first: number;
  last: number;
}

function UsageDayRow({ dateKey, data, dailyTarget }: { dateKey: string; data: UsageDayData; dailyTarget: number }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = dateKey === todayStr;
  const date = new Date(dateKey + 'T00:00:00');
  const pct = dailyTarget > 0 ? Math.min(Math.round((data.total / dailyTarget) * 100), 100) : 0;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="w-24 shrink-0">
        <p className={cn('text-sm font-black', isToday ? 'text-amber-600' : 'text-gray-800')}>
          {isToday ? 'Hari ini' : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
        </p>
        <p className="text-xs text-gray-400">
          {date.toLocaleDateString('id-ID', { weekday: 'long' })}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base font-black text-amber-500">{Math.round(data.total)}g</span>
          {dailyTarget > 0 && (
            <span className={cn('text-xs font-semibold', pct >= 100 ? 'text-red-500' : 'text-gray-400')}>
              / {dailyTarget}g ({pct}%)
            </span>
          )}
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
            className={cn('h-full rounded-full', getProgressBarColor(pct))}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400">{data.count}x pemberian</span>
          {data.manual > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
              Manual {data.manual}x
            </span>
          )}
          {data.auto > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
              Otomatis {data.auto}x
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-gray-400">
          {new Date(data.first).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-xs text-gray-300">—</p>
        <p className="text-xs text-gray-400">
          {new Date(data.last).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FeedingControl() {
  const { user } = useAuth();
  const { cat, devices, feedingLogs, targetOwnerId, loading } = useCatData();

  // Device info modal
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  // Selected device for manual feed
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Schedule
  const [schedule, setSchedule] = useState<FeedingScheduleSlot[]>([]);
  const [smartFeedEnabled, setSmartFeedEnabled] = useState(true);

  // Manual feed
  const [feedingAmount, setFeedingAmount] = useState(50);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedResult, setFeedResult] = useState<'success' | 'error' | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Edit mode
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editError, setEditError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // History visibility
  const [showHistory, setShowHistory] = useState(false);

  // ── Sync from Firestore ──────────────────────────────────────────────────
  useEffect(() => {
    if (!cat) return;
    const slots = (cat.feedingSchedule ?? []).map((s) => ({ ...s, active: s.active !== false }));
    setSchedule(slots);
    setSmartFeedEnabled((cat as any).smartFeedEnabled !== false);
  }, [cat]);

  // Auto-select first device; reset when owner profile switches
  useEffect(() => {
    setSelectedDeviceId(devices.length > 0 ? devices[0].id : '');
  }, [targetOwnerId]);

  useEffect(() => {
    if (!selectedDeviceId && devices.length > 0) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const dailyTarget = cat?.dailyGramTarget ?? 0;
  const scheduleTotal = schedule.reduce((sum, s) => sum + s.amount, 0);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  // Hanya hitung log setelah profil terakhir disimpan (jika disimpan hari ini)
  const profileUpdatedTodayMs =
    cat?.profileUpdatedAt && cat.profileUpdatedAt >= todayStartMs
      ? cat.profileUpdatedAt
      : todayStartMs;
  const todayTotal = Math.round(
    feedingLogs
      .filter((l) => l.timestamp >= profileUpdatedTodayMs)
      .reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0)
  );

  // Use Firestore flag as the authoritative "at limit" state — cleared on profile change
  const isAtDailyLimit = cat?.dailyLimitReachedDate === todayStr;
  // Separate live calc used only to trigger writing the flag to Firestore
  const isActuallyOverLimit = dailyTarget > 0 && todayTotal >= dailyTarget;
  const wouldExceed = dailyTarget > 0 && (todayTotal + feedingAmount) > dailyTarget;
  const progressPct = dailyTarget > 0 ? Math.min(Math.round((todayTotal / dailyTarget) * 100), 100) : 0;

  // Adjustment based on actual logged feedings — used for Firestore sync (ESP32 reads this)
  const syncAdjustedSlots = useMemo(() => {
    if (!dailyTarget) return null;
    const futureSlots = schedule.filter((s) => s.active !== false && s.time > currentTimeStr);
    if (futureSlots.length === 0) return null;
    const futureTotal = futureSlots.reduce((sum, s) => sum + s.amount, 0);
    const remaining = dailyTarget - todayTotal;
    if (remaining >= futureTotal) return null;
    const factor = Math.max(0, remaining) / futureTotal;
    return futureSlots.map((s) => ({
      time: s.time,
      originalAmount: s.amount,
      adjustedAmount: Math.max(0, Math.round(s.amount * factor)),
    }));
  }, [dailyTarget, todayTotal, schedule, currentTimeStr]);

  // Preview adjustment including pending slider amount — used for schedule display
  // Updates live as user moves the slider so they can see the impact before confirming
  const liveAdjustedSlots = useMemo(() => {
    if (!dailyTarget) return null;
    const futureSlots = schedule.filter((s) => s.active !== false && s.time > currentTimeStr);
    if (futureSlots.length === 0) return null;
    const futureTotal = futureSlots.reduce((sum, s) => sum + s.amount, 0);
    const remaining = dailyTarget - todayTotal - feedingAmount;
    if (remaining >= futureTotal) return null;
    const factor = Math.max(0, remaining) / futureTotal;
    return futureSlots.map((s) => ({
      time: s.time,
      originalAmount: s.amount,
      adjustedAmount: Math.max(0, Math.round(s.amount * factor)),
    }));
  }, [dailyTarget, todayTotal, feedingAmount, schedule, currentTimeStr]);

  const futureScheduleTotal = syncAdjustedSlots
    ? syncAdjustedSlots.reduce((sum, s) => sum + s.adjustedAmount, 0)
    : schedule.filter((s) => s.active !== false && s.time > currentTimeStr).reduce((sum, s) => sum + s.amount, 0);
  const projectedTotal = todayTotal + futureScheduleTotal;
  const willExceedWithSchedule = dailyTarget > 0 && projectedTotal > dailyTarget;

  // Selected device object
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? devices[0] ?? null;

  // Usage history grouped by day (last 7 days)
  const usageDays = useMemo(() => {
    const map = new Map<string, UsageDayData>();
    feedingLogs.forEach((log) => {
      const d = new Date(log.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const existing = map.get(key) ?? { total: 0, count: 0, manual: 0, auto: 0, first: log.timestamp, last: log.timestamp };
      map.set(key, {
        total: existing.total + (log.amountDispensed ?? 0),
        count: existing.count + 1,
        manual: existing.manual + (log.notes === 'manual' ? 1 : 0),
        auto: existing.auto + (log.notes !== 'manual' ? 1 : 0),
        first: Math.min(existing.first, log.timestamp),
        last: Math.max(existing.last, log.timestamp),
      });
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7);
  }, [feedingLogs]);

  // ── Write daily limit flag to Firestore when limit is hit ─────────────────
  // Guard: skip if profile was reset today (dailyLimitResetDate === today)
  useEffect(() => {
    if (!isActuallyOverLimit || !cat || isAtDailyLimit) return;
    if (cat.dailyLimitResetDate === todayStr) return;
    updateDoc(doc(db, 'cats', cat.id), {
      dailyLimitReachedDate: todayStr,
    }).catch(console.error);
  }, [isActuallyOverLimit, isAtDailyLimit, cat, todayStr]);

  // ── Firestore helpers ────────────────────────────────────────────────────
  const catDocRef = () => doc(db, 'cats', cat!.id);

  const persistSchedule = async (updated: FeedingScheduleSlot[]) => {
    setSavingSchedule(true);
    try {
      await updateDoc(catDocRef(), { feedingSchedule: updated });
    } catch (err) {
      console.error('Gagal menyimpan jadwal:', err);
    } finally {
      setSavingSchedule(false);
    }
  };

  // Ref to prevent redundant Firestore writes when todayTotal hasn't changed
  const lastSyncedTotalRef = useRef<number>(-1);

  // Sync confirmed feedings adjustment to Firestore so ESP32 reads updated slot amounts.
  // Fires whenever any feeding is logged (manual OR automatic from ESP32).
  useEffect(() => {
    if (!targetOwnerId || todayTotal === lastSyncedTotalRef.current) return;
    lastSyncedTotalRef.current = todayTotal;
    const adjustment = syncAdjustedSlots
      ? { date: todayStr, manualTotal: todayTotal, slots: syncAdjustedSlots }
      : null;
    if (!cat?.id) return;
    updateDoc(doc(db, 'cats', cat.id), {
      dailyAdjustments: adjustment,
    }).catch(console.error);
  }, [todayTotal, cat, syncAdjustedSlots, todayStr]);

  // ── Smart Feed Toggle ─────────────────────────────────────────────────────
  const handleToggleSmartFeed = async () => {
    const next = !smartFeedEnabled;
    setSmartFeedEnabled(next);
    try {
      await updateDoc(catDocRef(), { smartFeedEnabled: next });
    } catch {
      setSmartFeedEnabled(!next);
    }
  };

  // ── Toggle slot active ────────────────────────────────────────────────────
  const handleToggleSlot = async (index: number) => {
    const updated = schedule.map((s, i) =>
      i === index ? { ...s, active: !(s.active !== false) } : s
    );
    setSchedule(updated);
    await persistSchedule(updated);
  };

  // ── Edit slot ────────────────────────────────────────────────────────────
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditTime(schedule[index].time);
    setEditAmount(schedule[index].amount);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;
    setEditError('');
    const originalTime = schedule[editingIndex].time;

    if (editTime !== originalTime && schedule.some((s, i) => i !== editingIndex && s.time === editTime)) {
      setEditError('Waktu ini sudah digunakan slot lain.');
      return;
    }

    const updated = schedule
      .map((s, i) =>
        i === editingIndex
          ? { ...s, time: editTime, amount: editAmount, label: getSlotLabel(editTime) }
          : s
      )
      .sort((a, b) => a.time.localeCompare(b.time));

    setSchedule(updated);
    setEditingIndex(null);
    await persistSchedule(updated);
  };

  // ── Manual Feed ───────────────────────────────────────────────────────────
  const handleManualFeed = async () => {
    if (!user || isFeeding) return;
    const deviceId = selectedDevice?.id;
    if (!deviceId) { setFeedResult('error'); return; }

    setIsFeeding(true);
    setFeedResult(null);
    try {
      // 1. Kirim command ke RTDB agar ESP32 buka servo
      if (rtdb) {
        await set(ref(rtdb, `devices/${deviceId}/command`), {
          type: 'feed',
          amount: feedingAmount,
          status: 'pending',
          requestedAt: Date.now(),
        });
      }

      // 2. Catat log ke Firestore (untuk riwayat & analitik)
      const logId = `${targetOwnerId}_${Date.now()}`;
      await setDoc(doc(db, 'feedingLogs', logId), {
        id: logId,
        catId: cat?.id ?? '',
        deviceId,
        timestamp: Date.now(),
        amountRequested: feedingAmount,
        amountDispensed: feedingAmount,
        status: 'success',
        notes: 'manual',
      });

      // 3. Tandai daily limit jika tercapai
      if (dailyTarget > 0 && (todayTotal + feedingAmount) >= dailyTarget) {
        await updateDoc(catDocRef(), { dailyLimitReachedDate: todayStr });
      }

      setFeedResult('success');
      setShowConfirm(false);
    } catch {
      setFeedResult('error');
    } finally {
      setIsFeeding(false);
      setTimeout(() => setFeedResult(null), 4000);
    }
  };

  const handleCopyUID = () => {
    navigator.clipboard.writeText(targetOwnerId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Daily Target Alert (for schedule card) ────────────────────────────────
  const DailyTargetAlert = () => {
    if (!dailyTarget) return null;
    const scheduleRemaining = dailyTarget - scheduleTotal;
    const scheduleExceeded = scheduleRemaining < 0;
    const combinedRemaining = dailyTarget - projectedTotal;
    const combinedExceeded = !scheduleExceeded && willExceedWithSchedule;
    const isAnyExceeded = scheduleExceeded || combinedExceeded;

    return (
      <div className={cn(
        'flex items-start gap-2.5 p-3 rounded-xl border text-xs',
        isAnyExceeded ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
      )}>
        <Info className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', isAnyExceeded ? 'text-red-400' : 'text-blue-400')} />
        <div className={isAnyExceeded ? 'text-red-700' : 'text-blue-700'}>
          <p className="font-black">
            Maks pakan harian: <span className="text-base">{dailyTarget}g</span>
          </p>
          <p className="mt-0.5">
            Total jadwal: {scheduleTotal}g
            {scheduleExceeded
              ? <span className="font-bold"> — Melebihi target {Math.abs(scheduleRemaining)}g! Kurangi porsi.</span>
              : <span> — Kapasitas jadwal: <strong>{scheduleRemaining}g</strong></span>}
          </p>
          {!scheduleExceeded && todayTotal > 0 && (
            <p className="mt-1 pt-1 border-t border-current/20">
              Sudah diberikan: <strong>{todayTotal}g</strong> + Sisa jadwal hari ini: <strong>{futureScheduleTotal}g</strong> = <strong>{projectedTotal}g</strong>
              {combinedExceeded
                ? <span className="font-bold"> — Gabungan melebihi target {Math.abs(combinedRemaining)}g!</span>
                : <span> — Sisa kapasitas nyata: <strong>{Math.max(0, combinedRemaining)}g</strong></span>}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const primaryDevice = devices[0];
  const secondaryDevice = devices[1];
  const device1Id = primaryDevice?.id ?? '';
  const device2Id = secondaryDevice?.id ?? '';

  return (
    <div className="flex-1 flex flex-col gap-5 md:gap-8 w-full">

      {/* ── HEADER ── */}
      <div>
        <h2 className="text-2xl md:text-5xl font-black text-gray-900">Feeding Control</h2>
        <p className="text-gray-400 mt-1 text-sm md:text-lg">
          Kontrol pemberian makan langsung ke PawfectCare.
        </p>
      </div>

      {/* ── DAILY LIMIT BANNER ── */}
      {isAtDailyLimit && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-3xl px-6 py-4"
        >
          <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
            <BanIcon className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="font-black text-red-700 text-base">Pakan hari ini sudah melebihi batas!</p>
            <p className="text-sm text-red-500 mt-0.5">
              Total diberikan: <strong>{todayTotal}g</strong> dari target <strong>{dailyTarget}g</strong>.
              Mode otomatis dinonaktifkan sementara hingga hari berikutnya.
            </p>
          </div>
          <div className="shrink-0 px-4 py-2 bg-red-100 rounded-2xl text-red-700 text-xs font-black text-center">
            {todayTotal}g / {dailyTarget}g
          </div>
        </motion.div>
      )}

      {/* ── DEVICE STATUS BANNERS ── */}
      {devices.length === 0 && (
        <div className="flex items-center justify-between gap-4 bg-orange-50 border border-orange-200 rounded-3xl px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="font-bold text-orange-700">Perangkat ESP32 belum terhubung</p>
              <p className="text-sm text-orange-500 mt-0.5">Jadwal otomatis tidak akan berjalan tanpa perangkat aktif.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDeviceInfo(true)}
            className="shrink-0 px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
          >
            Cara Menghubungkan
          </button>
        </div>
      )}

      {devices.length > 0 && !devices.some((d) => d.isOnline) && (
        <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-3xl px-6 py-4">
          <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
            <WifiOff className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-600">Semua perangkat offline</p>
            <p className="text-sm text-gray-400 mt-0.5">Jadwal otomatis tidak berjalan saat perangkat mati.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeviceInfo(true)}
            className="shrink-0 px-4 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-600 text-sm font-bold transition-colors"
          >
            Info
          </button>
        </div>
      )}

      {/* ── CONNECT DEVICE INFO MODAL ── */}
      {showDeviceInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeviceInfo(false); }}
        >
          <div className="bg-white rounded-4xl p-5 md:p-8 w-full max-w-md shadow-2xl relative">
            <button
              type="button"
              title="Tutup"
              onClick={() => setShowDeviceInfo(false)}
              className="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-orange-50 rounded-3xl flex items-center justify-center shrink-0">
                <WifiOff className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Hubungkan ESP32</h3>
                <p className="text-sm text-gray-400">Salin UID ini ke firmware perangkat</p>
              </div>
            </div>
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Owner UID</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <code className="flex-1 text-sm font-bold text-gray-800 break-all">{targetOwnerId}</code>
                <button
                  type="button"
                  title="Salin UID"
                  onClick={handleCopyUID}
                  className="shrink-0 w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-amber-50 hover:border-amber-300 transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {copied && <p className="text-xs text-green-500 font-semibold mt-1">UID disalin!</p>}
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-1">
              <p className="text-xs text-blue-700 font-semibold">
                Realtime Database path ESP32:<br />
                <code className="font-black">devices/&lt;DEVICE_ID&gt;/</code>
              </p>
              <p className="text-xs text-blue-500 mt-2">
                ESP32 menulis ke Realtime Database (bukan Firestore). Field yang dibutuhkan:
                <code> isOnline</code>, <code>foodStock</code>, <code>weight</code>, <code>time</code>, <code>servoStatus</code>.
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Setelah ESP32 terhubung, klaim perangkat di halaman <strong>Pengaturan → Klaim Perangkat</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SMART FEED TOGGLE ── */}
      <div className={cn(
        'rounded-4xl p-7 border flex items-center gap-6 transition-all',
        smartFeedEnabled ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
      )}>
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
          smartFeedEnabled ? 'bg-amber-100' : 'bg-gray-100'
        )}>
          {smartFeedEnabled ? <Zap className="w-7 h-7 text-amber-500" /> : <ZapOff className="w-7 h-7 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('font-black text-2xl', smartFeedEnabled ? 'text-amber-900' : 'text-gray-600')}>
            {smartFeedEnabled ? 'Smart Feed Aktif' : 'Smart Feed Nonaktif — Mode Manual Saja'}
          </p>
          <p className="text-base text-gray-500 mt-1">
            {smartFeedEnabled
              ? 'Jadwal otomatis berjalan. Pemberian manual tetap tersedia.'
              : 'Jadwal otomatis dimatikan. Hanya pemberian manual yang dapat dilakukan.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleSmartFeed}
          aria-label="Toggle smart feed"
          className={cn(
            'w-16 h-8 rounded-full relative transition-all shrink-0',
            smartFeedEnabled ? 'bg-amber-400' : 'bg-gray-300'
          )}
        >
          <div className={cn(
            'w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-sm',
            smartFeedEnabled ? 'left-9' : 'left-1'
          )} />
        </button>
      </div>

      {/* ── MULTI-DEVICE MONITOR ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Cpu className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">Monitoring Perangkat</h3>
            <p className="text-sm text-gray-400">Pilih perangkat untuk pemberian manual</p>
          </div>
        </div>
        <div className="flex gap-4">
          <DeviceMonitorCard
            device={primaryDevice}
            deviceNumber={1}
            isSelected={selectedDeviceId === device1Id}
            onSelect={() => setSelectedDeviceId(device1Id)}
          />
          <DeviceMonitorCard
            device={secondaryDevice}
            deviceNumber={2}
            isSelected={selectedDeviceId === device2Id}
            onSelect={() => setSelectedDeviceId(device2Id)}
          />
        </div>
      </div>

      {/* ── TWO CARDS ── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-8">

        {/* ── MANUAL FEED CARD ── */}
        <div className="card-premium p-5 md:p-8 rounded-4xl relative overflow-hidden flex flex-col gap-5 md:gap-6">
          <div className="absolute top-0 right-0 w-56 h-56 bg-amber-50 rounded-full -mr-28 -mt-28 pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 rounded-3xl flex items-center justify-center shrink-0">
                <Play className="text-amber-500 w-6 h-6 fill-current" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Pemberian Manual</h3>
                <p className="text-base text-gray-400">Kirim porsi sekarang ke perangkat</p>
              </div>
            </div>
          </div>

          {/* Device selector */}
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Kirim ke perangkat</p>
            <div className="flex gap-2">
              {[{ id: device1Id, label: 'Feeder ESP 1', dev: primaryDevice }, { id: device2Id, label: 'Feeder ESP 2', dev: secondaryDevice }].map(({ id, label, dev }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedDeviceId(id)}
                  className={cn(
                    'flex-1 py-2.5 px-4 rounded-2xl border-2 text-sm font-black transition-all flex items-center justify-center gap-2',
                    selectedDeviceId === id
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-amber-200'
                  )}
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    dev?.isOnline ? 'bg-green-400' : 'bg-gray-300'
                  )} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Today progress */}
          {dailyTarget > 0 && (
            <div className="relative z-10 p-4 bg-gray-50 rounded-2xl">
              <div className="flex justify-between text-sm font-semibold text-gray-600 mb-2">
                <span>Sudah diberikan hari ini</span>
                <span className="font-black">{todayTotal}g / {dailyTarget}g</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.7 }}
                  className={cn('h-full rounded-full transition-colors', getProgressBarColor(progressPct))}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Sisa kapasitas:{' '}
                <span className={cn('font-bold', progressPct >= 100 ? 'text-red-500' : progressPct >= 75 ? 'text-amber-500' : 'text-green-600')}>
                  {Math.max(0, dailyTarget - todayTotal)}g
                </span>
              </p>
            </div>
          )}

          {/* At-limit alert */}
          {isAtDailyLimit && (
            <div className="relative z-10 flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-black text-red-700">Batas harian tercapai!</p>
                <p className="text-sm text-red-600 mt-0.5">
                  Kucing sudah mendapat {todayTotal}g dari {dailyTarget}g. Pemberian tambahan berisiko overfeeding.
                </p>
              </div>
            </div>
          )}

          {/* Slider */}
          <div className="relative z-10 flex-1 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-black text-gray-400 uppercase tracking-widest">
                Ukuran Porsi
              </label>
              {dailyTarget > 0 && (
                <span className="text-base text-amber-600 font-bold">
                  Maks: {dailyTarget}g/hari
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 bg-gray-50 px-4 py-4 md:px-7 md:py-6 rounded-3xl overflow-hidden">
              <div className="flex-1 pr-2">
                <input
                  aria-label="Ukuran Porsi"
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={feedingAmount}
                  onChange={(e) => {
                    setFeedingAmount(parseInt(e.target.value, 10));
                    setShowConfirm(false);
                  }}
                  className="w-full accent-amber-500"
                />
              </div>
              <div className="shrink-0 min-w-30 text-right">
                <p className="text-3xl md:text-5xl font-black text-amber-500 leading-none">
                  {feedingAmount}<span className="text-xl md:text-2xl ml-1">g</span>
                </p>
              </div>
            </div>

            {/* Warnings */}
            {!isAtDailyLimit && wouldExceed && (
              <div className="flex items-center gap-3 px-5 py-4 bg-orange-50 border border-orange-100 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
                <p className="text-base text-orange-600 font-medium">
                  {feedingAmount}g akan membuat total menjadi {todayTotal + feedingAmount}g (melebihi {dailyTarget}g).
                </p>
              </div>
            )}
            {!isAtDailyLimit && !wouldExceed && dailyTarget > 0 && feedingAmount > dailyTarget && (
              <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-base text-red-600 font-medium">
                  Porsi melebihi maks harian ({dailyTarget}g).
                </p>
              </div>
            )}
            {/* Smart adjustment preview */}
            {!isAtDailyLimit && !wouldExceed && futureScheduleTotal > 0 &&
              dailyTarget > 0 && (todayTotal + feedingAmount + futureScheduleTotal) > dailyTarget && (
              <div className="flex items-start gap-3 px-5 py-4 bg-yellow-50 border border-yellow-100 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-700 font-semibold">
                    {feedingAmount}g ini + jadwal otomatis hari ini ({futureScheduleTotal}g) = {todayTotal + feedingAmount + futureScheduleTotal}g — akan melebihi target {dailyTarget}g.
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Jadwal otomatis berikutnya akan disesuaikan otomatis setelah pemberian ini.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="relative z-10 space-y-3">
            {showConfirm && !isFeeding && (
              <div className="px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                <p className="text-base font-black text-amber-800">
                  Konfirmasi: kirim {feedingAmount}g ke {selectedDevice?.name ?? `Feeder ESP ${selectedDeviceId === device2Id ? 2 : 1}`}?
                </p>
                {wouldExceed && (
                  <p className="text-xs text-orange-600 font-semibold">
                    ⚠ Porsi ini melebihi sisa kapasitas harian. Lanjutkan?
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleManualFeed}
                    className="flex-1 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-white text-sm font-black transition-colors flex items-center justify-center gap-2"
                  >
                    <Utensils className="w-4 h-4" /> Ya, Kirim
                  </button>
                </div>
              </div>
            )}

            {!showConfirm && (
              <button
                type="button"
                onClick={() => {
                  if (isAtDailyLimit) return;
                  setShowConfirm(true);
                }}
                disabled={isFeeding || isAtDailyLimit}
                className={cn(
                  'w-full py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-3 transition-all',
                  isFeeding
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isAtDailyLimit
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-500 text-white shadow-lg shadow-amber-200'
                )}
              >
                {isFeeding
                  ? <><Loader2 className="w-6 h-6 animate-spin" /> Mengirim...</>
                  : <><Utensils className="w-6 h-6" /> Beri Makan Sekarang</>}
              </button>
            )}

            {feedResult && (
              <div className={cn(
                'flex items-center gap-3 px-5 py-4 rounded-2xl text-base font-semibold',
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
          </div>
        </div>

        {/* ── SCHEDULE CARD ── */}
        <div className="card-premium p-5 md:p-8 rounded-4xl relative flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-3xl flex items-center justify-center shrink-0">
                <Clock className="text-blue-500 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Jadwal Otomatis</h3>
                <p className="text-base text-gray-400">
                  {schedule.filter((s) => s.active !== false).length} slot aktif
                </p>
              </div>
            </div>
          </div>

          {/* Daily target alert */}
          {dailyTarget > 0 && <DailyTargetAlert />}

          {/* Smart adjustment active notice */}
          {liveAdjustedSlots && liveAdjustedSlots.length > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border text-xs bg-indigo-50 border-indigo-100">
              <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
              <div className="text-indigo-700">
                <p className="font-black">
                  {syncAdjustedSlots ? 'Smart Adjustment Aktif' : `Preview: jika memberi ${feedingAmount}g sekarang`}
                </p>
                <p className="mt-0.5">
                  {syncAdjustedSlots
                    ? `Sudah diberikan ${todayTotal}g — setelah tambah ${feedingAmount}g = ${todayTotal + feedingAmount}g dari target ${dailyTarget}g.`
                    : `Total jadi ${todayTotal + feedingAmount}g dari target ${dailyTarget}g.`}
                  {' '}Porsi yang ditulis <span className="line-through">dicoret</span> = porsi asli.
                </p>
              </div>
            </div>
          )}

          {/* Smart feed off banner */}
          {!smartFeedEnabled && (
            <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3">
              <ZapOff className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-500 font-semibold">
                Jadwal otomatis <span className="font-black text-gray-600">dinonaktifkan</span> — slot tidak akan berjalan sampai Smart Feed diaktifkan kembali.
              </p>
            </div>
          )}

          {/* Daily limit reached notice in schedule */}
          {isAtDailyLimit && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <BanIcon className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-600 font-semibold">
                Batas harian tercapai — jadwal otomatis sementara <span className="font-black text-red-700">dinonaktifkan</span> hingga hari berikutnya.
              </p>
            </div>
          )}

          {/* Slot list */}
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            {schedule.map((slot, index) => {
              const adjSlot = liveAdjustedSlots?.find((a) => a.time === slot.time);
              const displayAmount = adjSlot?.adjustedAmount ?? slot.amount;
              const wasAdjusted = adjSlot !== undefined && adjSlot.adjustedAmount !== slot.amount;

              return editingIndex === index ? (
                <div
                  key={`${slot.time}-${index}-edit`}
                  className="px-6 py-5 rounded-3xl border-2 border-blue-200 bg-blue-50 space-y-4"
                >
                  <p className="font-black text-blue-800 text-base">Edit Slot</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">
                        Waktu
                      </label>
                      <input
                        id="edit-time"
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        title="Waktu pemberian makan"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">
                        Porsi (g)
                      </label>
                      <input
                        id="edit-amount"
                        type="number"
                        min={5}
                        max={500}
                        step={5}
                        value={editAmount}
                        onChange={(e) => setEditAmount(parseInt(e.target.value, 10))}
                        title="Porsi dalam gram"
                        placeholder="50"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </div>
                  {editError && <p className="text-xs text-red-600 font-semibold">{editError}</p>}
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={savingSchedule}
                      className="px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={`${slot.time}-${index}`}
                  className={cn(
                    'group flex items-center justify-between px-6 py-5 rounded-3xl border transition-all',
                    !smartFeedEnabled || isAtDailyLimit
                      ? 'bg-gray-50 border-gray-200 opacity-50 grayscale'
                      : slot.active !== false
                      ? 'bg-white border-gray-100 hover:border-amber-200'
                      : 'bg-gray-50 border-gray-100 opacity-60'
                  )}
                >
                  <div className="flex items-center gap-5">
                    <span className="text-3xl">{getSlotIcon(slot.time)}</span>
                    <div>
                      <p className="font-black text-gray-900 text-xl">{slot.time}</p>
                      <p className="text-sm text-gray-400">{slot.label ?? getSlotLabel(slot.time)}</p>
                    </div>
                    <div className="w-px h-10 bg-gray-100" />
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className={cn('font-black text-xl', wasAdjusted ? 'text-indigo-500' : 'text-amber-500')}>
                          {displayAmount}g
                        </p>
                        {wasAdjusted && (
                          <p className="text-sm text-gray-400 line-through">{adjSlot?.originalAmount}g</p>
                        )}
                      </div>
                      {wasAdjusted ? (
                        <p className="text-xs text-indigo-500 font-bold">disesuaikan</p>
                      ) : (
                        <p className="text-sm text-gray-400">porsi</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={slot.active !== false ? 'Nonaktifkan slot' : 'Aktifkan slot'}
                      onClick={() => handleToggleSlot(index)}
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all',
                        slot.active !== false
                          ? 'bg-green-50 border-green-400 text-green-600 hover:bg-green-100'
                          : 'bg-white border-gray-200 text-gray-300 hover:border-green-300'
                      )}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Edit slot"
                      onClick={() => startEdit(index)}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border border-gray-100 text-gray-300 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-100 pt-4">
            <div className={cn(
              'p-5 border rounded-3xl flex items-center gap-4 transition-colors',
              smartFeedEnabled ? 'bg-amber-50 border-amber-100' : 'bg-gray-100 border-gray-200'
            )}>
              <div className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0',
                smartFeedEnabled ? 'bg-white' : 'bg-gray-200'
              )}>
                <Settings2 className={cn('w-5 h-5', smartFeedEnabled ? 'text-amber-500' : 'text-gray-400')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-lg font-black', smartFeedEnabled ? 'text-gray-700' : 'text-gray-400')}>
                  {smartFeedEnabled ? 'Smart Adjustment' : 'Kontrol Otomatis Off'}
                </p>
                <p className="text-sm text-gray-400">
                  {smartFeedEnabled
                    ? 'Porsi dihitung otomatis berdasarkan BCS kucing.'
                    : 'Jadwal otomatis dinonaktifkan. Hanya pemberian manual.'}
                </p>
              </div>
              <button
                aria-label="Klik untuk mengaktifkan jadwal"
                type="button"
                onClick={handleToggleSmartFeed}
                className={cn(
                  'w-16 h-8 rounded-full relative cursor-pointer transition-all shrink-0',
                  smartFeedEnabled ? 'bg-amber-400' : 'bg-gray-300'
                )}
              >
                <div className={cn(
                  'w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-sm',
                  smartFeedEnabled ? 'left-9' : 'left-1'
                )} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── USAGE HISTORY ── */}
      <div className="card-premium rounded-4xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-4 md:px-8 md:py-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-black text-gray-900">Riwayat Penggunaan Kucing</h3>
              <p className="text-sm text-gray-400">
                {usageDays.length > 0
                  ? `${usageDays.length} hari terakhir — total ${usageDays.reduce((s, [, d]) => s + d.count, 0)} kali pemberian`
                  : 'Belum ada riwayat'}
              </p>
            </div>
          </div>
          {showHistory
            ? <ChevronUp className="w-5 h-5 text-gray-400" />
            : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showHistory && (
          <div className="px-4 pb-4 md:px-8 md:pb-6 border-t border-gray-100">
            {usageDays.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Belum ada riwayat pemberian makan.</p>
              </div>
            ) : (
              <>
                {/* Header row */}
                <div className="flex items-center gap-4 py-2 text-xs font-black uppercase tracking-widest text-gray-400">
                  <span className="w-24 shrink-0">Tanggal</span>
                  <span className="flex-1">Konsumsi & Detail</span>
                  <span className="shrink-0">Waktu</span>
                </div>
                {usageDays.map(([dateKey, data]) => (
                  <UsageDayRow
                    key={dateKey}
                    dateKey={dateKey}
                    data={data}
                    dailyTarget={dailyTarget}
                  />
                ))}
              </>
            )}

            {/* Summary */}
            {usageDays.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
                {[
                  {
                    label: 'Rata-rata/hari',
                    value: `${Math.round(usageDays.reduce((s, [, d]) => s + d.total, 0) / usageDays.length)}g`,
                  },
                  {
                    label: 'Total manual',
                    value: `${usageDays.reduce((s, [, d]) => s + d.manual, 0)}x`,
                  },
                  {
                    label: 'Total otomatis',
                    value: `${usageDays.reduce((s, [, d]) => s + d.auto, 0)}x`,
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-xl font-black text-gray-800">{value}</p>
                    <p className="text-xs text-gray-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
