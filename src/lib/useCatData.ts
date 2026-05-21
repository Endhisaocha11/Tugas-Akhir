import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { CatProfile, DeviceStatus, FeedingLog, UserRole } from '../types';

export interface CatData {
  cat: CatProfile | null;
  device: DeviceStatus | null;
  feedingLogs: FeedingLog[];
  targetOwnerId: string;
  loading: boolean;
}

/**
 * Resolves the correct owner ID based on role:
 *  - SUPER_ADMIN → own uid
 *  - USER (monitor mode) → selectedAdminId from localStorage
 * Then subscribes to cats, devices, and feedingLogs in real-time.
 */
export function useCatData(): CatData {
  const { user, profile } = useAuth();

  const [cat, setCat] = useState<CatProfile | null>(null);
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [feedingLogs, setFeedingLogs] = useState<FeedingLog[]>([]);
  const [loading, setLoading] = useState(true);

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

    // ── Devices ───────────────────────────────────────────
    subs.push(
      onSnapshot(
        query(
          collection(db, 'devices'),
          where('ownerId', '==', targetOwnerId),
          limit(1)
        ),
        (snap) => {
          setDevice(snap.empty ? null : (snap.docs[0].data() as DeviceStatus));
        }
      )
    );

    // ── Feeding Logs ──────────────────────────────────────
    const catDocId = `${targetOwnerId}_main`;
    subs.push(
      onSnapshot(
        query(
          collection(db, 'feedingLogs'),
          where('catId', '==', catDocId),
          limit(100)
        ),
        (snap) => {
          const logs = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as FeedingLog))
            .sort((a, b) => b.timestamp - a.timestamp);
          setFeedingLogs(logs);
        }
      )
    );

    return () => subs.forEach((u) => u());
  }, [user, targetOwnerId]);

  return { cat, device, feedingLogs, targetOwnerId, loading };
}
