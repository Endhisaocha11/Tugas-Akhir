import { useState } from 'react';
import { useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { DeviceProvider } from './lib/DeviceContext';
import { Cpu, Wifi, WifiOff, Database, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CatLoader } from './components/ui/CatLoader';
import { ErrorPage } from './components/ui/ErrorPage';

import { AuthScreen } from './components/auth/AuthScreen';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Lazy load semua halaman berat — hanya di-download saat dibutuhkan
const OnboardingFlow = lazy(() => import('./components/onboarding/OnboardingFlow'));
const MonitoringSelection = lazy(() => import('./components/onboarding/MonitoringSelection').then(m => ({ default: m.MonitoringSelection })));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const FeedingHistory = lazy(() => import('./components/history/FeedingHistory').then(m => ({ default: m.FeedingHistory })));
const Education = lazy(() => import('./components/education/Education').then(m => ({ default: m.Education })));
const DeviceSettings = lazy(() => import('./components/settings/DeviceSettings').then(m => ({ default: m.DeviceSettings })));
const UserSettings = lazy(() => import('./components/settings/UserSettings').then(m => ({ default: m.UserSettings })));
const FeedingControl = lazy(() => import('./components/control/FeedingControl').then(m => ({ default: m.FeedingControl })));
const CatProfilePage = lazy(() => import('./components/profile/CatProfilePage').then(m => ({ default: m.CatProfilePage })));
const Analytics = lazy(() => import('./components/analytics/Analytics').then(m => ({ default: m.Analytics })));
const Notifications = lazy(() => import('./components/notifications/Notifications').then(m => ({ default: m.Notifications })));
import { UserRole, DeviceStatus } from './types';
import { cn } from './lib/utils';
import { useAllDevices, getDeviceStatus } from './lib/useDevices';
import { claimDevice, useVerifiedDeviceClaim } from './lib/useDeviceClaim';

// ── Device Selection Screen ────────────────────────────────────────────────────

function DeviceCard({
  device,
  myUid,
  onClaim,
  claiming,
}: {
  device: DeviceStatus;
  myUid: string;
  onClaim: (deviceId: string) => void;
  claiming: boolean;
}) {
  const status = getDeviceStatus(device, myUid);
  const isOnline = device.isOnline ?? false;
  const stock = device.foodStockLevel ?? 0;
  const label = device.deviceName ?? device.name ?? device.id;

  const isAvailable = status === 'available';
  const isUsed = status === 'used';

  const stockColor = stock > 50 ? 'bg-green-400' : stock > 20 ? 'bg-yellow-400' : 'bg-red-400';

  const statusBadge = {
    available: { text: 'Tersedia', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
    used: { text: 'Sedang Digunakan', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    connected: { text: 'Milikmu — Online', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    offline: { text: 'Milikmu — Offline', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  }[status];

  return (
    <motion.div
      whileHover={isAvailable ? { scale: 1.02 } : {}}
      className={cn(
        'relative p-6 rounded-3xl border-2 space-y-5 transition-colors',
        isAvailable ? 'bg-gray-900 border-amber-500/40 hover:border-amber-400' : '',
        isUsed ? 'bg-gray-900/50 border-gray-800 opacity-60' : '',
      )}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <div className={cn('w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center')}>
          {isUsed
            ? <Lock className="w-5 h-5 text-gray-500" />
            : <Cpu className={cn('w-6 h-6', isOnline ? 'text-amber-400' : 'text-gray-500')} />}
        </div>
        <span className={cn('flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full border', statusBadge.cls)}>
          {statusBadge.text}
        </span>
      </div>

      {/* Device name */}
      <div>
        <p className="text-xl font-black text-white">{label}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn('w-2 h-2 rounded-full shrink-0', isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-600')} />
          <span className="text-xs text-gray-500 font-mono">{device.id}</span>
        </div>
      </div>

      {/* Food stock */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Database className="w-3 h-3" /> Stok Pakan
          </span>
          <span className="text-xs font-black text-gray-300">{stock}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stock}%` }}
            transition={{ duration: 0.6 }}
            className={cn('h-full rounded-full', stockColor)}
          />
        </div>
      </div>

      {/* Online indicator */}
      <div className="flex items-center gap-1.5">
        {isOnline
          ? <><Wifi className="w-3.5 h-3.5 text-green-400" /><span className="text-xs text-green-400 font-bold">Online</span></>
          : <><WifiOff className="w-3.5 h-3.5 text-gray-600" /><span className="text-xs text-gray-500 font-bold">Offline</span></>}
      </div>

      {/* CTA button */}
      {isAvailable ? (
        <button
          type="button"
          disabled={claiming}
          onClick={() => onClaim(device.id)}
          className={cn(
            'w-full py-3.5 rounded-2xl text-sm font-black transition-all',
            claiming
              ? 'bg-amber-500/50 text-white cursor-wait'
              : 'bg-amber-500 hover:bg-amber-400 text-white'
          )}
        >
          {claiming ? 'Mengklaim...' : 'Klaim Perangkat'}
        </button>
      ) : (
        <div className="w-full py-3.5 rounded-2xl text-sm font-black text-center bg-gray-800 text-gray-500 cursor-not-allowed flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5" /> Tidak Tersedia
        </div>
      )}
    </motion.div>
  );
}

function DeviceSelectionScreen() {
  const { user } = useAuth();
  const { devices, loading } = useAllDevices();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleClaim(deviceId: string) {
    if (!user) return;
    setClaimingId(deviceId);
    setError(null);
    try {
      await claimDevice(deviceId, user.uid);
      setSuccess(true);
      // AuthContext onSnapshot akan auto-update profile.claimedDeviceId
      // → routing otomatis pindah ke OnboardingFlow
    } catch (e: any) {
      if (e.message === 'already_claimed') {
        setError('Device baru saja diklaim admin lain. Silakan pilih device lain.');
      } else if (e.message === 'not_found') {
        setError('Device tidak ditemukan di database.');
      } else {
        setError('Gagal mengklaim device. Periksa koneksi dan coba lagi.');
      }
      setClaimingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Cpu className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-4xl font-black text-white">Klaim Perangkat</h1>
          <p className="text-gray-400 mt-2 text-sm max-w-sm mx-auto leading-relaxed">
            Pilih perangkat ESP32 yang tersedia untuk dipasangkan dengan akun Anda.
            Satu perangkat hanya bisa digunakan oleh satu admin.
          </p>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-5 py-4 text-sm font-semibold"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl px-5 py-4 text-sm font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Perangkat berhasil diklaim! Menyiapkan profil kucing...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Device grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-4 border-amber-500/30 border-t-amber-400 animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-16 bg-gray-900 rounded-3xl border border-gray-800">
            <Cpu className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">Belum ada perangkat terdaftar</p>
            <p className="text-gray-600 text-sm mt-1">Hubungi pengelola sistem untuk mendaftarkan ESP32.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                myUid={user?.uid ?? ''}
                onClaim={handleClaim}
                claiming={claimingId === device.id}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-700 mt-6">
          Device dapat dilepas kapan saja melalui menu Settings → Lepas Device.
        </p>
      </div>
    </div>
  );
}

// ── App Content ────────────────────────────────────────────────────────────────

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [loadError, setLoadError] = useState(false);
  const [profileError, setProfileError] = useState(false);

  const isAdmin = profile?.role === UserRole.SUPER_ADMIN;

  // Verifikasi NYATA ke koleksi `devices` — jangan percaya begitu saja field
  // cache `profile.claimedDeviceId`. Lihat komentar di useVerifiedDeviceClaim
  // untuk kenapa ini perlu (field cache bisa basi/tidak sinkron, sehingga admin
  // yang sebenarnya belum klaim device apa pun bisa ke-skip dari halaman
  // "Klaim Perangkat" langsung ke dashboard/onboarding).
  // Dipanggil di paling atas (sebelum early return manapun) supaya urutan hook
  // konsisten di setiap render — memanggilnya setelah early return akan
  // melanggar Rules of Hooks dan bisa bikin React error saat transisi
  // loading → loaded ("Rendered more hooks than during the previous render").
  const { deviceId: verifiedDeviceId, loading: deviceCheckLoading } =
    useVerifiedDeviceClaim(isAdmin ? user?.uid : undefined, profile?.claimedDeviceId);

  // Timeout untuk Firebase auth + Firestore awal (saat app pertama load)
  useEffect(() => {
    if (!loading) { setLoadError(false); return; }
    const t = setTimeout(() => setLoadError(true), 12000);
    return () => clearTimeout(t);
  }, [loading]);

  // Timeout terpisah: user sudah login tapi profil Firestore tidak kunjung muncul.
  // Ini terjadi jika Firestore rules salah, jaringan lambat, atau doc belum terbuat.
  useEffect(() => {
    if (loading || !user || profile) { setProfileError(false); return; }
    const t = setTimeout(() => setProfileError(true), 10000);
    return () => clearTimeout(t);
  }, [loading, user, profile]);

  if (loadError || profileError) {
    return <ErrorPage onRetry={() => {
      setLoadError(false);
      setProfileError(false);
      window.location.reload();
    }} />;
  }

  if (loading) return <CatLoader />;

  if (!user) return <AuthScreen />;

  if (!profile) return <CatLoader text="Memuat profil kamu..." />;

  // Tunggu verifikasi selesai dulu sebelum memutuskan routing, supaya tidak
  // sempat "flash" ke Dashboard/Onboarding lalu balik lagi ke DeviceSelectionScreen.
  if (isAdmin && deviceCheckLoading) return <CatLoader />;

  // ── Admin: belum klaim device → pilih device ──────────────────────────────────
  if (isAdmin && !verifiedDeviceId) {
    return <DeviceSelectionScreen />;
  }

  // ── Admin: sudah klaim device, belum setup profil kucing → onboarding ─────────
  if (isAdmin && !profile.onboardingCompleted) {
    return (
      <Suspense fallback={<CatLoader />}>
        <OnboardingFlow isAdmin={true} />
      </Suspense>
    );
  }

  if (isAdmin) {
    return (
      <DashboardLayout
        activeTab={currentTab}
        onTabChange={setCurrentTab}
        userRole={profile.role?.toUpperCase() as UserRole}
      >
        <Suspense fallback={<CatLoader />}>
          {renderContent()}
        </Suspense>
      </DashboardLayout>
    );
  }

  // ── User flow ─────────────────────────────────────────────────────────────────

  if (!localStorage.getItem('appMode') && profile?.monitoringAdminId && !sessionStorage.getItem('skipAutoRestore')) {
    localStorage.setItem('appMode', 'monitor');
    localStorage.setItem('selectedAdminId', profile.monitoringAdminId);
    if (profile.monitoringAdminEmail) {
      localStorage.setItem('selectedAdminEmail', profile.monitoringAdminEmail);
    }
  }

  const appMode = localStorage.getItem('appMode');

  if (!appMode) return (
    <Suspense fallback={<CatLoader />}>
      <MonitoringSelection />
    </Suspense>
  );

  if (appMode === 'guest') return (
    <Suspense fallback={<CatLoader />}>
      <OnboardingFlow isAdmin={false} />
    </Suspense>
  );

  if (appMode === 'monitor') {
    return (
      <DashboardLayout
        activeTab={currentTab}
        onTabChange={setCurrentTab}
        userRole={profile.role}
      >
        <Suspense fallback={<CatLoader />}>
          {renderContent()}
        </Suspense>
      </DashboardLayout>
    );
  }

  return (
    <Suspense fallback={<CatLoader />}>
      <MonitoringSelection />
    </Suspense>
  );

  function renderContent() {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;

      case 'feeding-control':
        if (!isAdmin) return <AccessDenied msg="Fitur hanya untuk Super Admin." />;
        return <FeedingControl />;

      case 'cat-profile':
        return <CatProfilePage />;

      case 'analytics':
        return <Analytics />;

      case 'history':
        return <FeedingHistory />;

      case 'education':
        return <Education />;

      case 'notifications':
        return <Notifications onNavigate={setCurrentTab} />;

      case 'onboarding-flow':
        if (!isAdmin) return <AccessDenied msg="Hanya admin yang dapat mengubah data feeder." />;
        return <OnboardingFlow isAdmin={true} />;

      case 'settings':
        if (!isAdmin) return <AccessDenied msg="Settings hanya untuk admin." />;
        return <DeviceSettings />;

      case 'user-settings':
        if (!isAdmin) return <AccessDenied msg="User Settings hanya untuk admin." />;
        return <UserSettings />;

      default:
        return <Dashboard />;
    }
  }
}

function AccessDenied({ msg }: { msg: string }) {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-gray-500 mt-2">{msg}</p>
    </div>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <AppContent />
      </DeviceProvider>
    </AuthProvider>
  );
}