import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

function useFakeProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const t = Math.min((Date.now() - t0) / 9000, 1);
      setPct((1 - Math.pow(1 - t, 2.3)) * 88);
    }, 60);
    return () => clearInterval(id);
  }, []);
  return pct;
}

function BowlSilhouette({ color = '#1C1008' }: { color?: string }) {
  return (
    <svg width="86" height="80" viewBox="0 0 86 80" fill="none">
      <path d="M7 33 Q5 72 43 74 Q81 72 79 33 Z" fill={color} />
      <ellipse cx="43" cy="33" rx="36" ry="9.5" fill={color} />
      <ellipse cx="43" cy="33" rx="25" ry="5" fill="white" opacity="0.09" />
      <ellipse cx="43" cy="56" rx="9.5" ry="7.5" fill="white" opacity="0.28" />
      <circle cx="29" cy="44" r="4.5" fill="white" opacity="0.28" />
      <circle cx="38" cy="38" r="4.5" fill="white" opacity="0.28" />
      <circle cx="48" cy="38" r="4.5" fill="white" opacity="0.28" />
      <circle cx="57" cy="44" r="4.5" fill="white" opacity="0.28" />
      <rect x="31" y="74" width="24" height="5.5" rx="2.75" fill={color} />
    </svg>
  );
}

export function CatLoader({ text = 'Memuat PawfectCare...' }: { text?: string }) {
  const progress = useFakeProgress();

  const stageRef = useRef<HTMLDivElement>(null);
  const bowlRef  = useRef<HTMLDivElement>(null);
  const catRef   = useRef<HTMLImageElement>(null);
  const [catMaxPct, setCatMaxPct] = useState(52);

  useEffect(() => {
    const update = () => {
      if (!stageRef.current || !bowlRef.current) return;
      const s = stageRef.current.getBoundingClientRect();
      const b = bowlRef.current.getBoundingClientRect();
      const catW = catRef.current?.offsetWidth ?? 88;
      const maxPx = b.left - s.left - catW - 12;
      setCatMaxPct(Math.max(6, Math.min(80, (maxPx / s.width) * 100)));
    };
    const tid = setTimeout(update, 80);
    window.addEventListener('resize', update);
    return () => { clearTimeout(tid); window.removeEventListener('resize', update); };
  }, []);

  const catLeftPct = 5 + (progress / 88) * (catMaxPct - 5);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-warm">

      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm shadow-amber-200/70">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
            <circle cx="5"  cy="5"  r="2.2" />
            <circle cx="10" cy="3"  r="2.2" />
            <circle cx="15" cy="5"  r="2.2" />
            <circle cx="3"  cy="10" r="2.2" />
            <ellipse cx="10" cy="13" rx="5.5" ry="5" />
          </svg>
        </div>
        <span className="text-2xl font-black text-gray-800 tracking-tight">PawfectCare</span>
      </div>

      {/* Scene */}
      <div className="relative w-full max-w-lg px-6">

        <p className="text-center text-base font-semibold text-gray-400 mb-6 tracking-wide">
          {text}
        </p>

        <div ref={stageRef} className="cl-stage">

          {/* Ground line */}
          <div className="cl-ground-line" />

          {/* Bowl — fixed at right */}
          <div ref={bowlRef} className="absolute right-0 bottom-0">
            <BowlSilhouette />
          </div>

          {/* Shadow under cat */}
          <motion.div
            className="cl-cat-shadow"
            animate={{ left: `calc(${catLeftPct}% + 16px)` }}
            transition={{ duration: 0.12, ease: 'linear' }}
          />

          {/* Cat GIF — walks left→right */}
          <motion.div
            className="absolute bottom-0"
            animate={{ left: `${catLeftPct}%` }}
            transition={{ duration: 0.12, ease: 'linear' }}
          >
            <img
              ref={catRef}
              src="/load.gif"
              alt="loading cat"
              className="h-28 w-auto object-contain"
              onLoad={() => {
                if (!stageRef.current || !bowlRef.current || !catRef.current) return;
                const s = stageRef.current.getBoundingClientRect();
                const b = bowlRef.current.getBoundingClientRect();
                const catW = catRef.current.offsetWidth;
                const maxPx = b.left - s.left - catW - 12;
                setCatMaxPct(Math.max(6, Math.min(80, (maxPx / s.width) * 100)));
              }}
            />
          </motion.div>

        </div>

        {/* Progress bar */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-amber-400"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.12, ease: 'linear' }}
            />
          </div>
          <div className="flex gap-1.5">
            {[0, 0.18, 0.36].map((d, i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-400 block"
                animate={{ scale: [1, 1.7, 1], opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 0.78, repeat: Infinity, delay: d }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
