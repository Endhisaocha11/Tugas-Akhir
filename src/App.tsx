/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './lib/AuthContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { FeedingHistory } from './components/history/FeedingHistory';
import { Analytics } from './components/analytics/Analytics';
import { Education } from './components/education/Education';
import { DeviceSettings } from './components/settings/DeviceSettings';
import { FeedingControl } from './components/control/FeedingControl';
import { CatProfilePage } from './components/profile/CatProfilePage';
import { useState } from 'react';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFFBF7]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#F59E0B] rounded-full opacity-20 mb-4" />
          <p className="text-[#374151] font-medium">Loading FelineGuard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!profile || !profile.onboardingCompleted) {
    return <OnboardingFlow />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard />;
      case 'feeding-control': return <FeedingControl />;
      case 'cat-profile': return <CatProfilePage />;
      case 'history': return <FeedingHistory />;
      case 'analytics': return <Analytics />;
      case 'education': return <Education />;
      case 'settings': return <DeviceSettings />;
      default: return <Dashboard />;
    }
  };

  return (
    <DashboardLayout activeTab={currentTab} onTabChange={setCurrentTab}>
      {renderContent()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

