import { CatProfile, CatProfileSnapshot } from '../types';

/**
 * Rentang waktu (dalam ms) saat sebuah profil kucing berstatus aktif.
 * `end` bernilai Infinity jika periode tsb masih berlangsung (belum digantikan
 * oleh profil lain).
 */
export interface ActivePeriod {
  start: number;
  end: number;
}

/**
 * Kunci identitas profil — dua snapshot dianggap "profil yang sama" kalau
 * seluruh datanya identik. Disamakan persis dengan `profileIdentityKey` di
 * CatProfilePage.tsx supaya grouping konsisten di semua komponen.
 */
function identityKey(
  snap: Pick<
    CatProfileSnapshot,
    'name' | 'weight' | 'dailyGramTarget' | 'bodyCondition' | 'activity' | 'feedingSchedule'
  >
): string {
  const sched = (snap.feedingSchedule ?? [])
    .map((s) => `${s.time}:${s.amount}:${s.active ?? true}`)
    .sort()
    .join('|');
  return `${snap.name}__${snap.weight}__${snap.dailyGramTarget}__${snap.bodyCondition}__${snap.activity ?? 'normal'}__${sched}`;
}

/**
 * Menghitung SEMUA periode saat profil kucing yang SEDANG AKTIF pernah aktif —
 * termasuk periode-periode sebelumnya jika profil ini pernah diganti ke profil
 * lain lalu diaktifkan/dipilih kembali (restore).
 *
 * Kenapa ini perlu: satu owner hanya punya 1 dokumen `cat` (id-nya tetap sama
 * walau profil diganti), jadi field `catId` pada feeding log TIDAK cukup untuk
 * membedakan log dari profil lama vs baru. Pendekatan lama memakai satu cutoff
 * tunggal `profileUpdatedAt` (waktu profil AKTIF SAAT INI mulai berlaku), yang
 * berakibat: kalau profil "Kitty" aktif tgl 1–5, diganti ke "Milo" tgl 5–8,
 * lalu di-restore balik ke "Kitty" tgl 8–sekarang, maka log feeding "Kitty"
 * dari tgl 1–5 akan tetap tersembunyi walau "Kitty" sudah aktif lagi.
 *
 * Fungsi ini menelusuri `profileHistory` (snapshot tiap kali profil disimpan/
 * diganti) dan menggabungkan semua periode yang datanya identik dengan profil
 * yang aktif sekarang, sehingga riwayat lamanya ikut muncul kembali.
 */
export function getCurrentProfilePeriods(
  cat: CatProfile | null,
  profileHistory: CatProfileSnapshot[]
): ActivePeriod[] {
  if (!cat) return [];

  const currentSnapshot: CatProfileSnapshot = {
    id: 'current',
    catId: cat.id,
    ownerId: cat.ownerId,
    savedAt: cat.profileUpdatedAt ?? 0,
    endedAt: undefined,
    name: cat.name,
    gender: cat.gender,
    age: cat.age,
    weight: cat.weight,
    isSterilized: cat.isSterilized,
    bodyCondition: cat.bodyCondition,
    dailyGramTarget: cat.dailyGramTarget,
    dailyCalorieTarget: cat.dailyCalorieTarget,
    kiloCaloriesPerKg: cat.kiloCaloriesPerKg,
    activity: cat.activity,
    feedingSchedule: cat.feedingSchedule,
  };

  const allSnapshots = [
    ...profileHistory.slice().sort((a, b) => a.savedAt - b.savedAt),
    currentSnapshot,
  ];

  // Isi endedAt yang kosong pakai savedAt snapshot berikutnya (snapshot lama
  // yang belum sempat diberi endedAt secara eksplisit saat disimpan).
  const resolved = allSnapshots.map((snap, idx) => {
    if (snap.endedAt !== undefined) return snap;
    const next = allSnapshots[idx + 1];
    return next ? { ...snap, endedAt: next.savedAt } : snap;
  });

  const currentKey = identityKey(currentSnapshot);

  return resolved
    .filter((snap) => identityKey(snap) === currentKey)
    .map((snap) => ({ start: snap.savedAt, end: snap.endedAt ?? Infinity }));
}

/** Cek apakah sebuah timestamp jatuh di salah satu periode aktif. */
export function isTimestampInPeriods(ts: number, periods: ActivePeriod[]): boolean {
  return periods.some((p) => ts >= p.start && ts < p.end);
}