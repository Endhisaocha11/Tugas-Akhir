import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Clock, 
  Database, 
  Zap, 
  AlertCircle,
  Weight,
  Thermometer,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { CatProfile, DeviceStatus, FeedingLog } from '../../types';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export function Dashboard() {
  const { user, profile } = useAuth();
  const [cat, setCat] = useState<CatProfile | null>(null);
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [logs, setLogs] = useState<FeedingLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch Cat Profile
    const catsQuery = query(collection(db, 'cats'), where('ownerId', '==', user.uid), limit(1));
    const unsubscribeCat = onSnapshot(catsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setCat(snapshot.docs[0].data() as CatProfile);
      }
    });

    // Fetch Device Status (assuming one device per user/cat for now)
    const deviceQuery = query(collection(db, 'devices'), limit(1));
    const unsubscribeDevice = onSnapshot(deviceQuery, (snapshot) => {
      if (!snapshot.empty) {
        setDevice(snapshot.docs[0].data() as DeviceStatus);
      } else {
        // Mock device for preview if none exists
        setDevice({
          id: 'dev-01',
          isOnline: true,
          foodStockLevel: 85,
          currentWeightOnScale: 12,
          servoStatus: 'idle',
          lastPulse: Date.now(),
          calibrationFactor: 1.0
        });
      }
      setLoading(false);
    });

    // Fetch Recent Logs
    const logsQuery = query(collection(db, 'cats'), limit(1)); // Need actual catId
    // For now use a broader query or Wait for cat
    
    return () => {
      unsubscribeCat();
      unsubscribeDevice();
    };
  }, [user]);

  const stats = [
    { label: 'Food Stock', value: `${device?.foodStockLevel || 0}%`, icon: Database, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Today Total', value: '185g', icon: Activity, color: 'text-primary', bg: 'bg-amber-50' },
    { label: 'Target', value: `${cat?.dailyGramTarget || 0}g`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Status', value: device?.isOnline ? 'Online' : 'Offline', icon: Zap, color: device?.isOnline ? 'text-green-500' : 'text-gray-400', bg: device?.isOnline ? 'bg-green-50' : 'bg-gray-100' },
  ];

  const chartData = [
    { time: '07:00', weight: 45 },
    { time: '10:00', weight: 42 },
    { time: '13:00', weight: 70 },
    { time: '16:00', weight: 65 },
    { time: '19:00', weight: 110 },
    { time: '22:00', weight: 95 },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-text-main mb-1">
            Hello, {profile?.email?.split('@')[0] || 'User'}👋
          </h2>
          <p className="text-gray-400">Here's what's happening with <span className="text-primary font-bold">{cat?.name || 'your cat'}</span> today.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-amber-100 flex items-center gap-2 shadow-sm">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <motion.div 
            whileHover={{ y: -5 }}
            key={stat.label} 
            className="card-premium flex items-center gap-5"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-display font-bold text-text-main">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 card-premium p-8">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h3 className="text-xl font-display font-bold text-text-main">Feeding Dynamics</h3>
                <p className="text-sm text-gray-400">Consumption trend over the last 24 hours</p>
             </div>
             <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-primary border border-amber-100">Live View</button>
             </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94A3B8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94A3B8' }} 
                  unit="g"
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#F59E0B" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorWeight)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Status Card */}
        <div className="card-premium space-y-6">
          <h3 className="text-xl font-display font-bold text-text-main">Device Insight</h3>
          
          <div className="space-y-4">
             <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Weight className="w-5 h-5 text-gray-400" />
                   </div>
                   <span className="text-sm font-semibold text-gray-600">Bowl Weight</span>
                </div>
                <span className="text-xl font-display font-bold text-text-main">{device?.currentWeightOnScale || 0}g</span>
             </div>

             <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Thermometer className="w-5 h-5 text-gray-400" />
                   </div>
                   <span className="text-sm font-semibold text-gray-600">Ambient Temp</span>
                </div>
                <span className="text-xl font-display font-bold text-text-main">24.5 °C</span>
             </div>
          </div>

          <div className="pt-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Next Feeding</h4>
            <div className="p-5 rounded-[32px] bg-secondary-warm border-2 border-primary/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="w-16 h-16 text-primary" />
               </div>
               <div className="relative z-10">
                 <p className="text-3xl font-display font-black text-primary">13:00</p>
                 <p className="text-sm font-bold text-text-main mt-1">Lunch Portion (62g)</p>
                 <div className="mt-4 w-full h-1.5 bg-white rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-primary" />
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Live Notifications */}
         <div className="card-premium">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-display font-bold text-text-main">Recent Activity</h3>
               <button className="text-sm font-bold text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-4">
               {[
                 { title: 'Feeding Successful', time: '2 hours ago', type: 'success', icon: CheckCircle2 },
                 { title: 'Low Food Stock Alert', time: '5 hours ago', type: 'warning', icon: AlertCircle },
                 { title: 'Calibration Completed', time: '1 day ago', type: 'info', icon: Activity },
               ].map((notif, idx) => (
                 <div key={idx} className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-amber-100 group">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      notif.type === 'success' ? "bg-green-50 text-green-500" : 
                      notif.type === 'warning' ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"
                    )}>
                      <notif.icon className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="font-bold text-text-main group-hover:text-primary transition-colors">{notif.title}</p>
                       <p className="text-xs text-gray-400 font-medium">{notif.time}</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Cat Profile Snippet */}
         <div className="card-premium relative overflow-hidden flex flex-col justify-between">
             <div className="absolute top-0 right-0 w-48 h-48 bg-primary rounded-full blur-[80px] -mr-24 -mt-24 opacity-10" />
             
             <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-6">
                   <div className="w-24 h-24 rounded-3xl bg-secondary-warm border-2 border-white shadow-xl overflow-hidden group">
                      <img 
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${cat?.name || 'Cat'}`} 
                        alt="cat" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                   </div>
                   <div>
                      <h3 className="text-3xl font-display font-black text-text-main">{cat?.name || 'Loading...'}</h3>
                      <div className="flex gap-2 mt-2">
                         <span className="px-3 py-1 rounded-full bg-amber-50 text-primary text-[10px] font-black uppercase tracking-wider">{cat?.gender}</span>
                         <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-wider">{cat?.isSterilized ? 'Sterilized' : 'Normal'}</span>
                      </div>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-4xl font-display font-black text-primary">{cat?.weight || 0}<span className="text-sm">kg</span></p>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Weight Class</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
                <div className="bg-bg-warm p-4 rounded-2xl border border-amber-100">
                   <p className="text-sm font-bold text-text-main">Ideal Target</p>
                   <p className="text-xs text-gray-400 mt-1 leading-relaxed">Based on BCS-3 score, targeting weight maintenance for FLUTD prevention.</p>
                </div>
                <div className="bg-bg-warm p-4 rounded-2xl border border-amber-100">
                   <p className="text-sm font-bold text-text-main">Health Status</p>
                   <div className="flex items-center gap-2 mt-2">
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                       <span className="text-xs font-bold text-green-600">Optimum Range</span>
                   </div>
                </div>
             </div>
         </div>
      </div>
    </div>
  );
}
