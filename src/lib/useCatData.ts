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
import { db } from './firebase';
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

/**
 * Resolves the correct owner ID based on role:
 *  - SUPER_ADMIN → own uid
 *  - USER (monitor mode) → selectedAdminId from localStorage
 * Then subscribes to cats, devices (up to 2), and feedingLogs in real-time.
 */
export function useCatData(): CatData {
  const { user, profile } = useAuth();
  const { selectedDeviceId, setSelectedDeviceId } = useDevice();

  const [cat, setCat] = useState<CatProfile | null>(null);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [feedingLogs, setFeedingLogs] = useState<FeedingLog[]>([]);
  const [profileHistory, setProfileHistory] = useState<CatProfileSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const prevTargetRef = useRef<number | null>(null);
  const prevScheduleKeyRef = useRef<string | null>(null);

  const isAdmin = profile?.role === UserRole.SUPER_ADMIN;
  const targetOwnerId = isAdmin
    ? (user?.uid ?? '')
    : (localStorage.getItem('selectedAdminId') ?? '');

  useEffect(() => {
    if (!user || !targetOwnerId) {
      setLoading(false);
      return;
    }

    const subs: (() => void)[] = [];

    // ── Cats ──────────────────────────────────────────────
    subs.push(
      onSnapshot(
        query(
          collection(db, 'cats'),
          where('ownerId', '==', targetOwnerId),
          limit(1)
        ),
        (snap) => {
          setCat(snap.empty ? null : (snap.docs[0].data() as CatProfile));
          setLoading(false);
        },
        () => setLoading(false)
      )
    );

    // ── Devices (up to 2 — ESP1 and ESP2) ────────────────
    subs.push(
      onSnapshot(
        query(
          collection(db, 'devices'),
          where('ownerId', '==', targetOwnerId),
          limit(2)
        ),
        (snap) => {
          const devList = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as DeviceStatus))
            .sort((a, b) => (a.deviceNumber ?? 1) - (b.deviceNumber ?? 1));
          setDevices(devList);
        }
      )
    );

    // ── Feeding Logs (last 200) ───────────────────────────
    const catDocId = `${targetOwnerId}_main`;
    subs.push(
      onSnapshot(
        query(
          collection(db, 'feedingLogs'),
          where('catId', '==', catDocId),
          limit(200)
        ),
        (snap) => {
          const logs = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as FeedingLog))
            .sort((a, b) => b.timestamp - a.timestamp);
          setFeedingLogs(logs);
        }
      )
    );

    // ── Profile History ───────────────────────────────────
    subs.push(
      onSnapshot(
        query(
          collection(db, 'catProfileHistory'),
          where('ownerId', '==', targetOwnerId),
          limit(20)
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

  // When owner changes, clear selectedDeviceId if it no longer belongs to this owner's devices
  useEffect(() => {
    if (!selectedDeviceId) return;
    if (devices.length === 0) return;
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
    const isFirstLoad = prevTargetRef.current === null;
    const targetChanged = !isFirstLoad && prevTargetRef.current !== currentTarget;
    const scheduleChanged = !isFirstLoad && prevScheduleKeyRef.current !== currentScheduleKey;
    prevTargetRef.current = currentTarget;
    prevScheduleKeyRef.current = currentScheduleKey;
    if (!isFirstLoad && (targetChanged || scheduleChanged)) {
      const todayStr = new Date().toISOString().split('T')[0];
      const updates: Record<string, string | number | null> = {
        profileUpdatedAt: Date.now(),
        dailyLimitResetDate: todayStr,
        dailyLimitReachedDate: null,
        dailyAdjustments: null,
      };
      updateDoc(doc(db, 'cats', `${targetOwnerId}_main`), updates).catch(console.error);
    }
  }, [cat, targetOwnerId]);

  const device = selectedDeviceId
    ? (devices.find((d) => d.id === selectedDeviceId) ?? devices[0] ?? null)
    : (devices[0] ?? null);

  return {
    cat,
    device,
    devices,
    feedingLogs,
    profileHistory,
    targetOwnerId,
    loading,
  };
}
