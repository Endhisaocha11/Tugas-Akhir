import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  query,
  updateDoc,
  where,
  onSnapshot,
  limit,
  orderBy,
  addDoc,
} from 'firebase/firestore';
import { ref, onValue, set } from 'firebase/database';
import { db, rtdb } from './firebase';
import { useAuth } from './AuthContext';
import { useDevice } from './DeviceContext';
import { CatProfile, CatProfileSnapshot, DeviceStatus, FeedingLog, UserRole } from '../types';

export interface CatData {
  cat: CatProfile | null;
  device: DeviceStatus | null;
  devices: DeviceStatus[];
  feedingLogs: FeedingLog[];
  profileHistory: CatProfileSnapshot[];
  targetOwnerId: string;
  loading: boolean;
}

function parseRtdbTime(timeStr?: string): number {
  if (!timeStr) return 0;
  try {
    const [h, m, s] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, s, 0);
    return d.getTime();
  } catch {
    return 0;
  }
}

export function useCatData(): CatData {
  const { user, profile } = useAuth();
  const { selectedDeviceId, setSelectedDeviceId } = useDevice();

  const [cat, setCat] = useState<CatProfile | null>(null);
  const [allCatIds, setAllCatIds] = useState<string[]>([]);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [rtdbDeviceData, setRtdbDeviceData] = useState<Record<string, any> | null>(null);
  const [staleCheck, setStaleCheck] = useState<number>(0);   // ticker 30 detik agar isOnline dievaluasi ulang
  const [feedingLogs, setFeedingLogs] = useState<FeedingLog[]>([]);
  const [profileHistory, setProfileHistory] = useState<CatProfileSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const prevTargetRef = useRef<number | null>(null);
  const prevScheduleKeyRef = useRef<string | null>(null);
  const prevProfileUpdatedAtRef = useRef<number | null>(null);
  // Ref cat terkini agar listener RTDB tidak punya stale closure
  const catRef = useRef<CatProfile | null>(null);

  const isAdmin = profile?.role === UserRole.SUPER_ADMIN;
  const targetOwnerId = isAdmin
    ? (user?.uid ?? '')
    : (localStorage.getItem('selectedAdminId') ?? '');

  // ── Effect 1: cats + devices (claim metadata) + profile history ───────────
  useEffect(() => {
    if (!user || !targetOwnerId) {
      setLoading(false);
      return;
    }

    const subs: (() => void)[] = [];

    subs.push(
      onSnapshot(
        query(collection(db, 'cats'), where('ownerId', '==', targetOwnerId)),
        (snap) => {
          const catList = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as CatProfile)
          );
          // Aktif = profil paling baru diupdate
          catList.sort((a, b) => (b.profileUpdatedAt ?? 0) - (a.profileUpdatedAt ?? 0));
          setCat(catList[0] ?? null);
          setAllCatIds(catList.map((c) => c.id));
          setLoading(false);
        },
        () => setLoading(false)
      )
    );

    // Firestore devices: hanya menyimpan claim metadata (isClaimed, claimedBy, linkedCatId)
    // Telemetri live (isOnline, weight, dll.) datang dari RTDB di Effect 2
    subs.push(
      onSnapshot(
        query(collection(db, 'devices'), where('claimedBy', '==', targetOwnerId), limit(1)),
        (snap) => {
          const devList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DeviceStatus));
          setDevices(devList);
        }
      )
    );

    subs.push(
      onSnapshot(
        // FIX: sebelumnya limit(20) TANPA orderBy — Firestore tidak menjamin
        // urutan berdasarkan savedAt, jadi 20 dokumen yang kepilih bisa saja
        // bukan yang terbaru (bisa kepotong riwayat penting), dan kalau total
        // riwayat > 20 entri, sisanya tidak pernah ke-fetch sama sekali.
        // Sekarang diurutkan dulu berdasarkan savedAt terbaru, baru dibatasi
        // dengan limit yang lebih longgar.
        query(
          collection(db, 'catProfileHistory'),
          where('ownerId', '==', targetOwnerId),
          orderBy('savedAt', 'desc'),
          limit(200)
        ),
        (snap) => {
          const history = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as CatProfileSnapshot))
            .sort((a, b) => a.savedAt - b.savedAt);
          setProfileHistory(history);
        }
      )
    );

    return () => subs.forEach((u) => u());
  }, [user, targetOwnerId]);

  // Selalu sinkronkan catRef agar listener RTDB tidak punya stale closure
  useEffect(() => { catRef.current = cat; }, [cat]);

  // ── Effect 2: RTDB device telemetri — subscribe setelah device ID diketahui ─
  // Device ID didapat dari Firestore claim doc (devices[0].id)
  const claimedDeviceId = devices[0]?.id;

  useEffect(() => {
    if (!claimedDeviceId || !rtdb) return;

    // Telemetri live (isOnline, weight, servo, dll.)
    const deviceRtdbRef = ref(rtdb, `devices/${claimedDeviceId}`);
    const unsubTelemetry = onValue(deviceRtdbRef, (snapshot) => {
      setRtdbDeviceData(snapshot.exists() ? snapshot.val() : null);
    });

    return () => unsubTelemetry();
  }, [claimedDeviceId]);

  // ── Effect 2b: Deteksi jadwal otomatis — tunggu cat tersedia dulu ──────────
  // Dua fix sekaligus:
  // 1. cat?.id di deps → effect hanya jalan setelah device + cat keduanya siap.
  // 2. isProcessingRef → cegah double-log saat React StrictMode mount effect 2x
  //    (kedua onValue bisa sama-sama lihat processed:false sebelum await selesai).
  // 3. Gunakan Date.now() bukan data.ts — ESP32 kirim ts sebagai jam lokal WIB
  //    tapi diperlakukan sebagai UTC sehingga timestamp bergeser +7 jam.
  const isProcessingRef = useRef(false);
  // Dedup per-slot per-hari: ESP32 kadang retry nulis scheduledFeedLog setelah node dihapus
  // sehingga browser memproses slot yang sama >1x. Map: "catId:slotKey" → dateString.
  const processedSlotsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!claimedDeviceId || !rtdb || !cat?.id) return;
    const catId = cat.id;

    const schedLogRef = ref(rtdb, `devices/${claimedDeviceId}/scheduledFeedLog`);
    const unsubSchedLog = onValue(schedLogRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.val() as {
        amount: number;
        requestedAmount?: number;
        slot: string;
        ts: number;
        processed?: boolean;
      };
      // Guard pakai requestedAmount (target, dijamin > 0 oleh firmware) — BUKAN
      // amount (berat aktual tertimbang), karena amount kini sah bernilai 0
      // saat dispensing benar-benar gagal (servo macet/stok habis dll). Memakai
      // amount sebagai guard akan diam-diam membuang event kegagalan tersebut,
      // padahal justru event itu yang paling penting untuk tercatat di riwayat.
      const requested = data.requestedAmount ?? data.amount;
      if (data.processed === true || !requested) return;
      if (isProcessingRef.current) return; // cegah race condition StrictMode
      isProcessingRef.current = true;

      try {
        // Cek apakah slot ini sudah diproses hari ini (guard ESP32 retry)
        const today = new Date().toDateString();
        const slotKey = `${catId}:${data.slot ?? Math.floor((data.ts || Date.now()) / 60000)}`;
        if (processedSlotsRef.current.get(slotKey) === today) {
          // Sudah diproses — hapus node retry tanpa buat log baru
          await set(ref(rtdb, `devices/${claimedDeviceId}/scheduledFeedLog`), null).catch(() => { });
          return;
        }

        // Tandai processed dulu agar listener kedua (StrictMode) tidak ikut proses
        await set(ref(rtdb, `devices/${claimedDeviceId}/scheduledFeedLog/processed`), true);
        // `amount` = berat AKTUAL yang benar-benar tertimbang ESP32 (selisih
        // sebelum/sesudah dispensing) — sama prinsipnya dengan manual feed yang
        // mengukur dari devices/{id}/weight. `requested` = target sebelum
        // dispensing. Status 'success' hanya jika aktual cukup dekat ke target
        // (ambang sama dengan threshold konfirmasi di manual feed); kalau jauh
        // (servo macet, stok habis, dll.) ditandai 'warning' agar kelihatan di
        // riwayat — bukan diam-diam dianggap sukses penuh.
        const actual = data.amount ?? 0;
        const threshold = Math.max(5, requested * 0.4);
        const isCloseEnough = actual >= requested - threshold;
        await addDoc(collection(db, 'feedingLogs'), {
          catId,
          deviceId: claimedDeviceId,
          timestamp: Date.now(),
          amountRequested: requested,
          amountDispensed: actual,
          status: isCloseEnough ? 'success' : 'warning',
          notes: 'scheduled',
        });
        processedSlotsRef.current.set(slotKey, today);
        // Hapus node setelah log dibuat agar ESP32 bisa menulis slot berikutnya secara fresh
        await set(ref(rtdb, `devices/${claimedDeviceId}/scheduledFeedLog`), null);
      } finally {
        isProcessingRef.current = false;
      }
    });

    // Jangan reset isProcessingRef di cleanup — jika StrictMode unmount+remount
    // saat processing sedang berjalan, reset ini menyebabkan remount ikut memproses
    // lagi → duplikat log. finally{} di atas sudah menangani reset setelah selesai.
    return () => { unsubSchedLog(); };
  }, [claimedDeviceId, cat?.id]);

  // ── Effect 3: feeding logs — semua catId milik owner ini ────────────────
  const allCatIdsKey = allCatIds.slice(0, 10).join(',');
  useEffect(() => {
    if (!allCatIdsKey) return;
    const ids = allCatIdsKey.split(',').filter(Boolean);

    const unsub = onSnapshot(
      query(collection(db, 'feedingLogs'), where('catId', 'in', ids), limit(200)),
      (snap) => {
        const logs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as FeedingLog))
          .sort((a, b) => b.timestamp - a.timestamp);
        // Deduplicate: scheduled logs dalam window 3 menit dari catId yang sama
        // = akibat bug ESP32 multi-retry. Hanya simpan 1 per window.
        const seen = new Set<string>();
        const deduped = logs.filter((log) => {
          if (log.notes !== 'scheduled') return true;
          const bucket = Math.floor(log.timestamp / (3 * 60 * 1000));
          const key = `${log.catId}:${bucket}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setFeedingLogs(deduped);
      }
    );

    return unsub;
  }, [allCatIdsKey]);

  // When owner changes, clear selectedDeviceId if it no longer belongs
  useEffect(() => {
    if (!selectedDeviceId || devices.length === 0) return;
    const belongs = devices.some((d) => d.id === selectedDeviceId);
    if (!belongs) setSelectedDeviceId('');
  }, [devices, selectedDeviceId, setSelectedDeviceId]);

  // Ticker 30 detik — memicu re-render agar isRtdbLive dievaluasi ulang dengan Date.now() terbaru
  useEffect(() => {
    const id = setInterval(() => setStaleCheck(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Clear limit flag saat target/jadwal berubah ATAU saat profil disimpan dari luar (onboarding)
  useEffect(() => {
    if (!cat || !targetOwnerId) return;
    const currentTarget = cat.dailyGramTarget ?? 0;
    const currentScheduleKey = (cat.feedingSchedule ?? [])
      .map((s) => `${s.time}:${s.amount}`)
      .join('|');
    const currentProfileUpdatedAt = cat.profileUpdatedAt ?? 0;
    const isFirstLoad = prevTargetRef.current === null;
    const targetChanged = !isFirstLoad && prevTargetRef.current !== currentTarget;
    const scheduleChanged = !isFirstLoad && prevScheduleKeyRef.current !== currentScheduleKey;
    // Deteksi simpan profil dari OnboardingFlow/CatProfilePage (mereka tulis profileUpdatedAt)
    const profileSavedExternally = !isFirstLoad
      && prevProfileUpdatedAtRef.current !== null
      && prevProfileUpdatedAtRef.current !== currentProfileUpdatedAt;
    prevTargetRef.current = currentTarget;
    prevScheduleKeyRef.current = currentScheduleKey;
    prevProfileUpdatedAtRef.current = currentProfileUpdatedAt;
    if (!isFirstLoad && (targetChanged || scheduleChanged || profileSavedExternally)) {
      const _d = new Date();
      const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
      // dailyAdjustments selalu di-clear saat profil baru dimuat (profileUpdatedAt berubah),
      // agar ESP32 tidak membaca slot amounts lama dari sesi sebelumnya.
      const updates: Record<string, string | null> = {
        dailyLimitReachedDate: null,
        dailyAdjustments: null,
      };
      if (targetChanged || scheduleChanged) {
        updates.dailyLimitResetDate = todayStr;
      }
      updateDoc(doc(db, 'cats', cat.id), updates).catch(console.error);
    }
  }, [cat, targetOwnerId]);

  // ── Gabung Firestore claim metadata + RTDB telemetri ─────────────────────
  // Bandingkan field `time` (HH:MM:SS dari ESP32) dengan jam browser sekarang.
  // Jika selisih > 2 menit → data basi → device offline.
  // staleCheck (ticker 30 detik) memaksa re-evaluasi agar Date bergerak.
  const isRtdbLive = (() => {
    void staleCheck; // reactive trigger
    const timeStr = rtdbDeviceData?.time as string | undefined;
    if (!timeStr) return false;
    try {
      const [h, m, s] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m) || isNaN(s)) return false;
      const now = new Date();
      const devSec = h * 3600 + m * 60 + s;
      const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      let diffSec = Math.abs(nowSec - devSec);
      if (diffSec > 43200) diffSec = 86400 - diffSec; // tengah malam crossover
      return diffSec < 120; // toleransi 2 menit
    } catch { return false; }
  })();

  const fsDevice = devices[0] ?? null;
  const device: DeviceStatus | null = fsDevice
    ? {
      ...fsDevice,
      // Online hanya jika: data RTDB ada, ESP32 set isOnline=true, DAN data belum basi (< 90 detik)
      isOnline: rtdbDeviceData?.isOnline === true && isRtdbLive,
      lastPulse: parseRtdbTime(rtdbDeviceData?.time) || fsDevice.lastPulse,
      foodStockLevel: rtdbDeviceData?.foodStock ?? fsDevice.foodStockLevel,
      currentWeightOnScale: rtdbDeviceData != null
        ? Math.round(rtdbDeviceData.weight ?? 0)
        : fsDevice.currentWeightOnScale,
      servoStatus: rtdbDeviceData?.servoStatus ?? fsDevice.servoStatus,
      // RTDB adalah sumber utama kalibrasi (ESP32 baca/tulis ke sana); Firestore sebagai backup
      calibrationFactor: rtdbDeviceData?.calibration?.loadCellFactor || fsDevice.calibrationFactor || 420,
    }
    : null;

  return {
    cat,
    device,
    devices: device ? [device] : [],
    feedingLogs,
    profileHistory,
    targetOwnerId,
    loading,
  };
}