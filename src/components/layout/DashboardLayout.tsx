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
  Search,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'feeding-control', label: 'Feeding Control', icon: Utensils },
  { id: 'cat-profile', label: 'Cat Profile', icon: Cat },
  { id: 'history', label: 'Feeding History', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'education', label: 'Education', icon: BookOpen },
  { id: 'settings', label: 'Device Settings', icon: Settings },
];

export function DashboardLayout({ 
  children, 
  activeTab, 
  onTabChange 
}: { 
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  const { user, profile } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#FFFBF7]">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-amber-100 flex flex-col fixed inset-y-0 shadow-sm z-50">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
              <Cat className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-display font-bold text-text-main tracking-tight">FelineGuard</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group",
                activeTab === item.id 
                  ? "bg-secondary-warm text-primary font-semibold"
                  : "text-gray-400 hover:text-text-main hover:bg-gray-50"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                activeTab === item.id ? "text-primary" : "text-gray-400 group-hover:text-text-main"
              )} />
              {item.label}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" 
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-amber-50">
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72">
        {/* Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-amber-100 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 bg-gray-100/50 px-4 py-2 rounded-2xl border border-gray-100 w-96 font-sans">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search data, logs, or education..." 
              className="bg-transparent border-none outline-none text-sm text-text-main w-full"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-primary bg-amber-50 px-2 py-0.5 rounded-full mb-1">
                {profile?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Family Member'}
              </span>
              <span className="text-sm font-bold text-text-main">{profile?.email.split('@')[0]}</span>
            </div>
            
            <div className="relative group">
              <button className="w-10 h-10 rounded-2xl bg-secondary-warm flex items-center justify-center border border-amber-100 hover:shadow-md transition-all">
                <Bell className="w-5 h-5 text-primary" />
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
              </button>
            </div>

            <div className="flex items-center gap-3 pl-6 border-l border-amber-100">
               <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="avatar" />
               </div>
               <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 min-h-[calc(100vh-80px)]">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
