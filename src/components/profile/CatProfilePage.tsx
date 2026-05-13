import React from 'react';
import { 
  Cat, 
  Heart, 
  Activity, 
  Scale, 
  ShieldCheck, 
  Edit3, 
  Camera,
  Calendar,
  ChevronRight,
  Calculator,
  Utensils
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export function CatProfilePage() {
  const { user } = useAuth();

  const metrics = [
    { label: 'Weight', value: '4.5 kg', ideal: '4.2 - 4.8', icon: Scale, color: 'text-amber-500' },
    { label: 'Body Condition', value: '3/5', ideal: 'Ideal', icon: Heart, color: 'text-red-400' },
    { label: 'Activity Level', value: 'Medium', ideal: 'Indoor', icon: Activity, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-10">
      {/* Header Profile */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-12 p-12 bg-white rounded-[64px] border border-amber-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-3xl" />
        
        <div className="relative group">
           <div className="w-48 h-48 rounded-[48px] overflow-hidden border-8 border-bg-warm shadow-2xl relative">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Luna" alt="Cat" className="w-full h-full object-cover" />
           </div>
           <button className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-all border-4 border-white">
              <Camera className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 text-center md:text-left space-y-6">
           <div>
              <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                 <h2 className="text-5xl font-display font-black text-text-main tracking-tight">Luna</h2>
                 <span className="px-4 py-1.5 bg-amber-50 text-primary rounded-full text-sm font-black uppercase tracking-wider border border-amber-100">BCS Level 3</span>
              </div>
              <p className="text-xl text-gray-400 font-medium">British Shorthair • 3 Years Old</p>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((m, i) => (
                <div key={i} className="p-4 rounded-[32px] bg-secondary-warm/50 border border-amber-50">
                  <div className={cn("w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm", m.color)}>
                     <m.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-[10px] mb-1">{m.label}</p>
                  <p className="text-xl font-display font-bold text-text-main">{m.value}</p>
                </div>
              ))}
              <div className="p-4 rounded-[32px] bg-text-main text-white text-center flex flex-col justify-center cursor-pointer hover:bg-black transition-colors">
                 <Edit3 className="w-6 h-6 mx-auto mb-1" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Edit DNA</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Health Insights */}
        <div className="space-y-6">
           <div className="flex items-center gap-3 px-4">
              <ShieldCheck className="text-green-500 w-6 h-6" />
              <h3 className="text-2xl font-display font-black text-text-main uppercase tracking-tight">Health Registry</h3>
           </div>
           
           <div className="card-premium space-y-6">
              {[
                { title: 'Urinary Health Status', status: 'Optimal', log: 'Last analysis: 2 days ago', color: 'text-green-500', bg: 'bg-green-50' },
                { title: 'Weight Management', status: 'On Track', log: 'Gained 0.1kg in 2 months', color: 'text-amber-500', bg: 'bg-amber-50' },
                { title: 'Vaccination Record', status: 'Up to Date', log: 'FVRCP due in 4 months', color: 'text-blue-500', bg: 'bg-blue-50' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-6 rounded-[32px] bg-bg-warm border border-amber-50 group hover:border-primary/20 transition-all cursor-pointer">
                   <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", item.bg)}>
                         <ShieldCheck className={cn("w-6 h-6", item.color)} />
                      </div>
                      <div>
                         <p className="font-bold text-text-main group-hover:text-primary transition-all">{item.title}</p>
                         <p className="text-xs text-gray-400 mt-1">{item.log}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className={cn("text-xs font-black uppercase tracking-widest", item.color)}>{item.status}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Feeding Recommendation Details */}
        <div className="space-y-6">
           <div className="flex items-center gap-3 px-4">
              <Calculator className="text-primary w-6 h-6" />
              <h3 className="text-2xl font-display font-black text-text-main uppercase tracking-tight">Logic & Targets</h3>
           </div>

           <div className="card-premium p-10 bg-text-main text-white space-y-8">
              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Daily Calorie Target</p>
                    <p className="text-4xl font-display font-black">185<span className="text-lg text-primary ml-1">kcal</span></p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Daily Food Portion</p>
                    <p className="text-4xl font-display font-black">62<span className="text-lg text-primary ml-1">g</span></p>
                 </div>
              </div>

              <div className="h-px bg-white/10 w-full" />

              <div className="space-y-6">
                 <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Calculated Schedule</p>
                 <div className="space-y-4">
                    {[
                      { time: '07:00', label: 'Morning Blast', grams: '21g' },
                      { time: '13:00', label: 'Lunch Snack', grams: '20g' },
                      { time: '19:00', label: 'Dinner Feast', grams: '21g' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                         <div className="flex items-center gap-4">
                            <span className="text-lg font-display font-black text-primary">{s.time}</span>
                            <div>
                               <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{s.label}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <Utensils className="w-3 h-3 text-white/40" />
                                  <span className="text-[10px] text-white/40 uppercase tracking-widest">{s.grams} precise</span>
                               </div>
                            </div>
                         </div>
                         <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <ChevronRight className="w-4 h-4" />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
