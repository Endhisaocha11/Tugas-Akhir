import { doc, getDoc, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

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
 * Melepas SEMUA device dalam satu batch.
 * deviceIds = semua ID yang diketahui (dari RTDB maupun Firestore).
 * Setiap device yang ada di Firestore di-reset claim-nya;
 * device yang belum punya dokumen Firestore di-skip (tidak perlu diapa-apakan).
 * User yang bersangkutan juga di-reset claimedDeviceId-nya.
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

  // Hanya reset user yang sedang login (tidak boleh update doc user lain per Firestore rules)
  batch.update(doc(db, 'users', userId), {
    claimedDeviceId: null,
  });

  await batch.commit();
  return count;
}