import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, rtdb } from './firebase';
import { DeviceStatus } from '../types';

export type DeviceStatusLabel = 'available' | 'connected' | 'offline' | 'used';

export function getDeviceStatus(device: DeviceStatus, myUid: string): DeviceStatusLabel {
  if (!device.isClaimed) return 'available';
  if (device.claimedBy !== myUid) return 'used';
  return device.isOnline ? 'connected' : 'offline';
}

// Konversi "HH:MM:SS" dari RTDB ke unix ms (pakai tanggal hari ini)
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

// Gabung data RTDB (telemetri ESP32) + Firestore (claim metadata)
function mergeDevice(
  id: string,
  rtdbData: Record<string, any>,
  fsData: Record<string, any> | null
): DeviceStatus {
  return {
    id,
    // Telemetri live dari RTDB
    isOnline:              rtdbData.isOnline ?? false,
    lastPulse:             parseRtdbTime(rtdbData.time),
    foodStockLevel:        rtdbData.foodStock ?? 0,
    currentWeightOnScale:  Math.round(rtdbData.weight ?? 0),
    servoStatus:           rtdbData.servoStatus ?? 'idle',
    calibrationFactor:     rtdbData.calibrationFactor ?? 0,
    // Claim metadata dari Firestore (null jika belum pernah diklaim)
    isClaimed:   fsData?.isClaimed  ?? false,
    claimedBy:   fsData?.claimedBy  ?? null,
    claimedAt:   fsData?.claimedAt  ?? null,
    linkedCatId: fsData?.linkedCatId ?? null,
    deviceName:  fsData?.deviceName  ?? id,
  };
}

/**
 * Subscribe realtime ke seluruh devices dari RTDB (ditulis ESP32),
 * lalu enrich dengan claim metadata dari Firestore.
 * Dipakai di DeviceSelectionScreen.
 */
export function useAllDevices() {
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    if (!rtdb) {
      setLoading(false);
      return;
    }

    const devicesRtdbRef = ref(rtdb, 'devices');

    const unsub = onValue(
      devicesRtdbRef,
      (snapshot) => {
        console.log('[RTDB] snapshot received, exists:', snapshot.exists());
        if (!snapshot.exists()) {
          setDevices([]);
          setLoading(false);
          return;
        }

        const rtdbMap = snapshot.val() as Record<string, Record<string, any>>;
        console.log('[RTDB] devices found:', Object.keys(rtdbMap));
        const ids = Object.keys(rtdbMap);

        // Untuk setiap device di RTDB, ambil claim metadata dari Firestore (sekali baca)
        Promise.all(
          ids.map(async (id) => {
            const fsSnap = await getDoc(doc(db, 'devices', id));
            return mergeDevice(id, rtdbMap[id], fsSnap.exists() ? fsSnap.data() : null);
          })
        ).then((merged) => {
          console.log('[RTDB] merged devices:', merged);
          setDevices(merged);
          setLoading(false);
        });
      },
      (error) => {
        console.error('[RTDB] Permission denied or error:', error.message);
        console.error('[RTDB] Cek Rules di Firebase Console → Realtime Database → Rules');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { devices, loading };
}
