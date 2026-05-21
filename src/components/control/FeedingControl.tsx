import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Utensils, Clock, AlertTriangle, Play, Settings2,
  Plus, Trash2, Check, Zap, ZapOff, Loader2, CheckCircle2, XCircle,
  Pencil, Info,
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { useCatData } from '../../lib/useCatData';
import { cn } from '../../lib/utils';
import type { FeedingScheduleSlot } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export function FeedingControl() {
  const { user } = useAuth();
  const { cat, feedingLogs, targetOwnerId, loading } = useCatData();

  // Schedule
  const [schedule, setSchedule] = useState<FeedingScheduleSlot[]>([]);
  const [smartFeedEnabled, setSmartFeedEnabled] = useState(true);
  // Tracks slot times that came from DB — these can be edited but NOT deleted
  const dbSlotTimesRef = useRef<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  // Manual feed
  const [feedingAmount, setFeedingAmount] = useState(50);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedResult, setFeedResult] = useState<'success' | 'error' | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTime, setNewTime] = useState('08:00');
  const [newAmount, setNewAmount] = useState(50);
  const [addError, setAddError] = useState('');

  // Edit mode
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editError, setEditError] = useState('');

  const [savingSchedule, setSavingSchedule] = useState(false);

  // ── Sync from Firestore ──────────────────────────────────────────────────
  useEffect(() => {
    if (!cat) return;
    const slots = (cat.feedingSchedule ?? []).map((s) => ({ ...s, active: s.active !== false }));
    if (!hasInitialized.current) {
      dbSlotTimesRef.current = new Set(slots.map((s) => s.time));
      hasInitialized.current = true;
    }
    setSchedule(slots);
    setSmartFeedEnabled((cat as any).smartFeedEnabled !== false);
  }, [cat]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const dailyTarget = cat?.dailyGramTarget ?? 0;
  const scheduleTotal = schedule.reduce((sum, s) => sum + s.amount, 0);
  const isDbSlot = (slot: FeedingScheduleSlot) => dbSlotTimesRef.current.has(slot.time);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayTotal = Math.round(
    feedingLogs
      .filter((l) => l.timestamp >= todayStart.getTime())
      .reduce((sum, l) => sum + (l.amountDispensed ?? 0), 0)
  );
  const isAtDailyLimit = dailyTarget > 0 && todayTotal >= dailyTarget;
  const wouldExceed = dailyTarget > 0 && (todayTotal + feedingAmount) > dailyTarget;
  const progressPct = dailyTarget > 0 ? Math.min(Math.round((todayTotal / dailyTarget) * 100), 100) : 0;

  // ── Firestore helpers ────────────────────────────────────────────────────
  const catDocRef = () => doc(db, 'cats', `${targetOwnerId}_main`);

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

  // ── Delete (new slots only) ───────────────────────────────────────────────
  const handleDeleteSlot = async (index: number) => {
    const updated = schedule.filter((_, i) => i !== index);
    setSchedule(updated);
    await persistSchedule(updated);
  };

  // ── Start edit ────────────────────────────────────────────────────────────
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditTime(schedule[index].time);
    setEditAmount(schedule[index].amount);
    setEditError('');
    setShowAddForm(false);
  };

  // ── Save edit ─────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (editingIndex === null) return;
    setEditError('');
    const originalTime = schedule[editingIndex].time;

    if (editTime !== originalTime && schedule.some((s, i) => i !== editingIndex && s.time === editTime)) {
      setEditError('Waktu ini sudah digunakan slot lain.');
      return;
    }

    // Keep db-slot tracking even if time changed
    if (dbSlotTimesRef.current.has(originalTime) && editTime !== originalTime) {
      dbSlotTimesRef.current.delete(originalTime);
      dbSlotTimesRef.current.add(editTime);
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

  // ── Add slot ──────────────────────────────────────────────────────────────
  const handleAddSlot = async () => {
    setAddError('');
    if (schedule.some((s) => s.time === newTime)) {
      setAddError('Slot dengan waktu ini sudah ada.');
      return;
    }
    const newSlot: FeedingScheduleSlot = {
      time: newTime,
      amount: newAmount,
      label: getSlotLabel(newTime),
      active: true,
    };
    const sorted = [...schedule, newSlot].sort((a, b) => a.time.localeCompare(b.time));
    setSchedule(sorted);
    setShowAddForm(false);
    setNewTime('08:00');
    setNewAmount(50);
    await persistSchedule(sorted);
  };

  // ── Manual Feed ───────────────────────────────────────────────────────────
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
      setShowConfirm(false);
    } catch {
      setFeedResult('error');
    } finally {
      setIsFeeding(false);
      setTimeout(() => setFeedResult(null), 4000);
    }
  };

  // ── Daily target info banner ──────────────────────────────────────────────
  const DailyTargetAlert = () => {
    if (!dailyTarget) return null;
    const remaining = dailyTarget - scheduleTotal;
    const exceeded = remaining < 0;
    return (
      <div className={cn(
        'flex items-start gap-2.5 p-3 rounded-xl border text-xs',
        exceeded ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
      )}>
        <Info className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', exceeded ? 'text-red-400' : 'text-blue-400')} />
        <div className={exceeded ? 'text-red-700' : 'text-blue-700'}>
          <p className="font-black">
            Maks pakan harian: <span className="text-base">{dailyTarget}g</span>
          </p>
          <p className="mt-0.5">
            Total jadwal: {scheduleTotal}g
            {exceeded
              ? <span className="font-bold"> — Melebihi target {Math.abs(remaining)}g! Kurangi porsi.</span>
              : <span> — Sisa kapasitas: <strong>{remaining}g</strong></span>}
          </p>
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

  return (
  <div className="flex-1 flex flex-col gap-8 w-full px-8 py-6">

    {/* ── HEADER ── */}
    <div>
      <h2 className="text-5xl font-black text-gray-900">
        Feeding Control
      </h2>

      <p className="text-gray-400 mt-2 text-lg">
        Kontrol pemberian makan langsung ke Smart Cat Feeder.
      </p>
    </div>

    {/* ── SMART FEED TOGGLE ── */}
    <div
      className={cn(
        'rounded-[32px] p-7 border flex items-center gap-6 transition-all',
        smartFeedEnabled
          ? 'bg-amber-50 border-amber-200'
          : 'bg-gray-50 border-gray-200'
      )}
    >
      <div
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
          smartFeedEnabled ? 'bg-amber-100' : 'bg-gray-100'
        )}
      >
        {smartFeedEnabled ? (
          <Zap className="w-7 h-7 text-amber-500" />
        ) : (
          <ZapOff className="w-7 h-7 text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-black text-2xl',
            smartFeedEnabled
              ? 'text-amber-900'
              : 'text-gray-600'
          )}
        >
          {smartFeedEnabled
            ? 'Smart Feed Aktif'
            : 'Smart Feed Nonaktif — Mode Manual Saja'}
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
        <div
          className={cn(
            'w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-sm',
            smartFeedEnabled ? 'left-9' : 'left-1'
          )}
        />
      </button>
    </div>

    {/* ── TWO CARDS ── */}
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-[780px]">

      {/* ── MANUAL FEED CARD ── */}
      <div className="card-premium p-8 rounded-[32px] relative overflow-hidden flex flex-col gap-6">

        <div className="absolute top-0 right-0 w-56 h-56 bg-amber-50 rounded-full -mr-28 -mt-28 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 rounded-3xl flex items-center justify-center shrink-0">
            <Play className="text-amber-500 w-6 h-6 fill-current" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">Pemberian Manual</h3>
            <p className="text-base text-gray-400">Kirim porsi sekarang ke perangkat</p>
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
                className={`h-full rounded-full ${progressPct >= 100 ? 'bg-red-400' : 'bg-amber-400'}`}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Sisa kapasitas: <span className="font-bold text-gray-600">{Math.max(0, dailyTarget - todayTotal)}g</span>
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

          <div className="flex items-center gap-8 bg-gray-50 px-7 py-6 rounded-3xl overflow-hidden">
            <div className="flex-1 pr-4">
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
            <div className="shrink-0 min-w-[120px] text-right">
              <p className="text-5xl font-black text-amber-500 leading-none">
                {feedingAmount}<span className="text-2xl ml-1">g</span>
              </p>
            </div>
          </div>

          {/* Exceed warning */}
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
        </div>

        {/* CTA */}
        <div className="relative z-10 space-y-3">

          {/* Confirm step */}
          {showConfirm && !isFeeding && (
            <div className="px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
              <p className="text-base font-black text-amber-800">
                Konfirmasi: kirim {feedingAmount}g ke perangkat?
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
              {isFeeding ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Mengirim...</>
              ) : (
                <><Utensils className="w-6 h-6" /> Beri Makan Sekarang</>
              )}
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
      <div className="card-premium p-8 rounded-[32px] relative flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 rounded-3xl flex items-center justify-center shrink-0">
              <Clock className="text-blue-500 w-6 h-6" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-gray-900">
                Jadwal Otomatis
              </h3>

              <p className="text-base text-gray-400">
                {
                  schedule.filter(
                    (s) => s.active !== false
                  ).length
                }{' '}
                slot aktif
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setAddError('');
              setEditingIndex(null);
            }}
            disabled={showAddForm}
            className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-2xl text-base font-bold hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            <Plus className="w-5 h-5" />
            Tambah
          </button>
        </div>

        {/* Daily target alert */}
        {dailyTarget > 0 && <DailyTargetAlert />}

        {/* Slot list */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">

          {schedule.map((slot, index) =>
            editingIndex === index ? (
              /* ── Inline edit form ── */
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

                {editError && (
                  <p className="text-xs text-red-600 font-semibold">{editError}</p>
                )}

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
              /* ── Normal slot row ── */
              <div
                key={`${slot.time}-${index}`}
                className={cn(
                  'group flex items-center justify-between px-6 py-5 rounded-3xl border transition-all',
                  slot.active !== false
                    ? 'bg-white border-gray-100 hover:border-amber-200'
                    : 'bg-gray-50 border-gray-100 opacity-60'
                )}
              >
                <div className="flex items-center gap-5">

                  <span className="text-3xl">
                    {getSlotIcon(slot.time)}
                  </span>

                  <div>
                    <p className="font-black text-gray-900 text-xl">
                      {slot.time}
                    </p>

                    <p className="text-sm text-gray-400">
                      {slot.label ?? getSlotLabel(slot.time)}
                    </p>
                  </div>

                  <div className="w-px h-10 bg-gray-100" />

                  <div>
                    <p className="font-black text-amber-500 text-xl">
                      {slot.amount}g
                    </p>

                    <p className="text-sm text-gray-400">
                      porsi
                    </p>
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

                  {!isDbSlot(slot) && (
                    <button
                      type="button"
                      aria-label="Hapus slot"
                      onClick={() => handleDeleteSlot(index)}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border border-gray-100 text-gray-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {/* ── Add slot form ── */}
          {showAddForm && (
            <div className="px-6 py-5 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50 space-y-4">
              <p className="font-black text-amber-800 text-base">Tambah Slot Baru</p>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">
                    Waktu
                  </label>
                  <input
                    aria-label='Masukkan Waktu'
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">
                    Porsi (g)
                  </label>
                    <input
                    aria-label='Masukkan Porsi'
                    type="number"
                    min={5}
                    max={500}
                    step={5}
                    value={newAmount}
                    onChange={(e) => setNewAmount(parseInt(e.target.value, 10))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>

              {addError && (
                <p className="text-xs text-red-600 font-semibold">{addError}</p>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setAddError(''); }}
                  className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  disabled={savingSchedule}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {savingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 pt-4">

          <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl flex items-center gap-4">

            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              <Settings2 className="w-5 h-5 text-amber-500" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-lg font-black text-gray-700">
                Smart Adjustment
              </p>

              <p className="text-sm text-gray-400">
                Porsi dihitung otomatis berdasarkan BCS kucing.
              </p>
            </div>

              <button
                aria-label='Klik untuk mengaktifkan jadwal'
              type="button"
              onClick={handleToggleSmartFeed}
              className={cn(
                'w-16 h-8 rounded-full relative cursor-pointer transition-all shrink-0',
                smartFeedEnabled
                  ? 'bg-amber-400'
                  : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-sm',
                  smartFeedEnabled
                    ? 'left-9'
                    : 'left-1'
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
