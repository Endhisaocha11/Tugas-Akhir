import React, { useState } from 'react';
import { 
  Wifi, 
  Settings, 
  Database, 
  Scale, 
  Bell, 
  ShieldCheck,
  RefreshCw,
  Cpu,
  Save,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export function DeviceSettings() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => {
      setIsUpdating(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 2000);
  };

  const sections = [
    {
      title: "Connection Status",
      icon: Wifi,
      color: "text-blue-500",
      content: (
        <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-amber-100 shadow-sm">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                 <Cpu className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                 <p className="font-bold text-text-main">ESP32-Feeder-7B42</p>
                 <p className="text-xs text-green-500 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Connected • Latency: 42ms
                 </p>
              </div>
           </div>
           <button className="btn-secondary py-2 px-4 text-xs">Reconnect</button>
        </div>
      )
    },
    {
       title: "Hardware Calibration",
       icon: Scale,
       color: "text-primary",
       content: (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-3xl border border-amber-100 shadow-sm space-y-4">
               <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Load Cell (Scale)</p>
               <div className="flex items-center justify-between">
                  <span className="text-2xl font-display font-black text-text-main">1.034</span>
                  <button className="flex items-center gap-2 text-primary font-bold text-sm bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                    <RefreshCw className="w-4 h-4" /> Calibrate Tare
                  </button>
               </div>
               <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-primary" />
               </div>
            </div>
            <div className="p-6 bg-white rounded-3xl border border-amber-100 shadow-sm space-y-4">
               <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Servo Range</p>
               <div className="flex items-center justify-between">
                  <span className="text-2xl font-display font-black text-text-main">0° - 180°</span>
                  <button className="flex items-center gap-2 text-text-main font-bold text-sm bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    Test Cycle
                  </button>
               </div>
               <div className="flex gap-1 h-3">
                  {Array.from({length: 12}).map((_, i) => (
                    <div key={i} className={cn("flex-1 rounded-full", i < 8 ? "bg-amber-400" : "bg-gray-100")} />
                  ))}
               </div>
            </div>
         </div>
       )
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-end justify-between max-w-4xl">
        <div>
          <h2 className="text-3xl font-display font-bold text-text-main mb-1">Configuration Center 🛠️</h2>
          <p className="text-gray-400">Manage device hardware, limits, and system preferences.</p>
        </div>
        <button 
          onClick={handleUpdate}
          className={cn(
            "btn-primary px-8 flex items-center gap-2 min-w-[200px]",
            success && "bg-green-500 hover:bg-green-600 shadow-green-200"
          )}
        >
          {isUpdating ? 'Saving...' : success ? <><CheckCircle2 className="w-5 h-5" /> Saved</> : <><Save className="w-5 h-5" /> Push Changes</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
           {sections.map((section, idx) => (
             <div key={idx} className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                   <section.icon className={cn("w-5 h-5", section.color)} />
                   <h3 className="font-display font-black text-text-main text-xl">{section.title}</h3>
                </div>
                {section.content}
             </div>
           ))}

           <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <Bell className="w-5 h-5 text-red-400" />
                <h3 className="font-display font-black text-text-main text-xl">System Notifications</h3>
              </div>
              <div className="bg-white rounded-[40px] border border-amber-100 p-8 space-y-6">
                 {[
                   { label: 'Low Food Stock Alert', active: true, desc: 'Notify when stock level is below 15%.' },
                   { label: 'Feeding Success Confirmation', active: true, desc: 'Send push notification after every successful dispense.' },
                   { label: 'Machine Jammed Alert', active: true, desc: 'Critical alerts for mechanical failures.' },
                   { label: 'Ambient Temperature Warning', active: false, desc: 'Warn if food storage area gets too hot (>30°C).' }
                 ].map((opt, i) => (
                   <div key={i} className="flex items-start justify-between group">
                      <div className="flex gap-4">
                         <div className={cn("mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0", opt.active ? "bg-amber-50" : "bg-gray-50")}>
                            <Bell className={cn("w-5 h-5", opt.active ? "text-primary" : "text-gray-300")} />
                         </div>
                         <div>
                            <p className="font-bold text-text-main group-hover:text-primary transition-colors">{opt.label}</p>
                            <p className="text-xs text-gray-400 font-medium">{opt.desc}</p>
                         </div>
                      </div>
                      <div className={cn(
                        "w-14 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300",
                        opt.active ? "bg-primary" : "bg-gray-200"
                      )}>
                         <div className={cn("w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300", opt.active && "translate-x-7")} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="card-premium bg-secondary-warm/50 border-2 border-primary/10">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                 <ShieldCheck className="text-green-500 w-7 h-7" />
              </div>
              <h3 className="text-xl font-display font-black text-text-main mb-3">Security & Updates</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">Device firmware is up to date (v2.4.1). Last security patch: 12 May 2026.</p>
              <div className="space-y-3">
                 <button className="w-full btn-secondary text-xs py-3">Check for Updates</button>
                 <button className="w-full bg-white text-gray-400 py-3 text-xs font-bold rounded-xl border border-gray-100">Factory Reset Device</button>
              </div>
           </div>

           <div className="p-8 bg-text-main rounded-[40px] text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Database className="w-32 h-32" />
              </div>
              <h4 className="text-lg font-display font-bold mb-2">Cloud Synced</h4>
              <p className="text-sm text-white/60 mb-6 leading-relaxed">All device logs and settings are automatically backed up to your FelineGuard Cloud account.</p>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                 <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                 Active Backup
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
