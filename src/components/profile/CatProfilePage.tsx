import { useMemo, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scale, Heart, Activity, ShieldCheck, Calculator, Utensils,
  ChevronRight, AlertTriangle, CheckCircle2, ChevronDown, Camera, Loader2, Search,
  RotateCcw, X,
} from 'lucide-react';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useCatData } from '../../lib/useCatData';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import { CatProfileSnapshot, FeedingLog, UserRole } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBodyLabel(bc: number): string {
  if (bc <= 2) return 'Sangat Kurus';
  if (bc <= 4) return 'Kurus';
  if (bc <= 5) return 'Normal';
  if (bc <= 7) return 'Overweight';
  return 'Obesitas';
}

function getBcsColor(bc: number): string {
  if (bc <= 2) return 'text-red-500 bg-red-50';
  if (bc <= 4) return 'text-orange-500 bg-orange-50';
  if (bc <= 5) return 'text-green-500 bg-green-50';
  if (bc <= 7) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

function getAgeLabel(age: number): string {
  if (age < 1) return 'Kitten';
  if (age <= 7) return 'Adult';
  return 'Senior';
}

const ACTIVITY_LABEL: Record<string, string> = {
  low: 'Kurang Aktif',
  normal: 'Normal',
  high: 'Sangat Aktif',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function calcDaysActive(savedAt: number, endedAt?: number): number {
  return Math.max(1, Math.ceil(((endedAt ?? Date.now()) - savedAt) / DAY_MS));
}

function fmtDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Profile identity key — dipakai untuk grouping ────────────────────────────

function profileIdentityKey(snap: CatProfileSnapshot): string {
  const sched = (snap.feedingSchedule ?? [])
    .map((s) => `${s.time}:${s.amount}:${s.active ?? true}`)
    .sort().join('|');
  return `${snap.name}__${snap.weight}__${snap.dailyGramTarget}__${snap.bodyCondition}__${snap.activity ?? 'normal'}__${sched}`;
}

// ── Grouped profile ───────────────────────────────────────────────────────────

export interface ActivePeriod {
  savedAt: number;
  endedAt?: number; // undefined = masih aktif
}

export interface ProfileGroup {
  key: string;
  representative: CatProfileSnapshot; // data profil untuk ditampilkan
  periods: ActivePeriod[];            // semua rentang aktif, sorted asc
  isCurrent: boolean;
  originalIndex: number;              // index terbaru dari snapshot group ini
  restoreSnapshot: CatProfileSnapshot; // snapshot terbaru untuk di-restore
}

// ── Profile stats calculator — mendukung banyak periode ──────────────────────

interface ProfileStats {
  totalGrams: number;
  avgPerDay: number;
  manualCount: number;
  autoCount: number;
  days: number;
  dayBreakdown: Array<{ dateKey: string; grams: number }>;
}

function calcStats(periods: ActivePeriod[], feedingLogs: FeedingLog[]): ProfileStats {
  const logs = feedingLogs.filter((l) =>
    periods.some((p) => l.timestamp >= p.savedAt && l.timestamp < (p.endedAt ?? Infinity))
  );

  const totalGrams  = Math.round(logs.reduce((s, l) => s + (l.amountDispensed ?? 0), 0));
  const days        = periods.reduce((sum, p) => sum + calcDaysActive(p.savedAt, p.endedAt), 0);
  const avgPerDay   = days > 0 ? Math.round(totalGrams / days) : 0;
  const manualCount = logs.filter((l) => l.notes === 'manual').length;
  const autoCount   = logs.filter((l) => l.notes !== 'manual').length;

  const dayMap = new Map<string, number>();
  logs.forEach((l) => {
    const d = new Date(l.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayMap.set(key, (dayMap.get(key) ?? 0) + (l.amountDispensed ?? 0));
  });
  const dayBreakdown = Array.from(dayMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14)
    .map(([dateKey, grams]) => ({ dateKey, grams: Math.round(grams) }));

  return { totalGrams, avgPerDay, manualCount, autoCount, days, dayBreakdown };
}

// ── ProfileHistoryCard ────────────────────────────────────────────────────────

function ProfileHistoryCard({
  group,
  feedingLogs,
  isAdmin,
  onRestore,
}: {
  group: ProfileGroup;
  feedingLogs: FeedingLog[];
  isAdmin?: boolean;
  onRestore?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const snap  = group.representative;
  const stats = useMemo(() => calcStats(group.periods, feedingLogs), [group.periods, feedingLogs]);
  const _now  = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
  const bc    = snap.bodyCondition as number;
  const { isCurrent, periods, originalIndex } = group;

  // Gabung periode "on" yang gap-nya < 1 hari (restore di hari sama = 1 periode)
  const mergedPeriods = useMemo((): ActivePeriod[] => {
    const sorted = [...periods].sort((a, b) => a.savedAt - b.savedAt);
    const result: ActivePeriod[] = [];
    sorted.forEach((p) => {
      if (result.length === 0) { result.push({ ...p }); return; }
      const last = result[result.length - 1];
      const gap  = p.savedAt - (last.endedAt ?? p.savedAt);
      if (gap < DAY_MS) {
        last.endedAt = p.endedAt; // perpanjang periode yang sudah ada
      } else {
        result.push({ ...p });
      }
    });
    return result;
  }, [periods]);

  // Bangun timeline: periode aktif + gap "off" yang ≥ 1 hari
  const timeline = useMemo(() => {
    const items: Array<{ type: 'on' | 'off'; from: number; to?: number }> = [];
    mergedPeriods.forEach((p, i) => {
      items.push({ type: 'on', from: p.savedAt, to: p.endedAt });
      const next = mergedPeriods[i + 1];
      if (p.endedAt && next && next.savedAt - p.endedAt >= DAY_MS) {
        items.push({ type: 'off', from: p.endedAt, to: next.savedAt });
      }
    });
    return items;
  }, [mergedPeriods]);

  return (
    <div className={cn(
      'rounded-3xl border overflow-hidden',
      isCurrent ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-white',
    )}>

      {/* Header — clickable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-7 py-5 hover:bg-black/2 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm',
              isCurrent ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-500',
            )}>
              #{originalIndex + 1}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-gray-900 text-lg">{snap.name}</span>
                {isCurrent
                  ? <span className="text-[10px] bg-amber-400 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-wide">Aktif Saat Ini</span>
                  : <span className="text-[10px] bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wide">Selesai</span>
                }
                {mergedPeriods.length > 1 && (
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wide">
                    {mergedPeriods.length}× dipakai
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="font-bold text-gray-600">{stats.days} hari aktif total</span>
                {' · '}
                {fmtDate(periods[0].savedAt)}
                {isCurrent ? ' — Sekarang' : periods.length > 1 ? ` … ${fmtDate(periods[periods.length - 1].endedAt ?? Date.now())}` : ` — ${fmtDate(periods[0].endedAt ?? Date.now())}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-base font-black text-amber-500">{stats.totalGrams}g</p>
              <p className="text-[10px] text-gray-400">total pakan</p>
            </div>
            {!isCurrent && isAdmin && onRestore && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRestore(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black transition-colors shadow-amber-200 shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Pakai Profil Ini</span>
              </button>
            )}
            <ChevronDown className={cn(
              'w-5 h-5 text-gray-400 transition-transform duration-200',
              expanded && 'rotate-180',
            )} />
          </div>
        </div>
      </button>

      {/* Periode aktif timeline — hanya tampil jika ada lebih dari 1 periode merged */}
      {mergedPeriods.length > 1 && (
        <div className="px-7 pb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Periode Penggunaan</p>
          <div className="space-y-1.5">
            {timeline.map((item, i) => (
              <div key={i} className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold',
                item.type === 'on'
                  ? (item.to === undefined ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-green-50 text-green-700 border border-green-100')
                  : 'bg-gray-50 text-gray-400 border border-gray-100',
              )}>
                <span className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  item.type === 'on' ? (item.to === undefined ? 'bg-amber-400 animate-pulse' : 'bg-green-400') : 'bg-gray-300',
                )} />
                {item.type === 'on' ? (
                  <span>
                    Aktif: <span className="font-black">{fmtDate(item.from)}</span>
                    {' — '}
                    <span className="font-black">{item.to ? fmtDate(item.to) : 'Sekarang'}</span>
                    {' · '}
                    {calcDaysActive(item.from, item.to)} hari
                  </span>
                ) : (
                  <span>
                    Tidak aktif: <span className="font-black">{fmtDate(item.from)}</span>
                    {' — '}
                    <span className="font-black">{item.to ? fmtDate(item.to) : '?'}</span>
                    {' · '}
                    {calcDaysActive(item.from, item.to)} hari
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile data chips */}
      <div className="px-7 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Berat',       value: `${snap.weight} kg` },
          { label: 'Target/Hari', value: `${snap.dailyGramTarget} g` },
          { label: 'BCS',         value: `${bc} — ${getBodyLabel(bc)}` },
          { label: 'Aktivitas',   value: ACTIVITY_LABEL[snap.activity ?? 'normal'] ?? 'Normal' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl px-4 py-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">{item.label}</p>
            <p className="text-sm font-black text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      <div className="mx-7 mb-5 grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { label: 'Total Pakan',    value: `${stats.totalGrams}g` },
          { label: 'Rata-rata/Hari', value: `${stats.avgPerDay}g` },
          { label: 'Manual',         value: `${stats.manualCount}x` },
          { label: 'Otomatis',       value: `${stats.autoCount}x` },
          { label: 'Hari Aktif',     value: `${stats.days}` },
        ].map((s) => (
          <div key={s.label} className={cn(
            'rounded-2xl px-3 py-3 text-center border',
            isCurrent ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100',
          )}>
            <p className="text-base font-black text-gray-900">{s.value}</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Expanded: daily breakdown */}
      {expanded && (
        <div className="border-t border-gray-100 px-7 py-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Riwayat Harian</p>
          {stats.dayBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada log pakan dalam periode ini.</p>
          ) : (
            <div className="space-y-1">
              {stats.dayBreakdown.map(({ dateKey, grams }) => {
                const pct     = snap.dailyGramTarget > 0
                  ? Math.min(Math.round((grams / snap.dailyGramTarget) * 100), 100)
                  : 0;
                const isToday = dateKey === todayStr;
                const date    = new Date(dateKey + 'T00:00:00');
                return (
                  <div key={dateKey} className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-24 shrink-0">
                      <p className={cn('text-sm font-black', isToday ? 'text-amber-600' : 'text-gray-700')}>
                        {isToday ? 'Hari ini' : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {date.toLocaleDateString('id-ID', { weekday: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-amber-500">{grams}g</span>
                        {snap.dailyGramTarget > 0 && (
                          <span className="text-xs text-gray-400">/ {snap.dailyGramTarget}g</span>
                        )}
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5 }}
                          className={cn('h-full rounded-full',
                            pct >= 100 ? 'bg-red-400' : pct >= 85 ? 'bg-green-400' : 'bg-amber-400',
                          )}
                        />
                      </div>
                    </div>
                    <span className={cn('text-xs font-bold w-10 text-right shrink-0',
                      pct >= 100 ? 'text-red-500' : pct >= 85 ? 'text-green-600' : 'text-amber-500',
                    )}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
              {stats.dayBreakdown.length === 14 && (
                <p className="text-xs text-gray-400 text-center pt-2">Menampilkan 14 hari terbaru</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CatProfilePage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === UserRole.SUPER_ADMIN;
  const { cat, feedingLogs, profileHistory, loading } = useCatData();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore profile state
  const [pendingRestore, setPendingRestore] = useState<CatProfileSnapshot | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleConfirmRestore = async () => {
    if (!pendingRestore || !cat) return;
    setRestoring(true);
    setRestoreError(null);

    // Cegah duplikat: kalau semua field utama identik dengan profil aktif, batalkan
    const scheduleKey = (s: typeof cat.feedingSchedule) =>
      (s ?? []).map((x) => `${x.time}:${x.amount}:${x.active}`).sort().join('|');
    const isIdentical =
      pendingRestore.weight           === cat.weight &&
      pendingRestore.dailyGramTarget  === cat.dailyGramTarget &&
      pendingRestore.bodyCondition    === (cat.bodyCondition as unknown as number) &&
      pendingRestore.isSterilized     === cat.isSterilized &&
      (pendingRestore.activity ?? 'normal') === ((cat as any).activity ?? 'normal') &&
      scheduleKey(pendingRestore.feedingSchedule ?? []) === scheduleKey(cat.feedingSchedule);

    if (isIdentical) {
      setRestoreError('Profil ini sudah sama dengan profil aktif saat ini, tidak ada perubahan yang perlu diterapkan.');
      setRestoring(false);
      return;
    }

    try {
      const now = Date.now();
      // Arsipkan profil aktif ke catProfileHistory — skip jika sudah ada (OnboardingFlow bisa duluan)
      const histId = `${cat.id}_${cat.profileUpdatedAt ?? now - 1}`;
      const existing = await getDoc(doc(db, 'catProfileHistory', histId));
      if (!existing.exists()) {
        await setDoc(doc(db, 'catProfileHistory', histId), {
          id:                 histId,
          catId:              cat.id,
          ownerId:            cat.ownerId,
          savedAt:            cat.profileUpdatedAt ?? 0,
          endedAt:            now,
          name:               cat.name,
          gender:             cat.gender,
          age:                cat.age,
          weight:             cat.weight,
          isSterilized:       cat.isSterilized,
          bodyCondition:      cat.bodyCondition,
          dailyGramTarget:    cat.dailyGramTarget,
          dailyCalorieTarget: cat.dailyCalorieTarget,
          kiloCaloriesPerKg:  cat.kiloCaloriesPerKg,
          activity:           (cat as any).activity ?? 'normal',
          feedingSchedule:    cat.feedingSchedule ?? [],
        });
      }
      // Terapkan profil lama ke dokumen kucing aktif
      await updateDoc(doc(db, 'cats', cat.id), {
        name:               pendingRestore.name,
        gender:             pendingRestore.gender,
        age:                pendingRestore.age,
        weight:             pendingRestore.weight,
        isSterilized:       pendingRestore.isSterilized,
        bodyCondition:      pendingRestore.bodyCondition,
        dailyGramTarget:    pendingRestore.dailyGramTarget,
        dailyCalorieTarget: pendingRestore.dailyCalorieTarget,
        kiloCaloriesPerKg:  pendingRestore.kiloCaloriesPerKg,
        activity:           pendingRestore.activity ?? 'normal',
        ...(pendingRestore.feedingSchedule ? { feedingSchedule: pendingRestore.feedingSchedule } : {}),
        profileUpdatedAt:      now,
        dailyLimitReachedDate: null,
        dailyLimitResetDate:   null,
        dailyAdjustments:      null,
        updatedAt:             new Date().toISOString(),
      });

      // Track event ganti profil kucing
      track('switch_cat_profile', {
        catId:       cat.id,
        catName:     cat.name,
        profileName: pendingRestore.name,
      });

      setPendingRestore(null);
    } catch {
      setRestoreError('Gagal menerapkan profil. Periksa koneksi dan coba lagi.');
    } finally {
      setRestoring(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 10MB.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      // Compress + resize to max 400x400px using Canvas, store as base64 in Firestore
      const base64 = await compressImage(file, 400, 0.75);
      if (!cat) return;
      await updateDoc(doc(db, 'cats', cat.id), { photoUrl: base64 });
    } catch {
      setUploadError('Gagal menyimpan foto. Coba lagi.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  function compressImage(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = ev.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/load.gif" alt="loading" className="h-24 w-auto object-contain" />
      </div>
    );
  }

  if (!cat) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="text-6xl">🐱</span>
        <p className="text-gray-500 text-lg font-medium">Belum ada data profil kucing.</p>
        <p className="text-gray-400 text-sm">Admin perlu mengisi Onboarding Flow terlebih dahulu.</p>
      </div>
    );
  }

  const bc       = cat.bodyCondition as unknown as number;
  const activity = (cat as any).activity as string | undefined;

  const metrics = [
    { label: 'Berat',         value: `${cat.weight} kg`,                              icon: Scale,    color: 'text-amber-500' },
    { label: 'Kondisi Tubuh', value: getBodyLabel(bc),                                icon: Heart,    color: bc <= 5 ? 'text-green-500' : 'text-orange-500' },
    { label: 'Aktivitas',     value: ACTIVITY_LABEL[activity ?? 'normal'] ?? 'Normal', icon: Activity, color: 'text-blue-400' },
  ];

  // ── Konsumsi hari ini — logika identik dengan FeedingControl ────────────────
  const _todayStart = new Date(); _todayStart.setHours(0, 0, 0, 0);
  const _todayStartMs = _todayStart.getTime();
  const todayCountFrom = Math.max(_todayStartMs, cat.profileUpdatedAt ?? 0);

  const _schedule = cat.feedingSchedule ?? [];
  const _smartFeedEnabled = (cat as any).smartFeedEnabled !== false;
  const _nowD = new Date();
  const _currentTimeStr = `${String(_nowD.getHours()).padStart(2, '0')}:${String(_nowD.getMinutes()).padStart(2, '0')}`;

  // Slot yang sudah punya log aktual hari ini
  const _deliveredSlots = new Set<string>();
  feedingLogs
    .filter((l) => l.notes === 'scheduled' && l.catId === cat.id && l.timestamp >= todayCountFrom)
    .forEach((l) => {
      const d = new Date(l.timestamp);
      const logMin = d.getHours() * 60 + d.getMinutes();
      _schedule.forEach((sl) => {
        const [slH, slM] = (sl.time as string).split(':').map(Number);
        if (Math.abs(logMin - (slH * 60 + slM)) <= 15) _deliveredSlots.add(sl.time as string);
      });
    });

  const todayTotal = Math.round(
    feedingLogs
      .filter((l) => l.catId === cat.id && l.timestamp >= todayCountFrom)
      .reduce((s, l) => s + (l.amountDispensed ?? 0), 0)
  );
  const dailyTarget = cat.dailyGramTarget ?? 0;
  const todayPct    = dailyTarget > 0 ? Math.min(Math.round((todayTotal / dailyTarget) * 100), 100) : 0;

  // Build full profile timeline: history (old→new) + current
  const currentSnapshot: CatProfileSnapshot = {
    id: 'current',
    catId: cat.id,
    ownerId: cat.ownerId,
    savedAt: cat.profileUpdatedAt ?? _todayStartMs,
    endedAt: undefined,
    name: cat.name,
    gender: cat.gender,
    age: cat.age,
    weight: cat.weight,
    isSterilized: cat.isSterilized,
    bodyCondition: bc,
    dailyGramTarget: cat.dailyGramTarget,
    dailyCalorieTarget: cat.dailyCalorieTarget,
    kiloCaloriesPerKg: cat.kiloCaloriesPerKg,
    activity: activity,
    feedingSchedule: cat.feedingSchedule,
  };

  const allProfiles: CatProfileSnapshot[] = [
    ...profileHistory.slice().sort((a, b) => a.savedAt - b.savedAt),
    currentSnapshot,
  ];

  // Isi endedAt yang kosong menggunakan savedAt profil berikutnya
  const allProfilesResolved = allProfiles.map((snap, idx) => {
    if (snap.endedAt !== undefined) return snap;
    const next = allProfiles[idx + 1];
    return next ? { ...snap, endedAt: next.savedAt } : snap;
  });

  // ── Group profil berdasarkan identity key ──────────────────────────────────
  // Profil dengan data yang sama (nama + berat + target + BCS + aktivitas + jadwal)
  // digabung jadi satu kartu dengan beberapa periode aktif.
  const profileGroups: ProfileGroup[] = (() => {
    const map = new Map<string, ProfileGroup>();
    allProfilesResolved.forEach((snap, idx) => {
      const key = profileIdentityKey(snap);
      if (!map.has(key)) {
        map.set(key, {
          key,
          representative: snap,
          periods: [],
          isCurrent: false,
          originalIndex: idx,
          restoreSnapshot: snap,
        });
      }
      const g = map.get(key)!;
      g.periods.push({ savedAt: snap.savedAt, endedAt: snap.endedAt });
      if (snap.id === 'current') g.isCurrent = true;
      // representative = snapshot dengan savedAt terbaru (paling baru = paling relevan)
      if (snap.savedAt > g.representative.savedAt) {
        g.representative = snap;
        g.originalIndex = idx;
        g.restoreSnapshot = snap;
      }
    });
    return Array.from(map.values());
  })();

  // Sort: current group paling atas, lalu berdasarkan periode paling akhir
  const sortedGroups = [...profileGroups].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    const aLast = Math.max(...a.periods.map((p) => p.endedAt ?? Infinity));
    const bLast = Math.max(...b.periods.map((p) => p.endedAt ?? Infinity));
    return bLast - aLast;
  });

  // Filter berdasarkan searchQuery
  const filteredGroups = sortedGroups.filter((g) =>
    g.representative.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-5 md:space-y-10">

      {/* ── PROFILE HEADER ── */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 p-5 md:p-10 bg-white rounded-[40px] border border-amber-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-50 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none" />

        <div className="relative shrink-0 group">
          <div className="w-40 h-40 rounded-[40px] overflow-hidden border-8 border-amber-100 shadow-xl">
            <img
              src={(cat as any).photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cat.name}`}
              alt={cat.name}
              className="w-full h-full object-cover"
            />
          </div>

          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                aria-label="Ganti foto profil kucing"
                title="Ganti foto profil kucing"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-4xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                {uploading
                  ? <><Loader2 className="w-7 h-7 text-white animate-spin" /><span className="text-white text-xs font-bold">Uploading...</span></>
                  : <><Camera className="w-7 h-7 text-white" /><span className="text-white text-xs font-bold">Ganti Foto</span></>
                }
              </button>
            </>
          )}

          {uploadError && (
            <p className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-red-500 font-semibold whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow">
              {uploadError}
            </p>
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-5">
          <div>
            <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">{cat.name}</h2>
              <span className={cn('px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider border', getBcsColor(bc))}>
                BCS {bc} — {getBodyLabel(bc)}
              </span>
            </div>
            <p className="text-xl text-gray-400 font-medium">
              {cat.gender === 'male' ? '♂ Jantan' : '♀ Betina'}
              {' • '}
              {cat.age} Tahun ({getAgeLabel(cat.age)})
              {cat.isSterilized ? ' • Sterilisasi' : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="p-4 rounded-3xl bg-amber-50/50 border border-amber-50">
                <div className={cn('w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm mx-auto md:mx-0', m.color)}>
                  <m.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{m.label}</p>
                <p className="text-lg font-black text-gray-900">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50/60 rounded-2xl px-5 py-3 flex items-center gap-5">
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Konsumsi Hari Ini</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {todayTotal}g{' '}
                <span className="text-sm font-medium text-gray-400">/ {dailyTarget > 0 ? `${dailyTarget}g` : '—'}</span>
              </p>
            </div>
            <div className="flex-1 h-2.5 bg-amber-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${todayPct}%` }}
                transition={{ duration: 0.8 }}
                className={cn('h-full rounded-full', todayTotal > dailyTarget ? 'bg-red-400' : todayPct >= 100 ? 'bg-green-400' : 'bg-amber-400')}
              />
            </div>
            <p className="text-sm font-black text-amber-500">{todayPct}%</p>
          </div>
        </div>
      </div>

      {/* ── HEALTH + FEEDING PLAN ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-10">

        {/* Health Status */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <ShieldCheck className="text-green-500 w-6 h-6" />
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Status Kesehatan</h3>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            {[
              {
                title: 'Status Berat Badan',
                status: getBodyLabel(bc),
                detail: `BCS ${bc}/9 — ${bc <= 5 ? 'Berat ideal' : 'Perlu perhatian diet'}`,
                color: bc <= 5 ? 'text-green-500' : 'text-orange-500',
                bg:    bc <= 5 ? 'bg-green-50'    : 'bg-orange-50',
              },
              {
                title: 'Status Sterilisasi',
                status: cat.isSterilized ? 'Sudah Steril' : 'Belum Steril',
                detail: cat.isSterilized
                  ? 'Faktor metabolisme Fm = 1.2 (lebih rendah)'
                  : 'Faktor metabolisme Fm = 1.4 (lebih tinggi)',
                color: 'text-blue-500',
                bg: 'bg-blue-50',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.bg)}>
                    <ShieldCheck className={cn('w-5 h-5', item.color)} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-xs font-black uppercase tracking-wider', item.color)}>{item.status}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}

            {bc >= 7 ? (
              <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Risiko FLUTD</p>
                      <p className="text-xs text-gray-500 mt-0.5">BCS {bc}/9 — {bc >= 9 ? 'Obesitas' : 'Overweight'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                    Perlu Perhatian
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 bg-white rounded-xl px-4 py-3 border border-orange-100">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-bold">Sistem sudah otomatis mengurangi porsi harian sebesar 15%</span>{' '}
                      (faktor koreksi BCS diterapkan pada target kalori harian).
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-white rounded-xl px-4 py-3 border border-orange-100">
                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Berat badan berlebih meningkatkan risiko FLUTD. Konsultasikan ke dokter hewan.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-5 rounded-2xl bg-green-50 border border-green-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Risiko FLUTD</p>
                    <p className="text-xs text-gray-500 mt-0.5">Kondisi tubuh dalam batas aman</p>
                  </div>
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-green-600">Rendah</span>
              </div>
            )}
          </div>
        </div>

        {/* Feeding Plan */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <Calculator className="text-amber-500 w-6 h-6" />
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Rencana Feeding</h3>
          </div>
          <div className="bg-gray-900 rounded-3xl p-5 md:p-8 text-white space-y-5 md:space-y-6">
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Target Kalori/Hari</p>
                <p className="text-2xl md:text-4xl font-black">{cat.dailyCalorieTarget}<span className="text-sm md:text-lg text-amber-400 ml-1">kcal</span></p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Porsi/Hari</p>
                <p className="text-2xl md:text-4xl font-black">{cat.dailyGramTarget}<span className="text-sm md:text-lg text-amber-400 ml-1">g</span></p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Energi Pakan</p>
                <p className="font-black text-amber-400">{cat.kiloCaloriesPerKg} kcal/kg</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Aktivitas</p>
                <p className="font-black text-amber-400">{ACTIVITY_LABEL[activity ?? 'normal'] ?? 'Normal'}</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-5">
              <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">Jadwal Pemberian</p>
              <div className="space-y-3">
                {cat.feedingSchedule && cat.feedingSchedule.length > 0
                  ? cat.feedingSchedule.map((slot) => (
                    <div key={slot.time} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-amber-400">{slot.time}</span>
                        <p className="text-sm font-bold">{slot.label ?? 'Feeding'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Utensils className="w-3 h-3 text-white/40" />
                        <span className="text-sm font-black text-amber-400">{slot.amount}g</span>
                      </div>
                    </div>
                  ))
                  : <p className="text-sm text-white/40 text-center py-4">Belum ada jadwal feeding.</p>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIWAYAT PROFIL ── */}
      <div className="space-y-5">

        {/* Header + Search */}
        <div className="flex items-center justify-between gap-4 flex-wrap px-1">
          <div>
            <h3 className="text-2xl font-black text-gray-900">Riwayat Profil Kucing</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {filteredGroups.length} profil unik · {allProfilesResolved.length} entri tercatat
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-medium outline-none focus:border-amber-400 transition-colors w-48"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="max-h-175 overflow-y-auto space-y-4 pr-1 scroll-smooth">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-gray-100">
              <Search className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-500">Tidak ditemukan</p>
              <p className="text-xs text-gray-400 mt-1">
                Tidak ada profil dengan nama &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          ) : (
            filteredGroups.map((g) => (
              <ProfileHistoryCard
                key={g.key}
                group={g}
                feedingLogs={feedingLogs}
                isAdmin={isAdmin}
                onRestore={!g.isCurrent ? () => setPendingRestore(g.restoreSnapshot) : undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* ── MODAL KONFIRMASI GANTI PROFIL ── */}
      <AnimatePresence>
        {pendingRestore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { if (!restoring) setPendingRestore(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-4xl p-6 shadow-2xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                    <RotateCcw className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-black text-lg text-gray-900">Ganti ke Profil Ini?</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                      Profil aktif saat ini akan digantikan oleh profil berikut:
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Tutup"
                  onClick={() => { if (!restoring) setPendingRestore(null); }}
                  className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Preview profil yang akan dipasang */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-amber-500">Profil yang akan diterapkan</p>
                <p className="text-xl font-black text-gray-900">{pendingRestore.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Berat',       value: `${pendingRestore.weight} kg` },
                    { label: 'Target/Hari', value: `${pendingRestore.dailyGramTarget} g` },
                    { label: 'BCS',         value: `${pendingRestore.bodyCondition} — ${getBodyLabel(pendingRestore.bodyCondition)}` },
                    { label: 'Aktivitas',   value: ACTIVITY_LABEL[pendingRestore.activity ?? 'normal'] ?? 'Normal' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white rounded-xl px-3 py-2 border border-amber-100">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.label}</p>
                      <p className="text-sm font-black text-gray-900 mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
                {pendingRestore.feedingSchedule && pendingRestore.feedingSchedule.length > 0 && (
                  <div className="bg-white rounded-xl px-3 py-2 border border-amber-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Jadwal Pakan</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pendingRestore.feedingSchedule.map((s) => (
                        <span key={s.time} className="text-xs font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">
                          {s.time} · {s.amount}g
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700 leading-relaxed">
                  Profil aktif sekarang akan diarsipkan. Counter feeding hari ini akan
                  <strong> direset</strong>. Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>

              {restoreError && (
                <div className="flex items-center gap-2 bg-red-50 rounded-xl px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 font-semibold">{restoreError}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setPendingRestore(null); setRestoreError(null); }}
                  disabled={restoring}
                  className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-black text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={restoring}
                  className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-amber-200 shadow-md"
                >
                  {restoring
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Menerapkan...</>
                    : <><RotateCcw className="w-4 h-4" /> Ya, Terapkan Profil</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}