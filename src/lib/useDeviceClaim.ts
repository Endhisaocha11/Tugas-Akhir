import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
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
 * Reset onboardingCompleted ke false agar admin setup ulang jika claim device baru.
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

    transaction.update(userRef, {
      claimedDeviceId:     null,
      onboardingCompleted: false,
    });
  });
}
