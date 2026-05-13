import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  Download,
  Calendar,
  Zap,
  Activity,
  ChevronRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Cell, 
  Pie 
} from 'recharts';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export function Analytics() {
  const lineData = [
    { day: 'Mon', calories: 175 },
    { day: 'Tue', calories: 182 },
    { day: 'Wed', calories: 185 },
    { day: 'Thu', calories: 180 },
    { day: 'Fri', calories: 195 },
    { day: 'Sat', calories: 190 },
    { day: 'Sun', calories: 188 },
  ];

  const barData = [
    { period: 'Morning', grams: 420 },
    { period: 'Lunch', grams: 380 },
    { period: 'Dinner', grams: 435 },
  ];

  const pieData = [
    { name: 'On-Schedule', value: 92 },
    { name: 'Manual', value: 8 },
  ];

  const COLORS = ['#F59E0B', '#374151', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-text-main mb-1">Health Analytics 📈</h2>
          <p className="text-gray-400">Uncover patterns in caloric intake and device efficiency.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl border border-amber-100 flex items-center gap-3 shadow-sm">
             <Calendar className="w-4 h-4 text-gray-300" />
             <span className="text-xs font-bold text-text-main">Last 7 Days</span>
          </div>
          <button className="btn-primary py-2 px-6 text-xs flex items-center gap-2">
            <Download className="w-4 h-4" /> Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="p-8 bg-text-main rounded-[40px] text-white space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Zap className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#F59E0B]">
               <Activity className="w-3 h-3" /> Metabolic Pulse
            </div>
            <h3 className="text-4xl font-display font-black leading-tight">Optimal <br />Stability.</h3>
            <p className="text-sm text-white/50 leading-relaxed">Variation in daily calories is within ±3%, which is elite for FLUTD prevention.</p>
            <div className="pt-4 flex items-center gap-2 text-white font-bold text-sm">
               Explore Details <ChevronRight className="w-4 h-4" />
            </div>
         </div>

         <div className="md:col-span-2 card-premium">
            <div className="flex items-center justify-between mb-8">
               <h4 className="text-lg font-display font-bold text-text-main flex items-center gap-2">
                 <TrendingUp className="text-primary w-5 h-5" /> Caloric Consistency
               </h4>
               <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Target: 185 kcal</span>
            </div>
            <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Line type="monotone" dataKey="calories" stroke="#F59E0B" strokeWidth={5} dot={{ r: 6, fill: '#F59E0B', strokeWidth: 3, stroke: '#fff' }} />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <div className="card-premium">
            <div className="flex items-center justify-between mb-10">
               <h4 className="text-lg font-display font-bold text-text-main flex items-center gap-2">
                 <BarChart3 className="text-blue-500 w-5 h-5" /> Portion Distribution
               </h4>
               <span className="text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full">Monthly Vol: 1.2kg</span>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="grams" fill="#F59E0B" radius={[12, 12, 0, 0]} barSize={60} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="card-premium flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8">
               <h4 className="text-lg font-display font-bold text-text-main flex items-center gap-2">
                 <PieIcon className="text-red-400 w-5 h-5" /> Adherence Score
               </h4>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Efficiency: 99.2%</span>
            </div>
            <div className="flex-1 flex gap-10 items-center">
               <div className="w-1/2 h-full min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                           {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                           ))}
                        </Pie>
                        <Tooltip />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="space-y-6">
                  {pieData.map((item, idx) => (
                    <div key={item.name} className="flex gap-4">
                       <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                       <div>
                          <p className="font-bold text-text-main">{item.name}</p>
                          <p className="text-2xl font-display font-black text-text-main">{item.value}%</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
            <div className="mt-8 p-6 bg-secondary-warm/30 rounded-[32px] border border-amber-100/50">
               <p className="text-sm font-bold text-primary flex items-center gap-2">
                 <TrendingUp className="w-4 h-4" /> 8% Improvement
               </p>
               <p className="text-xs text-gray-400 mt-1">Manual feedings have decreased, indicating better schedule optimization.</p>
            </div>
         </div>
      </div>
    </div>
  );
}
