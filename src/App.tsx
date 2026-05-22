import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { DeviceProvider, useDevice } from './lib/DeviceContext';
import { useCatData } from './lib/useCatData';
import { Cpu, Wifi, WifiOff, Database } from 'lucide-react';
import { motion } from 'motion/react';

import { AuthScreen } from './components/auth/AuthScreen';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { FeedingHistory } from './components/history/FeedingHistory';
import { Analytics } from './components/analytics/Analytics';
import { Education } from './components/education/Education';
import { DeviceSettings } from './components/settings/DeviceSettings';
import { UserSettings } from './components/settings/UserSettings';
import { FeedingControl } from './components/control/FeedingControl';
import { CatProfilePage } from './components/profile/CatProfilePage';
import { MonitoringSelection } from './components/onboarding/MonitoringSelection';
import { Notifications } from './components/notifications/Notifications';
import { UserRole } from './types';
import { cn } from './lib/utils';

// ── Device Selection Screen ────────────────────────────────────────────────────

function DeviceSelectionScreen() {
  const { devices, targetOwnerId, loading } = useCatData();
  const { setSelectedDeviceId } = useDevice();

  const candidates = [
    {
      num: 1 as const,
      device: devices.find((d) => d.deviceNumber === 1) ?? devices[0],
      docId: `${targetOwnerId}_device`,
    },
    {
      num: 2 as const,
      device: devices.find((d) => d.deviceNumber === 2) ?? devices[1],
      docId: `${targetOwnerId}_device2`,
    },
  ];

  function pick(docId: string, device?: { id?: string }) {
    setSelectedDeviceId(device?.id ?? docId);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Cpu className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-4xl font-black text-white">Pilih Perangkat</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Kamu memiliki 2 feeder. Pilih yang ingin dimonitor sekarang.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 rounded-full border-4 border-amber-500/30 border-t-amber-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {candidates.map(({ num, device, docId }) => {
              const isOnline = device?.isOnline ?? false;
              const stock = device?.foodStockLevel ?? 0;
              const stockColor = stock > 50 ? 'bg-green-400' : stock > 20 ? 'bg-yellow-400' : 'bg-red-400';
              const label = device?.name ?? `Feeder ESP ${num}`;

              return (
                <motion.button
                  key={num}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => pick(docId, device as any)}
                  className={cn(
                    'text-left p-6 rounded-3xl border-2 transition-colors space-y-4',
                    isOnline
                      ? 'bg-gray-900 border-amber-500/50 hover:border-amber-400'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                  )}
                >
                  {/* Status header */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center">
                      <Cpu className={cn('w-6 h-6', isOnline ? 'text-amber-400' : 'text-gray-500')} />
                    </div>
                    <span className={cn(
                      'flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full',
                      isOnline ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-500'
                    )}>
                      {isOnline
                        ? <><Wifi className="w-3 h-3" /> Online</>
                        : <><WifiOff className="w-3 h-3" /> Offline</>}
                    </span>
                  </div>

                  {/* Name */}
                  <div>
                    <p className="text-xl font-black text-white">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">devices/{docId}</p>
                  </div>

                  {/* Stock */}
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
                        transition={{ duration: 0.6, delay: 0.1 * num }}
                        className={cn('h-full rounded-full', stockColor)}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <div className={cn(
                    'w-full py-3 rounded-2xl text-center text-sm font-black transition-colors',
                    isOnline
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  )}>
                    Pilih Perangkat {num}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">
          Pilihan dapat diubah kapan saja melalui menu Settings.
        </p>
      </div>
    </div>
  );
}

// ── App Content ────────────────────────────────────────────────────────────────

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { selectedDeviceId } = useDevice();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-warm">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-primary rounded-full opacity-20 mb-4" />
          <p className="text-text-main font-medium">Loading FelineGuard...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-warm">
        <p className="text-gray-500">Loading Profile...</p>
      </div>
    );
  }

  const isAdmin = profile.role === UserRole.SUPER_ADMIN;

  // ── Admin: must pick a device first ──────────────────────────────────────────
  if (isAdmin && !selectedDeviceId) {
    return <DeviceSelectionScreen />;
  }

  if (isAdmin) {
    return (
      <DashboardLayout
        activeTab={currentTab}
        onTabChange={setCurrentTab}
        userRole={profile.role?.toUpperCase() as UserRole}
      >
        {renderContent()}
      </DashboardLayout>
    );
  }

  // ── User flow ─────────────────────────────────────────────────────────────────
  const appMode = localStorage.getItem('appMode');

  if (!appMode) return <MonitoringSelection />;

  if (appMode === 'guest') return <OnboardingFlow isAdmin={false} />;

  if (appMode === 'monitor') {
    return (
      <DashboardLayout
        activeTab={currentTab}
        onTabChange={setCurrentTab}
        userRole={profile.role}
      >
        {renderContent()}
      </DashboardLayout>
    );
  }

  return <MonitoringSelection />;

  function renderContent() {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;

      case 'feeding-control':
        if (!isAdmin) return <AccessDenied msg="Fitur hanya untuk Super Admin." />;
        return <FeedingControl />;

      case 'cat-profile':
        return <CatProfilePage />;

      case 'history':
        return <FeedingHistory />;

      case 'analytics':
        return <Analytics />;

      case 'education':
        return <Education />;

      case 'notifications':
        return <Notifications />;

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
