import { useState } from 'react';
import React from 'react';

import {
  LayoutDashboard,
  Utensils,
  Cat,
  History,
  BookOpen,
  Settings,
  LogOut,
  Bell,
  Users,
  Clock,
  Radio,
  Menu,
  X,
  WifiOff,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../../lib/AuthContext';
import { useCatData } from '../../lib/useCatData';
import { auth } from '../../lib/firebase';
import { UserRole } from '../../types';
import { cn } from '../../lib/utils';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  /** If set, item renders as an external link (opens in a new tab) instead of switching tabs */
  href?: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'onboarding-flow', label: 'Onboarding Flow', icon: BookOpen,      adminOnly: true },
  { id: 'dashboard',       label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'feeding-control', label: 'Feeding Control',  icon: Utensils,      adminOnly: true },
  { id: 'cat-profile',     label: 'Cat Profile',      icon: Cat },
  { id: 'history',         label: 'Feeding History',  icon: History },
  { id: 'education',       label: 'FLUTD Education',  icon: BookOpen },
  { id: 'notifications',   label: 'Notifications',    icon: Bell },
  { id: 'settings',        label: 'Settings',         icon: Settings,      adminOnly: true },
  { id: 'user-settings',   label: 'User Settings',    icon: Users,         adminOnly: true },
  { id: 'help',            label: 'Bantuan',          icon: HelpCircle,   href: '/panduan-pawfectcare.pdf' },
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
  const { cat, device, feedingLogs } = useCatData();
  const hasUnread = feedingLogs.some(
    (l) => l.timestamp > Number(localStorage.getItem('notif_last_read') ?? '0')
  );
  const catPhotoUrl = (cat as any)?.photoUrl as string | undefined;
  const isOnline = device?.isOnline === true;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = userRole === UserRole.SUPER_ADMIN;
  const selectedAdminEmail = localStorage.getItem('selectedAdminEmail') ?? '';

  const filteredItems = sidebarItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const handleTabChange = (id: string) => {
    onTabChange(id);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('appMode');
      localStorage.removeItem('selectedAdminId');
      localStorage.removeItem('selectedAdminEmail');
      localStorage.removeItem('catProfile');
      await auth.signOut();
    } catch (error) {
      console.error('Logout gagal:', error);
    }
  };

  const handleBackToMonitoring = () => {
    // Flag sessionStorage agar auto-restore di App.tsx tidak aktif kembali
    sessionStorage.setItem('skipAutoRestore', '1');
    localStorage.removeItem('appMode');
    localStorage.removeItem('selectedAdminId');
    localStorage.removeItem('selectedAdminEmail');
    window.location.href = '/';
  };

  const SidebarContent = () => (
    <>
      {/* BRAND */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-amber-200 shrink-0">
            <img src="logo.png" alt="feeder" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-none">PawfectCare</p>
            <p className={cn('text-[10px] font-medium mt-0.5 flex items-center gap-1', isOnline ? 'text-green-500' : 'text-gray-400')}>
              <span className={cn('w-1.5 h-1.5 rounded-full inline-block shrink-0', isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-300')} />
              {isOnline ? 'Status: Online' : 'Status: Offline'}
            </p>
            {isAdmin ? (
              user && (
                <p className="text-[10px] text-gray-400 mt-0.5 truncate" title={user.email ?? ''}>
                  {user.displayName || user.email?.split('@')[0]}
                </p>
              )
            ) : (
              selectedAdminEmail && (
                <p className="text-[10px] text-gray-400 mt-0.5 truncate" title={selectedAdminEmail}>
                  {selectedAdminEmail.split('@')[0]}
                </p>
              )
            )}
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="Tutup menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = activeTab === item.id;

          // External link items (e.g. "Bantuan" -> PDF) open in a new tab
          // instead of switching the active dashboard tab.
          if (item.href) {
            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-medium"
              >
                <item.icon className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-gray-600" />
                <span className="flex-1 text-left">{item.label}</span>
              </a>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              onClick={() => handleTabChange(item.id)}
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
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              <span className="flex-1 text-left">{item.label}</span>
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
      <div className="px-3 py-3 border-t border-gray-50 shrink-0 space-y-1">
        {!isAdmin && (
          <button
            type="button"
            onClick={handleBackToMonitoring}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Ganti Admin
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── MOBILE OVERLAY ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── MOBILE SIDEBAR DRAWER ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col md:hidden shadow-2xl"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── DESKTOP SIDEBAR (always visible on md+) ── */}
      <aside className="hidden md:flex w-52 bg-white border-r border-gray-100 flex-col fixed inset-y-0 z-50">
        <SidebarContent />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 md:ml-52 flex flex-col min-w-0">

        {/* TOPBAR */}
        <header className="h-14 bg-white border-b border-gray-100 sticky top-0 z-30 px-4 flex items-center justify-between gap-3">

          {/* LEFT: hamburger (mobile) + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-gray-800 truncate">PawfectCare</h1>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-2 shrink-0">

            {/* HISTORY */}
            <button
              type="button"
              title="Riwayat"
              aria-label="Riwayat"
              onClick={() => handleTabChange('history')}
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
                onClick={() => handleTabChange('notifications')}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                  activeTab === 'notifications'
                    ? 'text-amber-500 bg-amber-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                )}
              >
                <Bell className="w-4 h-4" />
              </button>
              {hasUnread && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 border border-white rounded-full pointer-events-none" />
              )}
            </div>

            {/* DEVICE STATUS — admin only */}
            {isAdmin && (
              <button
                type="button"
                title="Pengaturan Perangkat"
                aria-label="Pengaturan Perangkat"
                onClick={() => handleTabChange('settings')}
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
              onClick={() => handleTabChange('cat-profile')}
              className={cn(
                'w-9 h-9 rounded-full border-2 transition-all shrink-0 flex items-center justify-center p-0',
                activeTab === 'cat-profile'
                  ? 'border-amber-400 ring-2 ring-amber-200 ring-offset-1'
                  : 'border-gray-200 hover:border-amber-300'
              )}
            >
              <span className="w-full h-full rounded-full overflow-hidden block">
                <img
                  src={catPhotoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cat?.name ?? user?.uid}`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </span>
            </button>
          </div>
        </header>

        {/* OFFLINE BANNER — muncul di semua halaman saat perangkat tidak terdeteksi RTDB */}
        <AnimatePresence>
          {device !== null && !isOnline && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mx-4 mt-3 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3"
            >
              <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-red-700">Perangkat Offline</p>
                <p className="text-xs text-red-500 truncate">Feeder tidak terhubung — pemberian pakan otomatis & manual tidak aktif.</p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleTabChange('settings')}
                  className="shrink-0 text-xs font-black text-red-600 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Cek Perangkat
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PAGE CONTENT */}
        <div className="flex-1 p-4 md:p-6 flex flex-col min-w-0">
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
        <footer className="py-3 px-4 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} PawfectCare — Tugas Akhir Endhisa Ocha Jauhary
          </p>
        </footer>
      </main>
    </div>
  );
}