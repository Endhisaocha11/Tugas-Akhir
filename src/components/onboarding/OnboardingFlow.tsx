import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cat, ChevronRight, Scale, Activity, Calculator, CheckCircle2, Heart, Info } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';

const steps = [
  { id: 1, title: 'Identity', icon: Cat },
  { id: 2, title: 'Physical', icon: Scale },
  { id: 3, title: 'Health', icon: Activity },
  { id: 4, title: 'Targets', icon: Calculator },
];

export function OnboardingFlow() {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    age: 2,
    weight: 4.5,
    isSterilized: true,
    bodyCondition: 3 as 1 | 2 | 3 | 4 | 5,
    kiloCaloriesPerKg: 380, // Target cal/kg food
  });

  // Gram = (Fm × Fg × Fo × 70(BB)^0.75) / E
  // For simplicity, let's condense Fm, Fg, Fo into a single multiplier factor
  const calculateTargets = () => {
    const energyRequirementMultiplier = 1.2; // Adjusted for sterilization and activity
    const rer = 70 * Math.pow(formData.weight, 0.75);
    const dailyCalorieTarget = rer * energyRequirementMultiplier;
    const dailyGramTarget = (dailyCalorieTarget / formData.kiloCaloriesPerKg) * 1000;
    
    return {
      dailyCalorieTarget: Math.round(dailyCalorieTarget),
      dailyGramTarget: Math.round(dailyGramTarget)
    };
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    const { dailyCalorieTarget, dailyGramTarget } = calculateTargets();
    
    try {
      const catId = `cat_${user.uid}_${Date.now()}`;
      const catData = {
        id: catId,
        ownerId: user.uid,
        ...formData,
        dailyCalorieTarget,
        dailyGramTarget,
        feedingSchedule: [
          { time: '07:00', amount: Math.round(dailyGramTarget / 3), label: 'Morning' },
          { time: '13:00', amount: Math.round(dailyGramTarget / 3), label: 'Afternoon' },
          { time: '19:00', amount: Math.round(dailyGramTarget / 3), label: 'Dinner' },
        ]
      };

      await setDoc(doc(db, 'cats', catId), catData);
      await updateDoc(doc(db, 'users', user.uid), {
        onboardingCompleted: true
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        {/* Progress bar */}
        <div className="mb-12 flex justify-between items-center relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-amber-100 -translate-y-1/2 z-0" />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border",
                  step >= s.id ? "bg-primary text-white border-primary shadow-amber-200" : "bg-white text-gray-300 border-amber-100"
                )}
              >
                <s.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "mt-2 text-xs font-bold uppercase tracking-wider",
                step >= s.id ? "text-primary" : "text-gray-300"
              )}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[40px] shadow-xl shadow-amber-100 border border-amber-50 p-12 relative overflow-hidden">
           <AnimatePresence mode="wait">
             {step === 1 && (
               <motion.div 
                 key="step1"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-8"
               >
                 <div>
                    <h2 className="text-4xl font-display font-bold text-text-main mb-2">Meow! Who are we feeding?</h2>
                    <p className="text-gray-400">Let's start with basic identity to personalize the care plan.</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Cat Name</label>
                       <input 
                         type="text" 
                         value={formData.name}
                         onChange={(e) => setFormData({...formData, name: e.target.value})}
                         placeholder="e.g. Luna"
                         className="w-full px-6 py-4 bg-gray-50 border border-transparent focus:border-primary/30 rounded-2xl outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Gender</label>
                       <div className="flex gap-4">
                          <button 
                            onClick={() => setFormData({...formData, gender: 'male'})}
                            className={cn(
                              "flex-1 py-4 rounded-2xl border transition-all font-semibold",
                              formData.gender === 'male' ? "bg-primary text-white border-primary shadow-lg shadow-amber-200" : "bg-gray-50 text-gray-400 border-transparent hover:border-amber-200"
                            )}
                          >
                            Male
                          </button>
                          <button 
                            onClick={() => setFormData({...formData, gender: 'female'})}
                            className={cn(
                              "flex-1 py-4 rounded-2xl border transition-all font-semibold",
                              formData.gender === 'female' ? "bg-primary text-white border-primary shadow-lg shadow-amber-200" : "bg-gray-50 text-gray-400 border-transparent hover:border-amber-200"
                            )}
                          >
                            Female
                          </button>
                       </div>
                    </div>
                 </div>
               </motion.div>
             )}

             {step === 2 && (
               <motion.div 
                 key="step2"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-8"
               >
                 <div>
                    <h2 className="text-4xl font-display font-bold text-text-main mb-2">Physical Attributes</h2>
                    <p className="text-gray-400">Weight and age are critical for RER (Resting Energy Requirement) calculation.</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Weight (kg)</label>
                       <div className="flex items-center gap-6 bg-gray-50 p-6 rounded-2xl border border-transparent focus-within:border-primary/30">
                          <input 
                            type="range"
                            min="1" max="15" step="0.1"
                            value={formData.weight}
                            onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                            className="flex-1 accent-primary"
                          />
                          <span className="text-3xl font-display font-bold text-primary">{formData.weight} <span className="text-sm">kg</span></span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Age (Years)</label>
                       <input 
                         type="number"
                         value={formData.age}
                         onChange={(e) => setFormData({...formData, age: parseFloat(e.target.value)})}
                         className="w-full px-6 py-4 bg-gray-50 border border-transparent focus:border-primary/30 rounded-2xl outline-none text-2xl font-display font-bold"
                       />
                    </div>
                 </div>
               </motion.div>
             )}

             {step === 3 && (
               <motion.div 
                 key="step3"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-8"
               >
                 <div>
                    <h2 className="text-4xl font-display font-bold text-text-main mb-2">Health Condition</h2>
                    <p className="text-gray-400">FLUTD prevention requires adjusting caloric intake for metabolism.</p>
                 </div>
                 <div className="space-y-6">
                    <div className="flex gap-4">
                       <button 
                         onClick={() => setFormData({...formData, isSterilized: !formData.isSterilized})}
                         className={cn(
                           "flex-1 p-6 rounded-3xl border-2 transition-all text-left flex gap-4 items-center",
                           formData.isSterilized ? "border-primary bg-amber-50" : "border-gray-100 bg-white"
                         )}
                       >
                         <div className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center", formData.isSterilized ? "bg-primary border-primary" : "border-gray-200")}>
                           {formData.isSterilized && <CheckCircle2 className="w-4 h-4 text-white" />}
                         </div>
                         <div>
                            <p className="font-bold text-text-main">Spayed / Neutered</p>
                            <p className="text-sm text-gray-400">Adjusts metabolism factors by -20%</p>
                         </div>
                       </button>
                    </div>
                    
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Body Condition Score (BCS)</label>
                        <div className="grid grid-cols-5 gap-4">
                           {[1,2,3,4,5].map(v => (
                             <button
                               key={v}
                               onClick={() => setFormData({...formData, bodyCondition: v as 1|2|3|4|5})}
                               className={cn(
                                 "py-4 rounded-2xl border-2 font-bold transition-all",
                                 formData.bodyCondition === v ? "bg-primary border-primary text-white" : "border-gray-100 text-gray-300 hover:border-amber-200"
                               )}
                             >
                               {v}
                               <span className="block text-[10px] font-normal">
                                 {v === 1 ? 'Thin' : v === 3 ? 'Ideal' : v === 5 ? 'Obese' : ''}
                               </span>
                             </button>
                           ))}
                        </div>
                    </div>
                 </div>
               </motion.div>
             )}

             {step === 4 && (
               <motion.div 
                 key="step4"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-8"
               >
                 <div className="text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 scale-125">
                       <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-4xl font-display font-bold text-text-main mb-2">Calculation Complete</h2>
                    <p className="text-gray-400">Based on the data, here is your cat's recommended daily feeding.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary-warm p-8 rounded-[32px] border border-amber-100">
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md">
                          <Calculator className="text-primary w-8 h-8" />
                       </div>
                       <div>
                          <p className="text-2xl font-display font-black text-text-main">{calculateTargets().dailyCalorieTarget} <span className="text-sm font-medium">kcal/day</span></p>
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Daily Calorie Target</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md">
                          <Scale className="text-primary w-8 h-8" />
                       </div>
                       <div>
                          <p className="text-2xl font-display font-black text-primary">{calculateTargets().dailyGramTarget} <span className="text-sm font-medium">grams/day</span></p>
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Recommended Food</p>
                       </div>
                    </div>
                 </div>

                 <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex gap-4 items-start">
                    <Info className="text-blue-500 w-6 h-6 shrink-0" />
                    <p className="text-sm text-blue-800 leading-relaxed">
                       <strong>FLUTD Warning:</strong> Maintaining an ideal weight reduces pressure on the urinary system. 
                       This plan is optimized for prevention. Ensure fresh water is always available.
                    </p>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           <div className="mt-12 flex justify-between gap-4">
             {step > 1 && (
               <button 
                 disabled={loading}
                 onClick={() => setStep(step - 1)}
                 className="btn-secondary px-8"
               >
                 Back
               </button>
             )}
             <button 
               disabled={loading || (step === 1 && !formData.name)}
               onClick={handleNext}
               className={cn("btn-primary flex-1 py-5", step === 1 && "ml-auto")}
             >
               {step === 4 ? (loading ? 'Finalizing Profile...' : 'Launch Dashboard') : 'Continue Setup'}
               <ChevronRight className="w-5 h-5 ml-2" />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
