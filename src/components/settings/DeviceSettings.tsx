import { useState, useEffect } from 'react';
import {
  Wifi, WifiOff, Database, Scale, Bell,
  ShieldCheck, RefreshCw, Cpu, Save,
  CheckCircle2, AlertTriangle, Zap, Activity,
  Weight, Clock, Loader2, SwitchCamera,
} from 'lucide-react';
import { motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useCatData } from '../../lib/useCatData';
import { useDevice } from '../../lib/DeviceContext';
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
  const { device, devices, targetOwnerId, loading } = useCatData();
  const { selectedDeviceId, setSelectedDeviceId } = useDevice();

  // Calibration factor — editable, synced from Firestore
  const [calibrationFactor, setCalibrationFactor] = useState<number>(1.0);
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

  // Sync from Firestore device data
  useEffect(() => {
    if (!device) return;
    setCalibrationFactor((device as any).calibrationFactor ?? 1.0);
    const prefs = (device as any).notifPrefs;
    if (prefs) setNotifPrefs(prefs);
  }, [device]);

  const handleSaveCalibration = async () => {
    setSavingCalib(true);
    try {
      await updateDoc(deviceDocRef, { calibrationFactor });
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
    setTestingServo(true);
    try {
      await updateDoc(deviceDocRef, { command: 'test_servo' });
      setTimeout(() => setTestingServo(false), 3000);
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
  const lastSeen = device?.lastPulse
    ? new Date(device.lastPulse).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const notifOptions = [
    {
      key: 'lowStock' as const,
      label: 'Stok Pakan Hampir Habis',
      desc: 'Notifikasi ketika stok di bawah 20%.',
    },
    {
      key: 'feedSuccess' as const,
      label: 'Konfirmasi Pemberian Makan',
      desc: 'Notifikasi setiap kali pakan berhasil diberikan.',
    },
    {
      key: 'servoJam' as const,
      label: 'Servo Macet',
      desc: 'Peringatan kritis jika mekanisme dispenser terhambat.',
    },
  ];

  return (
    <div className="space-y-10 pb-20 max-w-4xl">

      {/* ── HEADER ── */}
      <div>
        <h2 className="text-3xl font-black text-gray-900">Pengaturan Perangkat</h2>
        <p className="text-gray-400 mt-1">Konfigurasi hardware ESP32 dan preferensi sistem.</p>
      </div>

      {/* ── CONNECTION STATUS ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Wifi className="w-5 h-5 text-blue-500" />
          <h3 className="font-black text-xl text-gray-900">Status Koneksi</h3>
        </div>

        <div className={cn(
          'rounded-3xl border p-6 flex items-center justify-between gap-4',
          isOnline ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
              isOnline ? 'bg-green-100' : 'bg-gray-100'
            )}>
              {isOnline
                ? <Cpu className="w-7 h-7 text-green-600" />
                : <WifiOff className="w-7 h-7 text-gray-400" />}
            </div>
            <div>
              <p className="font-black text-lg text-gray-900">
                {device?.id ?? `${targetOwnerId}_device`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                )} />
                <span className={cn(
                  'text-sm font-bold',
                  isOnline ? 'text-green-600' : 'text-gray-400'
                )}>
                  {isOnline ? 'Online — Terhubung' : 'Offline — Tidak ada koneksi'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400 font-medium">Terakhir aktif</p>
            <p className="text-sm font-black text-gray-700 mt-0.5 flex items-center gap-1.5 justify-end">
              <Clock className="w-3.5 h-3.5" />
              {lastSeen}
            </p>
          </div>
        </div>

        {/* Live metrics strip */}
        {device && (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Stok Pakan',
                value: `${device.foodStockLevel}%`,
                icon: Database,
                color: device.foodStockLevel < 20 ? 'text-red-500' : 'text-green-600',
                bg: device.foodStockLevel < 20 ? 'bg-red-50' : 'bg-green-50',
              },
              {
                label: 'Berat Mangkok',
                value: `${device.currentWeightOnScale}g`,
                icon: Weight,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Status Servo',
                value: device.servoStatus === 'active' ? 'Aktif'
                  : device.servoStatus === 'jammed' ? 'Macet' : 'Siaga',
                icon: Activity,
                color: device.servoStatus === 'active' ? 'text-amber-600'
                  : device.servoStatus === 'jammed' ? 'text-red-600' : 'text-green-600',
                bg: device.servoStatus === 'active' ? 'bg-amber-50'
                  : device.servoStatus === 'jammed' ? 'bg-red-50' : 'bg-green-50',
              },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', item.bg)}>
                  <item.icon className={cn('w-5 h-5', item.color)} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                  <p className={cn('font-black text-base', item.color)}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!device && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4">
            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
            <p className="text-sm text-orange-700 font-semibold">
              Perangkat belum terhubung. ESP32 perlu menulis ke path <code className="font-black">devices/{targetOwnerId}_device</code> di Firestore.
            </p>
          </div>
        )}
      </section>

      {/* ── HARDWARE CALIBRATION ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Scale className="w-5 h-5 text-amber-500" />
          <h3 className="font-black text-xl text-gray-900">Kalibrasi Hardware</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Load cell calibration */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Load Cell — Faktor Kalibrasi</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={calibrationFactor}
                step={0.001}
                min={0.1}
                max={10}
                title="Faktor kalibrasi load cell"
                aria-label="Faktor kalibrasi load cell"
                placeholder="1.000"
                onChange={(e) => setCalibrationFactor(parseFloat(e.target.value) || 1)}
                className="flex-1 text-3xl font-black text-gray-900 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <p className="text-xs text-gray-400">
              Nilai ini dibaca ESP32 dari Firestore saat startup. Ubah jika timbangan tidak akurat.
            </p>
            <button
              type="button"
              onClick={handleSaveCalibration}
              disabled={savingCalib}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-colors',
                calibSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              )}
            >
              {savingCalib
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                : calibSaved
                ? <><CheckCircle2 className="w-4 h-4" /> Tersimpan ke Firestore</>
                : <><Save className="w-4 h-4" /> Simpan ke Firestore</>}
            </button>
          </div>

          {/* Servo test */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Uji Servo</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-3xl font-black text-gray-900">0°</span>
              <div className="flex-1 flex gap-1 h-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={cn('flex-1 rounded-full', i < 9 ? 'bg-amber-400' : 'bg-gray-100')} />
                ))}
              </div>
              <span className="text-3xl font-black text-gray-900">180°</span>
            </div>
            <p className="text-xs text-gray-400">
              Kirim perintah test ke ESP32 via Firestore (field <code className="font-black">command: "test_servo"</code>).
            </p>
            <button
              type="button"
              onClick={handleTestServo}
              disabled={testingServo || !device}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-colors',
                testingServo
                  ? 'bg-green-100 text-green-700'
                  : !device
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 hover:bg-gray-700 text-white'
              )}
            >
              {testingServo
                ? <><Zap className="w-4 h-4 animate-pulse" /> Perintah terkirim — tunggu ESP32...</>
                : <><RefreshCw className="w-4 h-4" /> Test Servo Cycle</>}
            </button>
          </div>
        </div>
      </section>

      {/* ── NOTIFICATION PREFERENCES ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-500" />
            <h3 className="font-black text-xl text-gray-900">Preferensi Notifikasi</h3>
          </div>
          <button
            type="button"
            onClick={handleSaveNotif}
            disabled={savingNotif}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-colors',
              notifSaved
                ? 'bg-green-500 text-white'
                : 'bg-gray-900 hover:bg-gray-700 text-white'
            )}
          >
            {savingNotif
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              : notifSaved
              ? <><CheckCircle2 className="w-4 h-4" /> Tersimpan</>
              : <><Save className="w-4 h-4" /> Simpan</>}
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-5 shadow-sm">
          {notifOptions.map((opt) => (
            <div key={opt.key} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  notifPrefs[opt.key] ? 'bg-amber-50' : 'bg-gray-50'
                )}>
                  <Bell className={cn('w-5 h-5', notifPrefs[opt.key] ? 'text-amber-500' : 'text-gray-300')} />
                </div>
                <div>
                  <p className="font-bold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Toggle ${opt.label}`}
                onClick={() => handleToggleNotif(opt.key)}
                className={cn(
                  'w-12 h-6 rounded-full relative transition-colors shrink-0 mt-1',
                  notifPrefs[opt.key] ? 'bg-amber-400' : 'bg-gray-200'
                )}
              >
                <motion.div
                  animate={{ left: notifPrefs[opt.key] ? '50%' : '4px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 px-1">
          Preferensi ini disimpan di Firestore dan dibaca oleh app saat menampilkan notifikasi.
        </p>
      </section>

      {/* ── DEVICE MANAGEMENT ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-purple-500" />
            <h3 className="font-black text-xl text-gray-900">Perangkat Aktif</h3>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDeviceId('')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold transition-colors"
          >
            <SwitchCamera className="w-4 h-4" />
            Ganti Perangkat
          </button>
        </div>
        <p className="text-sm text-gray-400">
          ID perangkat yang sedang aktif dimonitor. Klik &quot;Ganti Perangkat&quot; untuk beralih ke feeder lain.
        </p>

        {/* Selected device info */}
        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-5 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Device ID Aktif</p>
          <code className="text-base font-black text-gray-800 break-all block">
            {selectedDeviceId || `${targetOwnerId}_device`}
          </code>
          <div className="h-px bg-gray-200" />
          {(() => {
            const activeDevice = devices.find((d) => d.id === selectedDeviceId) ?? devices[0];
            const num = activeDevice?.deviceNumber ?? 1;
            return (
              <DeviceCard
                device={activeDevice}
                deviceNumber={num as 1 | 2}
                targetOwnerId={targetOwnerId}
              />
            );
          })()}
        </div>
      </section>

      {/* ── CLOUD SYNC INFO ── */}
      <div className="flex gap-4 p-6 bg-gray-900 rounded-3xl text-white">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <p className="font-black text-lg">Cloud Synced via Firestore</p>
          <p className="text-sm text-white/60 mt-1 leading-relaxed">
            Semua perubahan disimpan ke Firestore secara real-time. ESP32 membaca konfigurasi dari path{' '}
            <code className="text-amber-400 font-black">devices/{targetOwnerId}_device</code> setiap boot dan saat ada perubahan.
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
