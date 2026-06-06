import { useState, useEffect } from 'react';
import {
  Wifi, WifiOff, Database, Scale, Bell,
  ShieldCheck, RefreshCw, Cpu, Save,
  CheckCircle2, AlertTriangle, Zap, Activity,
  Weight, Clock, Loader2, SwitchCamera,
  Settings2, PackageOpen,
} from 'lucide-react';
import { motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '../../lib/firebase';
import { useCatData } from '../../lib/useCatData';
import { useDevice } from '../../lib/DeviceContext';
import { useAuth } from '../../lib/AuthContext';
import { releaseDevice } from '../../lib/useDeviceClaim';
import { cn } from '../../lib/utils';

function DeviceCard({ device, deviceNumber, targetOwnerId }: {
  device: import('../../types').DeviceStatus | undefined;
  deviceNumber: 1 | 2;
  targetOwnerId: string;
}) {
  const isOnline = device?.isOnline ?? false;
  const label = device?.name ?? `Feeder ESP ${deviceNumber}`;
  const docId = deviceNumber === 1 ? `${targetOwnerId}_device` : `${targetOwnerId}_device2`;
  const lastSeen = device?.lastPulse
    ? new Date(device.lastPulse).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

  const stockPct = device?.foodStockLevel ?? 0;
  const stockColor = stockPct > 50 ? 'bg-green-400 text-green-700' : stockPct > 20 ? 'bg-yellow-400 text-yellow-700' : 'bg-red-400 text-red-700';

  return (
    <div className={cn('rounded-3xl border p-5 space-y-4', isOnline ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', isOnline ? 'bg-green-100' : 'bg-gray-100')}>
            <Cpu className={cn('w-5 h-5', isOnline ? 'text-green-600' : 'text-gray-400')} />
          </div>
          <div>
            <p className="font-black text-gray-900">{label}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn('w-2 h-2 rounded-full shrink-0', isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300')} />
              <span className={cn('text-xs font-bold', isOnline ? 'text-green-600' : 'text-gray-400')}>
                {device ? (isOnline ? 'Online' : 'Offline') : 'Belum terhubung'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Terakhir aktif</p>
          <p className="text-xs font-bold text-gray-700 flex items-center gap-1 justify-end mt-0.5">
            <Clock className="w-3 h-3" /> {lastSeen}
          </p>
        </div>
      </div>

      {device && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Stok Pakan', value: `${stockPct}%`, bar: true },
            { label: 'Mangkuk', value: `${device.currentWeightOnScale}g`, bar: false },
            { label: 'Servo', value: device.servoStatus === 'active' ? 'Aktif' : device.servoStatus === 'jammed' ? 'Macet' : 'Siaga', bar: false },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-2.5">
              <p className="text-[10px] text-gray-400">{item.label}</p>
              <p className="text-sm font-black text-gray-800 mt-0.5">{item.value}</p>
              {item.bar && (
                <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(stockPct, 100)}%` }}
                    transition={{ duration: 0.7 }}
                    className={cn('h-full rounded-full', stockColor.split(' ')[0])}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Firestore Path</p>
        <code className="text-xs font-bold text-gray-600 break-all">devices/{docId}</code>
      </div>

      {!device && (
        <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
          <p className="text-xs text-orange-600 font-semibold">
            Tulis ke <code className="font-black">devices/{docId}</code> untuk menghubungkan.
          </p>
        </div>
      )}
    </div>
  );
}

export function DeviceSettings() {
  const { user } = useAuth();
  const { device, devices, targetOwnerId, loading } = useCatData();
  const { selectedDeviceId } = useDevice();

  // Release device
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const handleReleaseDevice = async () => {
    if (!user || !devices[0]?.id) return;
    setReleasing(true);
    setReleaseError(null);
    try {
      await releaseDevice(devices[0].id, user.uid);
      // AuthContext onSnapshot akan update profile.claimedDeviceId → null
      // App.tsx otomatis redirect ke DeviceSelectionScreen
    } catch {
      setReleaseError('Gagal melepas perangkat. Periksa koneksi dan coba lagi.');
      setReleasing(false);
    }
  };

  // Calibration factor — angka untuk kirim, string untuk input agar bisa diketik bebas
  const [calibrationFactor, setCalibrationFactor] = useState<number>(404);
  const [savingCalib, setSavingCalib] = useState(false);
  const [calibSaved, setCalibSaved] = useState(false);

  // Notification preferences — editable, synced from Firestore
  const [notifPrefs, setNotifPrefs] = useState({
    lowStock: true,
    feedSuccess: true,
    servoJam: true,
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Servo test command
  const [testingServo, setTestingServo] = useState(false);

  const deviceDocRef = doc(db, 'devices', `${targetOwnerId}_device`);

  // Sync dari Firestore / RTDB device data
  useEffect(() => {
    if (!device) return;
    const val = (device as any).calibrationFactor ?? 404;
    setCalibrationFactor(val);
    const prefs = (device as any).notifPrefs;
    if (prefs) setNotifPrefs(prefs);
  }, [device]);

  const handleSaveCalibration = async () => {
    setSavingCalib(true);
    try {
      // RTDB dulu — ESP32 baca dari sini via readCalibrationFromRTDB()
      if (rtdb && device?.id) {
        await set(ref(rtdb, `devices/${device.id}/calibration/loadCellFactor`), calibrationFactor);
      }
      // Firestore untuk persistensi (tidak memblokir jika gagal)
      updateDoc(deviceDocRef, { calibrationFactor }).catch(console.error);
      setCalibSaved(true);
      setTimeout(() => setCalibSaved(false), 3000);
    } catch (err) {
      console.error('Gagal simpan kalibrasi:', err);
    } finally {
      setSavingCalib(false);
    }
  };

  const handleToggleNotif = (key: keyof typeof notifPrefs) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotif = async () => {
    setSavingNotif(true);
    try {
      await updateDoc(deviceDocRef, { notifPrefs });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    } catch (err) {
      console.error('Gagal simpan notif:', err);
    } finally {
      setSavingNotif(false);
    }
  };

  const handleTestServo = async () => {
    if (!rtdb || !device?.id) return;
    setTestingServo(true);
    try {
      // Tulis langsung ke RTDB — satu-satunya channel yang dibaca Arduino
      await set(ref(rtdb, `devices/${device.id}/command`), {
        type: 'test_servo',
        status: 'pending',
        requestedAt: Date.now(),
      });
      setTimeout(() => setTestingServo(false), 5000);
    } catch {
      setTestingServo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const isOnline = device?.isOnline ?? false;
  const stockPct = device?.foodStockLevel ?? 0;
  const stockEmpty = stockPct === 0;
  const lastSeen = device?.lastPulse
    ? new Date(device.lastPulse).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const notifOptions = [
    {
      key: 'lowStock' as const,
      icon: Database,
      label: 'Stok Pakan Hampir Habis',
      desc: 'Peringatan muncul di dashboard saat stok < 20%.',
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      key: 'feedSuccess' as const,
      icon: CheckCircle2,
      label: 'Konfirmasi Pemberian Makan',
      desc: 'Notifikasi setiap kali pakan berhasil diberikan.',
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      key: 'servoJam' as const,
      icon: AlertTriangle,
      label: 'Servo Macet',
      desc: 'Peringatan kritis jika mekanisme dispenser terhambat.',
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-8 pb-20 max-w-4xl">

      {/* ── HEADER ── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Pengaturan Perangkat</h2>
          <p className="text-gray-400 mt-1 text-sm">Konfigurasi hardware ESP32 dan preferensi sistem.</p>
        </div>
        {device && (
          <span className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black border',
            isOnline
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          )}>
            <span className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        )}
      </div>

      {/* ── STATUS CARD ── */}
      <div className={cn(
        'rounded-4xl border p-6 relative overflow-hidden',
        isOnline ? 'bg-gray-900' : 'bg-gray-50 border-gray-200'
      )}>
        {isOnline && (
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Wifi className="w-48 h-48 text-white" />
          </div>
        )}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
                isOnline ? 'bg-white/10' : 'bg-gray-100'
              )}>
                {isOnline
                  ? <Cpu className="w-7 h-7 text-amber-400" />
                  : <WifiOff className="w-7 h-7 text-gray-400" />}
              </div>
              <div>
                <p className={cn('font-black text-lg', isOnline ? 'text-white' : 'text-gray-900')}>
                  {device?.id ?? `${targetOwnerId}_device`}
                </p>
                <p className={cn('text-xs font-bold mt-0.5', isOnline ? 'text-gray-400' : 'text-gray-400')}>
                  {isOnline ? '● Terhubung & aktif' : '○ Tidak ada koneksi'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn('text-[10px] font-medium', isOnline ? 'text-gray-500' : 'text-gray-400')}>
                Terakhir aktif
              </p>
              <p className={cn('text-sm font-black mt-0.5 flex items-center gap-1.5 justify-end', isOnline ? 'text-gray-300' : 'text-gray-600')}>
                <Clock className="w-3.5 h-3.5" /> {lastSeen}
              </p>
            </div>
          </div>

          {device ? (
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Stok Pakan',
                  value: `${stockPct}%`,
                  icon: Database,
                  color: stockPct < 20 ? 'text-red-400' : 'text-green-400',
                  bg: isOnline ? 'bg-white/10' : (stockPct < 20 ? 'bg-red-50' : 'bg-green-50'),
                },
                {
                  label: 'Berat Mangkuk',
                  value: `${device.currentWeightOnScale}g`,
                  icon: Weight,
                  color: isOnline ? 'text-blue-300' : 'text-blue-600',
                  bg: isOnline ? 'bg-white/10' : 'bg-blue-50',
                },
                {
                  label: 'Servo',
                  value: device.servoStatus === 'active' ? 'Aktif'
                    : device.servoStatus === 'jammed' ? 'Macet' : 'Siaga',
                  icon: Activity,
                  color: device.servoStatus === 'active'
                    ? 'text-amber-400'
                    : device.servoStatus === 'jammed'
                    ? 'text-red-400'
                    : (isOnline ? 'text-green-400' : 'text-green-600'),
                  bg: isOnline ? 'bg-white/10' : 'bg-green-50',
                },
              ].map((item) => (
                <div key={item.label} className={cn('rounded-2xl p-4 flex items-center gap-3', item.bg)}>
                  <item.icon className={cn('w-5 h-5 shrink-0', item.color)} />
                  <div className="min-w-0">
                    <p className={cn('text-[10px] font-medium truncate', isOnline ? 'text-gray-400' : 'text-gray-500')}>
                      {item.label}
                    </p>
                    <p className={cn('font-black text-base', item.color)}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
              <p className="text-xs text-orange-700 font-semibold">
                ESP32 belum terhubung. Pastikan device menulis ke{' '}
                <code className="font-black">devices/{targetOwnerId}_device</code>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── KALIBRASI HARDWARE ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
            <Settings2 className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="font-black text-xl text-gray-900">Kalibrasi Hardware</h3>
            <p className="text-xs text-gray-400">Load cell & servo motor</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ── Load Cell ── */}
          <div className="bg-white border border-gray-100 rounded-4xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                <Scale className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-black text-gray-900">Load Cell</p>
                <p className="text-xs text-gray-400">Faktor kalibrasi timbangan</p>
              </div>
            </div>

            {/* Tampilan nilai kalibrasi — read only */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Faktor Kalibrasi Aktif</p>
                <p className="text-4xl font-black text-gray-900">{calibrationFactor}</p>
              </div>
              <Scale className="w-10 h-10 text-amber-200" />
            </div>

            <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">RTDB Path</p>
              <code className="text-xs font-bold text-gray-600 break-all">
                devices/&#123;ID&#125;/calibration/loadCellFactor
              </code>
              <p className="text-[11px] text-gray-400 pt-1">
                Default firmware: <span className="font-black text-gray-600">404</span> · Dibaca ESP32 via <code className="font-black">readCalibrationFromRTDB()</code>
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveCalibration}
              disabled={savingCalib}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all',
                calibSaved
                  ? 'bg-green-500 text-white shadow-green-200 shadow-lg'
                  : savingCalib
                  ? 'bg-amber-300 text-white cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-200 shadow-lg hover:shadow-xl'
              )}
            >
              {savingCalib
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan ke ESP32...</>
                : calibSaved
                ? <><CheckCircle2 className="w-4 h-4" /> Tersimpan!</>
                : <><Save className="w-4 h-4" /> Simpan Kalibrasi</>}
            </button>
          </div>

          {/* ── Servo Test ── */}
          <div className="bg-white border border-gray-100 rounded-4xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-black text-gray-900">Uji Servo</p>
                <p className="text-xs text-gray-400">Test siklus buka-tutup dispenser</p>
              </div>
            </div>

            {/* Servo range visual */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                Range Servo Motor
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-gray-500 shrink-0 w-6 text-right">0°</span>
                <div className="flex-1 flex gap-1 h-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={cn(
                      'flex-1 rounded-full',
                      testingServo ? 'bg-amber-400 animate-pulse' : 'bg-amber-400'
                    )} />
                  ))}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i + 6} className="flex-1 rounded-full bg-gray-200" />
                  ))}
                </div>
                <span className="text-sm font-black text-amber-500 shrink-0 w-8">30°</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                <span>Tutup</span>
                <code className="font-black text-amber-500">MAX_SERVO_ANGLE = 30</code>
                <span>Buka maks</span>
              </div>
            </div>

            {/* Banner peringatan stok tidak kosong */}
            {device && !stockEmpty && (
              <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3.5">
                <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <PackageOpen className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-orange-700">
                    Kosongkan wadah pakan dulu!
                  </p>
                  <p className="text-xs text-orange-500 mt-1 leading-relaxed">
                    Stok terdeteksi{' '}
                    <span className="font-black">{stockPct}%</span>. Uji servo saat
                    hopper berisi akan menuang pakan secara tidak terencana.
                    Keluarkan semua pakan, tunggu sensor baca{' '}
                    <span className="font-black">0%</span>, baru uji.
                  </p>
                </div>
              </div>
            )}

            {/* Banner siap test */}
            {device && stockEmpty && !testingServo && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-xs font-bold text-green-700">
                  Wadah kosong — servo siap diuji.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleTestServo}
              disabled={testingServo || !device || !stockEmpty}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all',
                testingServo
                  ? 'bg-blue-100 text-blue-700'
                  : !device || !stockEmpty
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 hover:bg-gray-700 text-white shadow-gray-300 shadow-lg hover:shadow-xl'
              )}
            >
              {testingServo
                ? <><Zap className="w-4 h-4 animate-pulse" /> Mengeksekusi — tunggu ESP32...</>
                : !stockEmpty
                ? <><PackageOpen className="w-4 h-4" /> Kosongkan wadah dulu</>
                : <><RefreshCw className="w-4 h-4" /> Jalankan Test Servo Cycle</>}
            </button>
          </div>
        </div>
      </section>

      {/* ── PREFERENSI NOTIFIKASI ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
              <Bell className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-black text-xl text-gray-900">Preferensi Notifikasi</h3>
              <p className="text-xs text-gray-400">Pilih notifikasi yang ingin ditampilkan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveNotif}
            disabled={savingNotif}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all',
              notifSaved
                ? 'bg-green-500 text-white'
                : savingNotif
                ? 'bg-gray-300 text-white cursor-wait'
                : 'bg-gray-900 hover:bg-gray-700 text-white'
            )}
          >
            {savingNotif
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              : notifSaved
              ? <><CheckCircle2 className="w-4 h-4" /> Tersimpan!</>
              : <><Save className="w-4 h-4" /> Simpan</>}
          </button>
        </div>

        <div className="bg-white rounded-4xl border border-gray-100 divide-y divide-gray-50 shadow-sm overflow-hidden">
          {notifOptions.map((opt) => (
            <div key={opt.key} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                  notifPrefs[opt.key] ? opt.bg : 'bg-gray-50'
                )}>
                  <opt.icon className={cn('w-5 h-5', notifPrefs[opt.key] ? opt.color : 'text-gray-300')} />
                </div>
                <div>
                  <p className={cn('font-bold text-sm', notifPrefs[opt.key] ? 'text-gray-900' : 'text-gray-400')}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Toggle ${opt.label}`}
                onClick={() => handleToggleNotif(opt.key)}
                className={cn(
                  'w-12 h-6 rounded-full relative transition-colors shrink-0',
                  notifPrefs[opt.key] ? 'bg-amber-400' : 'bg-gray-200'
                )}
              >
                <motion.div
                  animate={{ left: notifPrefs[opt.key] ? '26px' : '3px' }}
                  transition={{ type: 'spring', stiffness: 600, damping: 35 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── GANTI PERANGKAT ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
            <SwitchCamera className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className="font-black text-xl text-gray-900">Ganti Perangkat</h3>
            <p className="text-xs text-gray-400">Lepas feeder aktif & klaim yang baru</p>
          </div>
        </div>

        {!showReleaseConfirm ? (
          <div className="bg-gray-50 border border-gray-200 rounded-4xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-gray-800 text-sm">Perangkat aktif:</p>
              <code className="text-base font-black text-gray-700 mt-0.5 block break-all">
                {selectedDeviceId || devices[0]?.id || `${targetOwnerId}_device`}
              </code>
              <p className="text-xs text-gray-400 mt-1">
                Melepas perangkat tidak menghapus profil kucing & jadwal pakan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReleaseConfirm(true)}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-black transition-colors shadow-red-200 shadow-md"
            >
              <SwitchCamera className="w-4 h-4" />
              Lepas &amp; Ganti
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border-2 border-red-200 rounded-4xl p-6 space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="font-black text-lg text-red-800">Konfirmasi Lepas Perangkat</p>
                <p className="text-sm text-red-600 mt-1 leading-relaxed">
                  Perangkat <strong>{devices[0]?.name ?? devices[0]?.id ?? '—'}</strong> akan
                  dilepas dari akun ini. Kamu akan diarahkan ke halaman{' '}
                  <strong>Klaim Perangkat</strong> untuk memilih feeder baru.
                  Profil kucing dan jadwal pakan <strong>tetap tersimpan</strong>.
                </p>
              </div>
            </div>
            {releaseError && (
              <div className="flex items-center gap-2 bg-red-100 rounded-xl px-4 py-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700 font-semibold">{releaseError}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowReleaseConfirm(false); setReleaseError(null); }}
                disabled={releasing}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-sm font-black text-gray-600 hover:bg-white transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReleaseDevice}
                disabled={releasing}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-red-200 shadow-md"
              >
                {releasing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Melepas...</>
                  : <><SwitchCamera className="w-4 h-4" /> Ya, Lepas &amp; Ganti</>}
              </button>
            </div>
          </motion.div>
        )}
      </section>

      {/* ── CLOUD SYNC FOOTER ── */}
      <div className="flex gap-4 p-6 bg-gray-900 rounded-4xl text-white">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <p className="font-black text-base">Cloud Synced via Firebase</p>
          <p className="text-sm text-white/50 mt-1 leading-relaxed">
            Perubahan kalibrasi disimpan ke RTDB & Firestore secara real-time.
            ESP32 membaca dari{' '}
            <code className="text-amber-400 font-black">devices/&#123;ID&#125;/calibration</code>{' '}
            setiap boot.
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs font-black uppercase tracking-widest text-amber-400">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            Active Sync
          </div>
        </div>
      </div>
    </div>
  );
}
