import React from 'react';

import {
  LayoutDashboard,
  Utensils,
  Cat,
  History,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  Bell,
  Users,
  Clock,
  Radio,
} from 'lucide-react';

import { motion } from 'framer-motion';

import { useAuth } from '../../lib/AuthContext';
import { auth } from '../../lib/firebase';
import { UserRole } from '../../types';
import { cn } from '../../lib/utils';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

// =========================
// SIDEBAR MENU
// =========================
const sidebarItems: SidebarItem[] = [
    {
      id: 'onboarding-flow',
      label: 'Onboarding Flow',
      icon: BookOpen,
      adminOnly: true,
    },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'feeding-control',
    label: 'Feeding Control',
    icon: Utensils,
    adminOnly: true,
  },
  {
    id: 'cat-profile',
    label: 'Cat Profile',
    icon: Cat,
  },
  {
    id: 'history',
    label: 'Feeding History',
    icon: History,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    id: 'education',
    label: 'FLUTD Education',
    icon: BookOpen,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    adminOnly: true,
  },
  {
    id: 'user-settings',
    label: 'User Settings',
    icon: Users,
    adminOnly: true,
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (id: string) => void;
  userRole?: UserRole;
}

export function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  userRole = UserRole.USER,
}: DashboardLayoutProps) {
  const { user } = useAuth();

  // =========================
  // ROLE
  // =========================
  const isAdmin =
    userRole === UserRole.SUPER_ADMIN;

  // =========================
  // FILTER MENU
  // =========================
  const filteredItems =
    sidebarItems.filter((item) => {
      if (
        item.adminOnly &&
        !isAdmin
      ) {
        return false;
      }

      return true;
    });

  // =========================
  // LOGOUT
  // =========================
  const handleLogout =
    async () => {
      try {
        localStorage.removeItem('appMode');
        localStorage.removeItem('selectedAdminId');
        localStorage.removeItem('selectedAdminEmail');
        localStorage.removeItem('catProfile');
        await auth.signOut();
      } catch (error) {
        console.error(
          'Logout gagal:',
          error
        );
      }
    };

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ======================================== */}
      {/* SIDEBAR */}
      {/* ======================================== */}
      <aside className="hidden md:flex w-52 bg-white border-r border-gray-100 flex-col fixed inset-y-0 z-50">

        {/* BRAND */}
        <div className="px-5 py-5 border-b border-gray-50">

          <div className="flex items-center gap-2.5">

            {/* DEVICE AVATAR */}
            <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-amber-200">

              <img
                src="https://api.dicebear.com/7.x/thumbs/svg?seed=feeder"
                alt="feeder"
                className="w-full h-full object-cover"
              />
            </div>

            {/* BRAND INFO */}
            <div>
              <p className="text-sm font-bold text-gray-800 leading-none">
                Smart Feeder
              </p>

              <p className="text-[10px] text-green-500 font-medium mt-0.5 flex items-center gap-1">

                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />

                Status: Online
              </p>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">

          {filteredItems.map((item) => {
            const isActive =
              activeTab === item.id;

            return (
              <button
                key={item.id}
                aria-label={item.label}
                onClick={() =>
                  onTabChange(item.id)
                }
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-sm',
                  isActive
                    ? 'bg-amber-400 text-white font-semibold shadow-sm shadow-amber-200'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-medium'
                )}
              >
                <item.icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-gray-600'
                  )}
                />

                <span className="flex-1 text-left">
                  {item.label}
                </span>

                {/* ACTIVE DOT */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="w-1.5 h-1.5 bg-white rounded-full shrink-0 opacity-70"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="px-3 py-3 border-t border-gray-50">

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />

            Sign Out
          </button>
        </div>
      </aside>

      {/* ======================================== */}
      {/* MAIN CONTENT */}
      {/* ======================================== */}
      <main className="flex-1 md:ml-52 flex flex-col">

        {/* TOPBAR */}
        <header className="h-14 bg-white border-b border-gray-100 sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between gap-4">

          {/* PAGE TITLE */}
          <h1 className="text-base font-bold text-gray-800">
            Smart Cat Feeder
          </h1>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-4">

            {/* HISTORY */}
            <button
              type="button"
              title="Riwayat"
              aria-label="Riwayat"
              onClick={() => onTabChange('history')}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                activeTab === 'history'
                  ? 'text-amber-500 bg-amber-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              )}
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* NOTIFICATION */}
            <div className="relative">
              <button
                type="button"
                title="Notifikasi"
                aria-label="Notifikasi"
                onClick={() => onTabChange('notifications')}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                  activeTab === 'notifications'
                    ? 'text-amber-500 bg-amber-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                )}
              >
                <Bell className="w-4 h-4" />
              </button>
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 border border-white rounded-full pointer-events-none" />
            </div>

            {/* DEVICE STATUS — admin only */}
            {isAdmin && (
              <button
                type="button"
                title="Pengaturan Perangkat"
                aria-label="Pengaturan Perangkat"
                onClick={() => onTabChange('settings')}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                  activeTab === 'settings'
                    ? 'text-amber-500 bg-amber-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                )}
              >
                <Radio className="w-4 h-4" />
              </button>
            )}

            {/* USER AVATAR */}
            <button
              type="button"
              title="Profil Kucing"
              aria-label="Profil Kucing"
              onClick={() => onTabChange('cat-profile')}
              className={cn(
                'w-8 h-8 rounded-full overflow-hidden border-2 transition-all',
                activeTab === 'cat-profile'
                  ? 'border-amber-400 ring-2 ring-amber-200'
                  : 'border-gray-200 hover:border-amber-300'
              )}
            >
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 p-4 md:p-6 flex flex-col">

          <motion.div
            key={activeTab}
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </div>

        {/* FOOTER */}
        <footer className="py-3 px-6 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} Smart Cat Feeder Tugas Akhir Endhisa Ocha Jauhary — All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}