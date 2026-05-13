/**
 * App.tsx
 * FINAL FLOW
 */

import { useState } from 'react';

import {
  AuthProvider,
  useAuth,
} from './lib/AuthContext';

import { AuthScreen } from './components/auth/AuthScreen';

import { OnboardingFlow } from './components/onboarding/OnboardingFlow';

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

import { UserRole } from './types';

function AppContent() {
  const { user, profile, loading } =
    useAuth();

  const [currentTab, setCurrentTab] =
    useState('dashboard');

  /**
   * LOADING
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
   * BELUM LOGIN
   */

  if (!user) {
    return <AuthScreen />;
  }

  /**
   * BELUM ADA PROFILE
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
   * ADMIN FLOW
   */

  if (
    profile.role ===
    UserRole.SUPER_ADMIN
  ) {
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
   * USER FLOW
   */

  const appMode =
    localStorage.getItem('appMode');

  /**
   * BELUM PILIH MODE
   */

  if (!appMode) {
    return <MonitoringSelection />;
  }

  /**
   * GUEST MODE
   * MASUK ONBOARDING FLOW
   * TAPI SAVE DI LOCK
   */

  if (appMode === 'guest') {
    return <OnboardingFlow />;
  }

  /**
   * MONITOR MODE
   */

  return (
    <DashboardLayout
      activeTab={currentTab}
      onTabChange={setCurrentTab}
      userRole={profile.role}
    >
      {renderContent()}
    </DashboardLayout>
  );

  /**
   * RENDER CONTENT
   */

  function renderContent() {
    switch (currentTab) {

      case 'dashboard':
        return <Dashboard />;

      case 'feeding-control':
        return <FeedingControl />;

      case 'cat-profile':
        return <CatProfilePage />;

      case 'history':
        return <FeedingHistory />;

      case 'analytics':
        return <Analytics />;

      case 'education':
        return <Education />;

      case 'settings':
        return <DeviceSettings />;

      case 'user-settings':
        return <UserSettings />;

      default:
        return <Dashboard />;
    }
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}