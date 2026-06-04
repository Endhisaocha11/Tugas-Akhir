import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Utensils, Clock, AlertTriangle, Play, Settings2,
  Check, Zap, ZapOff, Loader2, CheckCircle2, XCircle,
  Pencil, Info, WifiOff, Copy, ChevronDown, ChevronUp,
  History, BanIcon, Database,
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, set, onValue } from 'firebase/database';
import { db, rtdb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { useCatData } from '../../lib/useCatData';
import { cn } from '../../lib/utils';
import type { FeedingScheduleSlot } from '../../types';

// ── Color Utilities ───────────────────────────────────────────────────────────

function getFoodStockTheme(pct: number) {
  if (pct > 50) return { bar: 'bg-green-400', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: '🟢', label: 'Stok cukup' };
  if (pct > 20) return { bar: 'bg-yellow-400', text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: '🟡', label: 'Mulai berkurang' };
  return { bar: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: '🔴', label: 'Hampir habis' };
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
  const [feedingAmount, setFeedingAmount] = useState(1);
  const [portionInputStr, setPortionInputStr] = useState('1');
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedResult, setFeedResult] = useState<'success' | 'timeout' | 'error' | null>(null);
  const [feedPhase, setFeedPhase] = useState<'sending' | 'waiting'>('sending');
  const [lastFedAmount, setLastFedAmount] = useState(0);
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

  // Manual-only total today — used as basis for auto-slot adjustment
  const todayManualTotal = Math.round(
    feedingLogs
      .filter((l) => l.timestamp >= profileUpdatedTodayMs && l.notes === 'manual')
      .reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0)
  );

  // Use Firestore flag as the authoritative "at limit" state — cleared on profile change
  const isAtDailyLimit = cat?.dailyLimitReachedDate === todayStr;
  // Separate live calc used only to trigger writing the flag to Firestore
  const isActuallyOverLimit = dailyTarget > 0 && todayTotal >= dailyTarget;
  const wouldExceed = dailyTarget > 0 && (todayTotal + feedingAmount) > dailyTarget;
  const progressPct = dailyTarget > 0 ? Math.min(Math.round((todayTotal / dailyTarget) * 100), 100) : 0;

  // Sync to RTDB (ESP32 reads this) — future slots only, uses full todayTotal
  const syncAdjustedSlots = useMemo(() => {
    if (!dailyTarget) return null;
    const allActiveSlots = schedule.filter((s) => s.active !== false);
    const futureSlots = allActiveSlots.filter((s) => s.time > currentTimeStr);
    if (futureSlots.length === 0) return null;

    // Remaining = daily target minus everything given today (manual + auto already fired)
    const remaining = Math.max(0, dailyTarget - todayTotal);
    const futureTotal = futureSlots.reduce((sum, s) => sum + s.amount, 0);
    if (remaining >= futureTotal) return null;

    const factor = futureTotal > 0 ? remaining / futureTotal : 0;
    return futureSlots.map((s) => ({
      time: s.time,
      originalAmount: s.amount,
      adjustedAmount: Math.max(0, Math.round(s.amount * factor)),
    }));
  }, [dailyTarget, todayTotal, schedule, currentTimeStr]);

  // Display adjustment — ALL active slots, based on manual-only total + pending slider
  const liveAdjustedSlots = useMemo(() => {
    if (!dailyTarget) return null;
    const allActiveSlots = schedule.filter((s) => s.active !== false);
    const allActiveTotal = allActiveSlots.reduce((sum, s) => sum + s.amount, 0);
    if (allActiveTotal <= 0) return null;

    // Remaining for auto = daily target − manual given today − pending slider
    const remainingForAuto = Math.max(0, dailyTarget - todayManualTotal - feedingAmount);
    if (remainingForAuto >= allActiveTotal) return null;

    const factor = remainingForAuto / allActiveTotal;
    return allActiveSlots.map((s) => ({
      time: s.time,
      originalAmount: s.amount,
      adjustedAmount: Math.max(0, Math.round(s.amount * factor)),
    }));
  }, [dailyTarget, todayManualTotal, feedingAmount, schedule]);

  const futureScheduleTotal = syncAdjustedSlots
    ? syncAdjustedSlots.reduce((sum, s) => sum + s.adjustedAmount, 0)
    : schedule.filter((s) => s.active !== false && s.time > currentTimeStr).reduce((sum, s) => sum + s.amount, 0);

  // Selected device object
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? devices[0] ?? null;

  // Usage history grouped by day — hanya log setelah profil terakhir diubah
  const profileUpdatedAt = cat?.profileUpdatedAt ?? 0;
  const usageDays = useMemo(() => {
    const map = new Map<string, UsageDayData>();
    feedingLogs.filter((log) => log.timestamp >= profileUpdatedAt).forEach((log) => {
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
  }, [feedingLogs, profileUpdatedAt]);

  // ── Write daily limit flag to Firestore when limit is hit ─────────────────
  // Guard: skip if profile was reset today (dailyLimitResetDate === today)
  useEffect(() => {
    if (!isActuallyOverLimit || !cat || isAtDailyLimit) return;
    if (cat.dailyLimitResetDate === todayStr) return;
    updateDoc(doc(db, 'cats', cat.id), {
      dailyLimitReachedDate: todayStr,
    }).catch(console.error);
  }, [isActuallyOverLimit, isAtDailyLimit, cat, todayStr]);

  // ── Sync jadwal efektif ke RTDB agar ESP32 bisa baca untuk auto-feed ────
  useEffect(() => {
    if (!rtdb || devices.length === 0 || schedule.length === 0) return;
    const effectiveSlots = schedule.map((s) => {
      const adj = syncAdjustedSlots?.find((a) => a.time === s.time);
      return {
        time: s.time,
        amount: adj !== undefined ? adj.adjustedAmount : s.amount,
        active: s.active !== false,
      };
    });
    const data = {
      enabled: smartFeedEnabled,
      dailyLimitReached: isAtDailyLimit,
      slots: effectiveSlots,
    };
    devices.forEach((device) => {
      set(ref(rtdb, `devices/${device.id}/schedule`), data).catch(console.error);
    });
  }, [schedule, syncAdjustedSlots, smartFeedEnabled, isAtDailyLimit, devices]);

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
    setFeedPhase('sending');

    let wasConfirmed = false;

    try {
      const initialWeight = selectedDevice?.currentWeightOnScale ?? 0;

      // 1. Kirim command ke RTDB agar ESP32 buka servo
      if (rtdb) {
        await set(ref(rtdb, `devices/${deviceId}/command`), {
          type: 'feed',
          amount: feedingAmount,
          status: 'pending',
          requestedAt: Date.now(),
        });
      }

      setFeedPhase('waiting');

      // 2. Tunggu berat mangkuk bertambah sebagai konfirmasi ESP32 dispensing
      const TIMEOUT_MS = 30_000;
      const THRESHOLD = Math.max(5, feedingAmount * 0.4);

      wasConfirmed = rtdb
        ? await new Promise<boolean>((resolve) => {
            let unsubscribe: (() => void) | null = null;
            const timer = setTimeout(() => {
              unsubscribe?.();
              resolve(false);
            }, TIMEOUT_MS);

            const weightRef = ref(rtdb, `devices/${deviceId}/weight`);
            unsubscribe = onValue(weightRef, (snapshot) => {
              const current = (snapshot.val() as number) ?? 0;
              if (current >= initialWeight + THRESHOLD) {
                clearTimeout(timer);
                unsubscribe?.();
                resolve(true);
              }
            });
          })
        : false;

      // 3. Catat log ke Firestore (untuk riwayat & analitik)
      const logId = `${targetOwnerId}_${Date.now()}`;
      await setDoc(doc(db, 'feedingLogs', logId), {
        id: logId,
        catId: cat?.id ?? '',
        deviceId,
        timestamp: Date.now(),
        amountRequested: feedingAmount,
        amountDispensed: feedingAmount,
        status: wasConfirmed ? 'success' : 'sent',
        notes: 'manual',
      });

      // 4. Tandai daily limit jika tercapai
      if (dailyTarget > 0 && (todayTotal + feedingAmount) >= dailyTarget) {
        await updateDoc(catDocRef(), { dailyLimitReachedDate: todayStr });
      }

      setLastFedAmount(feedingAmount);
      setFeedResult(wasConfirmed ? 'success' : 'timeout');
      setShowConfirm(false);
    } catch {
      setFeedResult('error');
    } finally {
      setIsFeeding(false);
      setTimeout(() => setFeedResult(null), wasConfirmed ? 5000 : 8000);
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
    const scheduleExceeded = scheduleTotal > dailyTarget;
    const isAnyExceeded = scheduleExceeded;

    // Sisa otomatis = target - manual hari ini
    const autoRemainingWithPending = Math.max(0, dailyTarget - todayManualTotal - feedingAmount);
    const showAdjustInfo = todayManualTotal > 0 || feedingAmount > 0;

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
              ? <span className="font-bold"> — Melebihi target {Math.abs(dailyTarget - scheduleTotal)}g! Kurangi porsi.</span>
              : <span> — Sisa kapasitas: <strong>{dailyTarget - scheduleTotal}g</strong></span>}
          </p>
          {!scheduleExceeded && showAdjustInfo && (
            <p className="mt-1 pt-1 border-t border-current/20">
              Manual hari ini: <strong>{todayManualTotal}g</strong>
              {feedingAmount > 0 && <> + kirim: <strong>{feedingAmount}g</strong></>}
              {' '}→ Sisa otomatis: <strong>{autoRemainingWithPending}g</strong>
              {autoRemainingWithPending < scheduleTotal && (
                <span className="font-bold"> (jadwal dikurangi proporsional)</span>
              )}
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

          {/* Food stock indicator */}
          {selectedDevice && (() => {
            const stockPct = selectedDevice.foodStockLevel ?? 0;
            const theme = getFoodStockTheme(stockPct);
            return (
              <div className={cn('relative z-10 flex items-center gap-3 px-4 py-3 rounded-2xl border', theme.bg, theme.border)}>
                <Database className={cn('w-4 h-4 shrink-0', theme.text)} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className={cn('text-xs font-bold', theme.text)}>Stok pakan {selectedDevice.name ?? 'feeder'}</span>
                    <span className={cn('text-sm font-black', theme.text)}>{stockPct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(stockPct, 100)}%` }}
                      transition={{ duration: 0.7 }}
                      className={cn('h-full rounded-full', theme.bar)}
                    />
                  </div>
                </div>
                <span className="text-base shrink-0">{theme.dot}</span>
              </div>
            );
          })()}

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
                  min="1"
                  max="200"
                  step="1"
                  value={feedingAmount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setFeedingAmount(val);
                    setPortionInputStr(String(val));
                    setShowConfirm(false);
                  }}
                  className="w-full accent-amber-500"
                />
              </div>
              <div className="shrink-0 text-right flex items-baseline justify-end gap-0.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="Jumlah gram porsi"
                  value={portionInputStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setPortionInputStr(raw);
                    setShowConfirm(false);
                    if (raw === '' || raw === '0') return;
                    const val = parseInt(raw, 10);
                    if (!isNaN(val) && val <= 200) setFeedingAmount(val);
                  }}
                  onBlur={() => {
                    const val = parseInt(portionInputStr, 10);
                    const clamped = isNaN(val) || val < 1 ? 1 : Math.min(200, val);
                    setFeedingAmount(clamped);
                    setPortionInputStr(String(clamped));
                  }}
                  className="w-20 md:w-28 text-3xl md:text-5xl font-black text-amber-500 leading-none text-right bg-transparent border-b-2 border-amber-200 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-xl md:text-2xl font-black text-amber-500 ml-1">g</span>
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

            {/* ── LOADING STATE ── */}
            {isFeeding && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'flex flex-col items-center justify-center gap-3 px-5 py-7 border-2 rounded-3xl',
                  feedPhase === 'waiting'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-amber-50 border-amber-200'
                )}
              >
                <div className="relative">
                  <div className={cn(
                    'w-14 h-14 rounded-full border-4 animate-spin',
                    feedPhase === 'waiting'
                      ? 'border-blue-200 border-t-blue-500'
                      : 'border-amber-200 border-t-amber-500'
                  )} />
                  <Utensils className={cn(
                    'absolute inset-0 m-auto w-5 h-5',
                    feedPhase === 'waiting' ? 'text-blue-400' : 'text-amber-400'
                  )} />
                </div>
                <div className="text-center">
                  {feedPhase === 'waiting' ? (
                    <>
                      <p className="font-black text-blue-800 text-base">Menunggu pakan tertuang...</p>
                      <p className="text-sm text-blue-500 mt-0.5">Memverifikasi berat mangkuk (maks 30 detik)</p>
                    </>
                  ) : (
                    <>
                      <p className="font-black text-amber-800 text-base">Mengirim {feedingAmount}g...</p>
                      <p className="text-sm text-amber-500 mt-0.5">Tunggu, perintah sedang dikirim ke perangkat</p>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── CONFIRM DIALOG ── */}
            {showConfirm && !isFeeding && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3"
              >
                <p className="text-base font-black text-amber-800">
                  Konfirmasi: kirim {feedingAmount}g ke {selectedDevice?.name ?? `Feeder ESP ${selectedDeviceId === device2Id ? 2 : 1}`}?
                </p>
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
                    disabled={isFeeding}
                    className="flex-1 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-white text-sm font-black transition-colors flex items-center justify-center gap-2"
                  >
                    <Utensils className="w-4 h-4" /> Ya, Kirim
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── MAIN BUTTON ── */}
            {!showConfirm && !isFeeding && (
              <button
                type="button"
                onClick={() => {
                  if (isAtDailyLimit || wouldExceed || feedingAmount < 1) return;
                  setShowConfirm(true);
                }}
                disabled={isAtDailyLimit || wouldExceed || feedingAmount < 1}
                className={cn(
                  'w-full py-5 rounded-3xl font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all',
                  isAtDailyLimit
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : wouldExceed
                    ? 'bg-red-100 text-red-400 cursor-not-allowed border-2 border-red-200'
                    : feedingAmount < 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-500 active:scale-95 text-white shadow-lg shadow-amber-200'
                )}
              >
                {isAtDailyLimit ? (
                  <><BanIcon className="w-6 h-6 shrink-0" /> Batas harian tercapai</>
                ) : wouldExceed ? (
                  <><AlertTriangle className="w-6 h-6 shrink-0" /> Kurangi porsi agar tidak berlebih</>
                ) : (
                  <><Utensils className="w-6 h-6 shrink-0" /> Beri Makan Sekarang</>
                )}
              </button>
            )}

            {/* ── RESULT NOTIFICATION ── */}
            {feedResult && !isFeeding && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex items-start gap-3 px-5 py-4 rounded-2xl text-base font-semibold border-2',
                  feedResult === 'success'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : feedResult === 'timeout'
                    ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                )}
              >
                {feedResult === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5 text-green-500" />
                ) : feedResult === 'timeout' ? (
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-yellow-500" />
                ) : (
                  <XCircle className="w-6 h-6 shrink-0 mt-0.5 text-red-400" />
                )}
                <div>
                  {feedResult === 'success' ? (
                    <>
                      <p className="font-black text-green-800">✅ Pakan berhasil diterima!</p>
                      <p className="text-sm font-medium mt-1 text-green-600">
                        <span className="font-black text-green-700">{lastFedAmount}g</span> terdeteksi masuk ke mangkuk{' '}
                        <span className="font-black">{selectedDevice?.name ?? `Feeder ESP ${selectedDeviceId === devices[1]?.id ? 2 : 1}`}</span>.
                      </p>
                    </>
                  ) : feedResult === 'timeout' ? (
                    <>
                      <p className="font-black text-yellow-800">⏳ Perintah terkirim, menunggu konfirmasi</p>
                      <p className="text-sm font-medium mt-1 text-yellow-600">
                        Perintah {lastFedAmount}g sudah dikirim ke perangkat, namun berat mangkuk belum terdeteksi bertambah.
                        Periksa perangkat atau coba lagi.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-black">Gagal mengirim pakan</p>
                      <p className="text-sm font-medium mt-0.5">Periksa koneksi perangkat dan coba lagi.</p>
                    </>
                  )}
                </div>
              </motion.div>
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
                    <div className="w-full">
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
                  </div>
                  <p className="text-xs text-gray-400">Porsi: <span className="font-bold text-gray-600">{schedule[editingIndex ?? 0]?.amount ?? editAmount}g</span> (tidak dapat diubah dari sini)</p>
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
