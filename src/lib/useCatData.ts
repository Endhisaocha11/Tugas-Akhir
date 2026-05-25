import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  query,
  updateDoc,
  where,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
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

  const [cat, setCat]                   = useState<CatProfile | null>(null);
  const [devices, setDevices]           = useState<DeviceStatus[]>([]);
  const [rtdbDeviceData, setRtdbDeviceData] = useState<Record<string, any> | null>(null);
  const [feedingLogs, setFeedingLogs]   = useState<FeedingLog[]>([]);
  const [profileHistory, setProfileHistory] = useState<CatProfileSnapshot[]>([]);
  const [loading, setLoading]           = useState(true);

  const prevTargetRef       = useRef<number | null>(null);
  const prevScheduleKeyRef  = useRef<string | null>(null);

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
        query(collection(db, 'cats'), where('ownerId', '==', targetOwnerId), limit(1)),
        (snap) => {
          const data = snap.empty
            ? null
            : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as CatProfile);
          setCat(data);
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
        query(collection(db, 'catProfileHistory'), where('ownerId', '==', targetOwnerId), limit(20)),
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

  // ── Effect 2: RTDB device telemetri — subscribe setelah device ID diketahui ─
  // Device ID didapat dari Firestore claim doc (devices[0].id)
  const claimedDeviceId = devices[0]?.id;

  useEffect(() => {
    if (!claimedDeviceId || !rtdb) return;

    const deviceRtdbRef = ref(rtdb, `devices/${claimedDeviceId}`);
    const unsub = onValue(deviceRtdbRef, (snapshot) => {
      setRtdbDeviceData(snapshot.exists() ? snapshot.val() : null);
    });

    return () => unsub();
  }, [claimedDeviceId]);

  // ── Effect 3: feeding logs — depend on cat.id ─────────────────────────────
  useEffect(() => {
    if (!cat?.id) return;

    const unsub = onSnapshot(
      query(collection(db, 'feedingLogs'), where('catId', '==', cat.id), limit(200)),
      (snap) => {
        const logs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as FeedingLog))
          .sort((a, b) => b.timestamp - a.timestamp);
        setFeedingLogs(logs);
      }
    );

    return unsub;
  }, [cat?.id]);

  // When owner changes, clear selectedDeviceId if it no longer belongs
  useEffect(() => {
    if (!selectedDeviceId || devices.length === 0) return;
    const belongs = devices.some((d) => d.id === selectedDeviceId);
    if (!belongs) setSelectedDeviceId('');
  }, [devices, selectedDeviceId, setSelectedDeviceId]);

  // When dailyGramTarget or feedingSchedule changes, clear stale limit/adjustment data
  useEffect(() => {
    if (!cat || !targetOwnerId) return;
    const currentTarget = cat.dailyGramTarget ?? 0;
    const currentScheduleKey = (cat.feedingSchedule ?? [])
      .map((s) => `${s.time}:${s.amount}`)
      .join('|');
    const isFirstLoad    = prevTargetRef.current === null;
    const targetChanged  = !isFirstLoad && prevTargetRef.current !== currentTarget;
    const scheduleChanged = !isFirstLoad && prevScheduleKeyRef.current !== currentScheduleKey;
    prevTargetRef.current      = currentTarget;
    prevScheduleKeyRef.current = currentScheduleKey;
    if (!isFirstLoad && (targetChanged || scheduleChanged)) {
      const todayStr = new Date().toISOString().split('T')[0];
      updateDoc(doc(db, 'cats', cat.id), {
        profileUpdatedAt:      Date.now(),
        dailyLimitResetDate:   todayStr,
        dailyLimitReachedDate: null,
        dailyAdjustments:      null,
      }).catch(console.error);
    }
  }, [cat, targetOwnerId]);

  // ── Gabung Firestore claim metadata + RTDB telemetri ─────────────────────
  const fsDevice = devices[0] ?? null;
  const device: DeviceStatus | null = fsDevice
    ? {
        ...fsDevice,
        // Override field telemetri dengan data live dari RTDB (ESP32)
        isOnline:             rtdbDeviceData?.isOnline            ?? fsDevice.isOnline,
        lastPulse:            parseRtdbTime(rtdbDeviceData?.time)  || fsDevice.lastPulse,
        foodStockLevel:       rtdbDeviceData?.foodStock            ?? fsDevice.foodStockLevel,
        currentWeightOnScale: rtdbDeviceData != null
          ? Math.round(rtdbDeviceData.weight ?? 0)
          : fsDevice.currentWeightOnScale,
        servoStatus:          rtdbDeviceData?.servoStatus          ?? fsDevice.servoStatus,
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
