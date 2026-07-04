import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Verifikasi NYATA apakah user ini benar-benar sedang mengklaim sebuah device,
 * dengan query langsung ke koleksi `devices` (claimedBy == uid) — BUKAN dengan
 * percaya field cache `users/{uid}.claimedDeviceId`.
 *
 * Kenapa ini penting: routing di App.tsx sebelumnya memutuskan halaman "Klaim
 * Perangkat" hanya dari `profile.claimedDeviceId` (truthy/falsy). Field itu
 * bisa jadi TIDAK SINKRON dengan kenyataan di koleksi `devices` — misalnya
 * dokumen user dibuat/disalin manual saat testing dengan field ini sudah
 * terisi, atau proses release yang gagal separuh jalan. Akibatnya admin yang
 * SEBENARNYA belum mengklaim device apa pun tetap lolos ke dashboard/
 * onboarding, melewati halaman klaim device sama sekali.
 *
 * Sebagai bonus, kalau terdeteksi ada mismatch (field cache bilang ada device,
 * tapi devices collection bilang tidak ada yang benar-benar diklaim user ini),
 * field cache di `users/{uid}` otomatis dibersihkan (self-heal) agar bagian
 * lain aplikasi yang masih membaca `profile.claimedDeviceId` (mis. link cat ke
 * device di akhir OnboardingFlow) tidak ikut memakai data basi tersebut.
 */
export function useVerifiedDeviceClaim(
  uid: string | undefined,
  cachedClaimedDeviceId: string | null | undefined
) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setDeviceId(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      query(collection(db, 'devices'), where('claimedBy', '==', uid), limit(1)),
      (snap) => {
        const realId = snap.empty ? null : snap.docs[0].id;
        setDeviceId(realId);
        setLoading(false);

        // Self-heal: field cache bilang ada klaim, tapi ternyata tidak ada
        // device yang benar-benar diklaim user ini di Firestore.
        if (!realId && cachedClaimedDeviceId) {
          updateDoc(doc(db, 'users', uid), { claimedDeviceId: null }).catch(() => {});
        }
      },
      () => setLoading(false)
    );

    return unsub;
  }, [uid, cachedClaimedDeviceId]);

  return { deviceId, loading };
}

/**
 * Mengklaim sebuah device secara atomic.
 * Jika dokumen Firestore belum ada (device baru dari RTDB), otomatis dibuat dulu.
 * Gagal jika device sudah diklaim admin lain.
 */
export async function claimDevice(deviceId: string, userId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const deviceRef = doc(db, 'devices', deviceId);
    const userRef   = doc(db, 'users', userId);

    const deviceSnap = await transaction.get(deviceRef);

    // Sudah diklaim admin lain → tolak
    if (deviceSnap.exists() && deviceSnap.data().isClaimed) {
      throw new Error('already_claimed');
    }

    const claimData = {
      isClaimed:  true,
      claimedBy:  userId,
      claimedAt:  serverTimestamp(),
    };

    if (!deviceSnap.exists()) {
      // Device baru dari RTDB — buat dokumen Firestore sekarang
      transaction.set(deviceRef, {
        id:                   deviceId,
        ...claimData,
        linkedCatId:          null,
        deviceName:           deviceId,
        // Placeholder telemetri (akan di-overwrite RTDB listener di app)
        isOnline:             false,
        lastPulse:            0,
        foodStockLevel:       0,
        currentWeightOnScale: 0,
        servoStatus:          'idle',
        calibrationFactor:    0,
      });
    } else {
      transaction.update(deviceRef, claimData);
    }

    transaction.update(userRef, {
      claimedDeviceId: deviceId,
    });
  });
}

/**
 * Melepas device dari admin.
 * Hanya reset claimedDeviceId — profil kucing & onboarding TETAP tersimpan
 * sehingga setelah klaim device baru langsung masuk dashboard.
 */
export async function releaseDevice(deviceId: string, userId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const deviceRef = doc(db, 'devices', deviceId);
    const userRef   = doc(db, 'users', userId);

    const deviceSnap = await transaction.get(deviceRef);
    if (!deviceSnap.exists()) throw new Error('not_found');
    if (deviceSnap.data().claimedBy !== userId) throw new Error('not_owner');

    transaction.update(deviceRef, {
      isClaimed:   false,
      claimedBy:   null,
      claimedAt:   null,
      linkedCatId: null,
    });

    // Hanya reset claimedDeviceId — onboardingCompleted TIDAK diubah
    transaction.update(userRef, {
      claimedDeviceId: null,
    });
  });
}

/**
 * Melepas SEMUA device dalam satu batch — LINTAS AKUN.
 *
 * Ini sengaja dibuat sebagai aksi reset level ROOT/pengelola sistem: siapa
 * pun yang berstatus SUPER_ADMIN boleh menjalankan ini untuk melepas device
 * milik SIAPA SAJA (bukan cuma device miliknya sendiri). Firestore rules
 * (`match /devices/{deviceId}`) sudah disesuaikan untuk mengizinkan ini
 * khusus untuk aksi MELEPAS (claimedBy → null); mengklaim/merebut device
 * tetap dibatasi hanya boleh untuk device yang belum diklaim atau milik
 * sendiri.
 *
 * deviceIds = semua ID yang diketahui (dari RTDB maupun Firestore).
 * Device yang belum punya dokumen Firestore di-skip (tidak perlu diapa-apakan).
 *
 * CATATAN: akun LAIN yang device-nya ikut dilepas di sini tidak langsung
 * ter-update field `users/{uid}.claimedDeviceId`-nya (Firestore rules users/
 * hanya izinkan update dokumen milik sendiri). Field itu akan otomatis
 * dibersihkan sendiri (self-heal) lewat `useVerifiedDeviceClaim` begitu
 * pemilik device tsb login lagi dan app memverifikasi ulang ke `devices`
 * collection — jadi tetap konsisten walau butuh satu kali refresh dari sisi
 * pemilik.
 */
export async function releaseAllDevices(userId: string, deviceIds: string[]): Promise<number> {
  if (deviceIds.length === 0) return 0;

  // Baca semua dokumen Firestore sekaligus untuk tahu mana yang exist
  const snaps = await Promise.all(
    deviceIds.map((id) => getDoc(doc(db, 'devices', id)))
  );

  const batch = writeBatch(db);
  let count = 0;

  snaps.forEach((snap) => {
    if (!snap.exists()) return;
    batch.update(snap.ref, {
      isClaimed:   false,
      claimedBy:   null,
      claimedAt:   null,
      linkedCatId: null,
    });
    count++;
  });

  if (count === 0) return 0;

  // Hanya reset user yang sedang login (tidak boleh update doc user lain per Firestore rules) —
  // pemilik device lain yang ikut dilepas akan self-heal sendiri saat login berikutnya.
  batch.update(doc(db, 'users', userId), {
    claimedDeviceId: null,
  });

  await batch.commit();
  return count;
}