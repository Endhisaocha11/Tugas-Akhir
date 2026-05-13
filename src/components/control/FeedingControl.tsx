import React, { useState } from 'react';
import { 
  Utensils, 
  RotateCcw, 
  Clock, 
  AlertTriangle,
  Play,
  Settings2,
  Lock,
  Plus,
  Trash2,
  Check
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export function FeedingControl() {
  const { isAdmin, user } = useAuth();
  const [feedingAmount, setFeedingAmount] = useState(25);
  const [isFeeding, setIsFeeding] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Mock schedule
  const [schedule, setSchedule] = useState([
    { id: 1, time: '07:00', amount: 62, active: true },
    { id: 2, time: '13:00', amount: 62, active: true },
    { id: 3, time: '19:00', amount: 61, active: true },
  ]);

  const handleManualFeed = () => {
    if (feedingAmount > 100) {
      setShowWarning(true);
      return;
    }
    setIsFeeding(true);
    setTimeout(() => {
      setIsFeeding(false);
      alert('Manual feeding successful!');
    }, 3000);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[40px] border border-amber-100 shadow-sm min-h-100">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
           <Lock className="text-primary w-10 h-10" />
        </div>
        <h3 className="text-2xl font-display font-bold text-text-main mb-2">Restricted Access</h3>
        <p className="text-gray-400 text-center max-w-sm">
          Manual feeding control and schedule management are reserved for <strong>Super Admins</strong>. 
          Please contact your administrator for changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-text-main mb-1">Feeding Control 🥫</h2>
        <p className="text-gray-400">Direct command center for your Smart Cat Feeder device.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Manual Feed Card */}
        <div className="card-premium p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                 <Play className="text-primary w-6 h-6 fill-current" />
              </div>
              <h3 className="text-xl font-display font-bold text-text-main">Instant Delivery</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Serving Size (Grams)</label>
                <div className="flex items-center gap-8 bg-gray-50 p-8 rounded-4xl border border-transparent transition-all focus-within:border-primary/20">
                   <div className="flex-1 space-y-2">
                     <input 
                       type="range" 
                       min="5" max="150" step="5"
                       value={feedingAmount}
                       onChange={(e) => setFeedingAmount(parseInt(e.target.value))}
                       className="w-full accent-primary"
                       aria-label="Serving size in grams"
                     />
                     <div className="flex justify-between text-[10px] font-black text-gray-300 uppercase italic">
                       <span>Snack</span>
                       <span>Meal</span>
                       <span>Large</span>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-5xl font-display font-black text-primary">{feedingAmount}<span className="text-lg">g</span></p>
                   </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleManualFeed}
                  disabled={isFeeding}
                  className={cn(
                    "flex-1 py-5 btn-primary text-lg font-display font-bold",
                    isFeeding && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isFeeding ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Dispensing...
                    </div>
                  ) : (
                    <>Feed Now <Utensils className="w-5 h-5" /></>
                  )}
                </button>
                <button className="p-5 btn-secondary group" title="Reset feeding amount to default" aria-label="Reset feeding amount">
                  <RotateCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>

              {showWarning && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-800">
                   <AlertTriangle className="w-5 h-5 shrink-0" />
                   <p className="text-sm font-medium">Overfeeding Warning: Portions above 100g may lead to health complications.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Management */}
        <div className="card-premium p-8">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                   <Clock className="text-blue-500 w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-bold text-text-main">Active Schedule</h3>
              </div>
              <button className="px-4 py-2 bg-text-main text-white rounded-xl text-xs font-bold hover:bg-black transition-colors flex items-center gap-2" aria-label="Add new feeding schedule slot">
                 <Plus className="w-4 h-4" /> Add Slot
              </button>
           </div>

           <div className="space-y-3">
              {schedule.map((slot) => (
                <div key={slot.id} className="group p-5 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-between hover:border-amber-200 transition-all">
                  <div className="flex items-center gap-6">
                     <div className="text-center">
                        <p className="text-lg font-display font-black text-text-main">{slot.time}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</p>
                     </div>
                     <div className="w-px h-8 bg-gray-200" />
                     <div>
                        <p className="text-lg font-display font-bold text-primary">{slot.amount}g</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Portion</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                     <button className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all",
                       slot.active ? "bg-green-50 border-green-500 text-green-600" : "bg-white border-gray-200 text-gray-300"
                     )} title={`Toggle schedule slot at ${slot.time}`} aria-label={`Toggle feeding slot at ${slot.time}`}>
                       <Check className="w-5 h-5" />
                     </button>
                     <button className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border border-gray-100 text-gray-300 hover:text-red-500 hover:border-red-100 transition-all opacity-0 group-hover:opacity-100" title="Delete schedule slot" aria-label="Delete feeding schedule slot">
                        <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
                </div>
              ))}
           </div>

           <div className="mt-8 p-6 bg-secondary-warm border border-amber-100 rounded-4xl flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                 <Settings2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                 <p className="text-sm font-bold text-text-main">Smart Adjustment</p>
                 <p className="text-[10px] text-gray-400 font-medium">Automatic distribution based on body score.</p>
              </div>
              <div className="w-12 h-6 bg-primary rounded-full relative p-1 cursor-pointer">
                 <div className="w-4 h-4 bg-white rounded-full ml-auto" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
