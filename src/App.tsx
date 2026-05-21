/**
 * App.tsx
 * FINAL ROLE FLOW FIXED
 */

import { useState } from 'react';

import {
  AuthProvider,
  useAuth,
} from './lib/AuthContext';

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

function AppContent() {

  const {
    user,
    profile,
    loading,
  } = useAuth();

  const [currentTab, setCurrentTab] =
    useState('dashboard');

  /**
   * =====================================
   * LOADING
   * =====================================
   */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-warm">

        <div className="animate-pulse flex flex-col items-center">

          <div className="w-16 h-16 bg-primary rounded-full opacity-20 mb-4" />

          <p className="text-text-main font-medium">
            Loading FelineGuard...
          </p>

        </div>
      </div>
    );
  }

  /**
   * =====================================
   * BELUM LOGIN
   * =====================================
   */

  if (!user) {
    return <AuthScreen />;
  }

  /**
   * =====================================
   * BELUM ADA PROFILE
   * =====================================
   */

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-warm">

        <p className="text-gray-500">
          Loading Profile...
        </p>

      </div>
    );
  }

  /**
   * =====================================
   * ROLE CHECK
   * =====================================
   */

  const isAdmin =
    profile.role === UserRole.SUPER_ADMIN;

  /**
   * =====================================
   * SUPER ADMIN FLOW
   * =====================================
   */

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

  /**
   * =====================================
   * USER FLOW
   * =====================================
   */

  const appMode =
    localStorage.getItem('appMode');

  console.log('ROLE:', profile.role);

  console.log('APP MODE:', appMode);

  /**
   * USER BELUM PILIH MODE
   */

  if (!appMode) {
    return <MonitoringSelection />;
  }

  /**
   * =====================================
   * USER TRIAL MODE
   * =====================================
   */

  if (appMode === 'guest') {

    return (
      <OnboardingFlow
        isAdmin={false}
      />
    );
  }

  /**
   * =====================================
   * USER MONITOR MODE
   * =====================================
   */

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

  /**
   * =====================================
   * FALLBACK
   * =====================================
   */

  return <MonitoringSelection />;

  /**
   * =====================================
   * RENDER CONTENT
   * =====================================
   */

  function renderContent() {

    switch (currentTab) {

      /**
       * DASHBOARD
       */

      case 'dashboard':
        return <Dashboard />;

      /**
       * FEEDING CONTROL
       * ADMIN ONLY
       */

      case 'feeding-control':

        if (!isAdmin) {

          return (
            <div className="p-10">

              <h1 className="text-2xl font-bold">
                Access Denied
              </h1>

              <p className="text-gray-500 mt-2">
                Fitur hanya untuk Super Admin.
              </p>

            </div>
          );
        }

        return <FeedingControl />;

      /**
       * CAT PROFILE
       */

      case 'cat-profile':
        return <CatProfilePage />;

      /**
       * HISTORY
       */

      case 'history':
        return <FeedingHistory />;

      /**
       * ANALYTICS
       */

      case 'analytics':
        return <Analytics />;

      /**
       * EDUCATION
       */

      case 'education':
        return <Education />;

      /**
       * NOTIFICATIONS
       */

      case 'notifications':
        return <Notifications />;

      /**
       * ONBOARDING FLOW
       * ADMIN ONLY
       */

      case 'onboarding-flow':

        if (!isAdmin) {

          return (
            <div className="p-10">

              <h1 className="text-2xl font-bold">
                Access Denied
              </h1>

              <p className="text-gray-500 mt-2">
                Hanya admin yang dapat mengubah data feeder.
              </p>

            </div>
          );
        }

        return (
          <OnboardingFlow
            isAdmin={true}
          />
        );

      /**
       * DEVICE SETTINGS
       * ADMIN ONLY
       */

      case 'settings':

        if (!isAdmin) {

          return (
            <div className="p-10">

              <h1 className="text-2xl font-bold">
                Access Denied
              </h1>

              <p className="text-gray-500 mt-2">
                Settings hanya untuk admin.
              </p>

            </div>
          );
        }

        return <DeviceSettings />;

      /**
       * USER SETTINGS
       * ADMIN ONLY
       */

      case 'user-settings':

        if (!isAdmin) {

          return (
            <div className="p-10">

              <h1 className="text-2xl font-bold">
                Access Denied
              </h1>

              <p className="text-gray-500 mt-2">
                User Settings hanya untuk admin.
              </p>

            </div>
          );
        }

        return <UserSettings />;

      /**
       * DEFAULT
       */

      default:
        return <Dashboard />;
    }
  }
}

/**
 * =====================================
 * APP ROOT
 * =====================================
 */

export default function App() {

  return (
    <AuthProvider>

      <AppContent />

    </AuthProvider>
  );
}