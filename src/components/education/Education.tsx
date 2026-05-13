import React from 'react';
import { BookOpen, AlertCircle, Droplets, Utensils, Heart, Info, ArrowRight, Calculator, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export function Education() {
  const articles = [
    {
      title: "Understanding FLUTD",
      category: "Health",
      desc: "Feline Lower Urinary Tract Disease is a complex condition often linked to nutrition and stress.",
      image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400",
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-50"
    },
    {
      title: "The Formula for Health",
      category: "Nutrition",
      desc: "Learn how we calculate the exact grams for your cat's weight and activity level.",
      image: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&q=80&w=400",
      icon: CalculatorIcon,
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    {
      title: "Hydration Matters",
      category: "Prevention",
      desc: "Why water intake is the #1 defense against crystals and blockages.",
      image: "https://images.unsplash.com/photo-1573865668133-f560c55a3e9b?auto=format&fit=crop&q=80&w=400",
      icon: Droplets,
      color: "text-blue-500",
      bg: "bg-blue-50"
    }
  ];

  return (
    <div className="space-y-12">
      <div className="max-w-2xl">
        <h2 className="text-4xl font-display font-black text-text-main mb-4 leading-tight">
          Knowledge is the best <br />
          <span className="text-primary italic">Health Insurance.</span>
        </h2>
        <p className="text-gray-400 text-lg">Deep dive into feline health, nutrition metrics, and technical guides for your Smart Feeder.</p>
      </div>

      {/* Featured Articles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {articles.map((art, idx) => (
          <motion.div 
            whileHover={{ y: -10 }}
            key={idx} 
            className="card-premium p-0 overflow-hidden flex flex-col group"
          >
            <div className="h-48 relative overflow-hidden">
               <img src={art.image} alt={art.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
               <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-wider text-text-main shadow-sm border border-white/50">
                    {art.category}
                  </span>
               </div>
            </div>
            <div className="p-8 flex-1">
               <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", art.bg)}>
                  <art.icon className={cn("w-6 h-6", art.color)} />
               </div>
               <h3 className="text-2xl font-display font-bold text-text-main mb-3">{art.title}</h3>
               <p className="text-sm text-gray-400 leading-relaxed mb-6">{art.desc}</p>
               <button className="flex items-center gap-2 text-primary font-bold text-sm group-hover:gap-4 transition-all">
                  Read Article <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* The Formula Section */}
      <div className="bg-white rounded-[48px] p-12 border border-amber-100/50 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-5">
            <CalculatorIcon className="w-64 h-64 text-text-main" />
         </div>
         
         <div className="relative z-10 max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-14 h-14 bg-secondary-warm rounded-2xl flex items-center justify-center border border-amber-100">
                  <Heart className="text-primary w-7 h-7" />
               </div>
               <h3 className="text-3xl font-display font-black text-text-main">The Scientific Feeding Formula</h3>
            </div>

            <div className="bg-bg-warm p-10 rounded-[40px] border border-amber-50 mb-10 text-center">
               <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Core Calculation Algorithm</p>
               <h4 className="text-4xl md:text-5xl font-display font-black text-text-main tracking-tight leading-relaxed">
                 Gram = <span className="bg-amber-100/50 px-4 py-2 rounded-2xl">(Fm × Fg × Fo × 70(BB)⁰·⁷⁵)</span> / E
               </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[
                 { label: 'Fm', title: 'Metabolism Factor', desc: 'Adjusts for neutering and hormone levels.' },
                 { label: 'Fg', title: 'Growth Factor', desc: 'Accounts for age and development stage.' },
                 { label: 'Fo', title: 'Activity Factor', desc: 'Indoor, outdoor, or sedentary status.' },
                 { label: 'BB', title: 'Body Weight', desc: 'Current mass in kilograms.' },
                 { label: 'E', title: 'Energy Density', desc: 'Kcal per gram of your specific pet food.' },
               ].map((item) => (
                 <div key={item.label} className="p-6 rounded-3xl bg-secondary-warm/30 border border-amber-50 hover:bg-white hover:shadow-md transition-all">
                    <span className="text-2xl font-display font-black text-primary mb-2 block">{item.label}</span>
                    <p className="font-bold text-text-main mb-1">{item.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">{item.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Prevention Banner */}
      <div className="card-premium bg-primary p-12 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
         <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
         
         <div className="md:w-1/3 relative z-10">
            <img src="https://images.unsplash.com/photo-1571566882372-1598d83abe80?auto=format&fit=crop&q=80&w=400" className="w-full h-80 object-cover rounded-[32px] rotate-3 shadow-2xl" alt="Prevention" />
         </div>

         <div className="md:w-2/3 relative z-10 space-y-6">
            <h3 className="text-4xl font-display font-black text-white leading-tight">FLUTD Prevention <br />Starting with Data.</h3>
            <p className="text-white/80 text-lg font-light leading-relaxed">
              Our system doesn't just dispense food; it regulates metabolic patterns to keep urinary pH levels stable. 
              Proper portioning is the #1 tool recommended by veterinarians for indoor cats.
            </p>
            <div className="flex gap-4 pt-4">
               <div className="flex items-center gap-2 text-white bg-white/20 px-4 py-2 rounded-xl text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Balanced pH
               </div>
               <div className="flex items-center gap-2 text-white bg-white/20 px-4 py-2 rounded-xl text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Weight Maintenance
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function CalculatorIcon({ className }: { className?: string }) {
  return <Calculator className={className} />;
}
