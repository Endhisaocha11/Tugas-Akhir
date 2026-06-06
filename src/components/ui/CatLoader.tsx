import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

// ── Fake progress 0 → 88% over ~9 s ─────────────────────────────────────────
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

// ── Walking leg / tail CSS keyframes (injected once via <style>) ──────────────
const WALK_CSS = `
  @keyframes cw-la { 0%,100%{transform:rotate(-24deg)} 50%{transform:rotate(22deg)} }
  @keyframes cw-lb { 0%,100%{transform:rotate(22deg)}  50%{transform:rotate(-24deg)} }
  @keyframes cw-t  { 0%,100%{transform:rotate(-14deg)} 50%{transform:rotate(14deg)}  }
  .cw-la { animation:cw-la 0.44s ease-in-out infinite; transform-box:fill-box; transform-origin:50% 0%; }
  .cw-lb { animation:cw-lb 0.44s ease-in-out infinite; transform-box:fill-box; transform-origin:50% 0%; }
  .cw-t  { animation:cw-t  0.80s ease-in-out infinite; transform-box:fill-box; transform-origin:28% 95%; }
`;

// ── Cat silhouette — side view, facing right ──────────────────────────────────
function CatSilhouette({ color = '#1C1008' }: { color?: string }) {
  return (
    <>
      <style>{WALK_CSS}</style>
      <svg width="96" height="78" viewBox="0 0 96 78" fill="none">
        {/* Tail */}
        <g className="cw-t">
          <path
            d="M74 42 C88 30 90 14 80 7 C75 3 66 7 68 15"
            stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"
          />
        </g>
        {/* Body */}
        <ellipse cx="48" cy="52" rx="27" ry="18" fill={color} />
        {/* Neck */}
        <ellipse cx="25" cy="40" rx="12" ry="9" fill={color} />
        {/* Head */}
        <circle cx="15" cy="25" r="18" fill={color} />
        {/* Ears */}
        <polygon points="5,12 1,0 15,10"  fill={color} />
        <polygon points="21,10 28,0 33,10" fill={color} />
        {/* Legs — alternating phases */}
        <g className="cw-la"><rect x="22" y="66" width="11" height="13" rx="5.5" fill={color} /></g>
        <g className="cw-lb"><rect x="36" y="66" width="11" height="13" rx="5.5" fill={color} /></g>
        <g className="cw-lb"><rect x="56" y="66" width="11" height="13" rx="5.5" fill={color} /></g>
        <g className="cw-la"><rect x="70" y="66" width="11" height="13" rx="5.5" fill={color} /></g>
      </svg>
    </>
  );
}

// ── Bowl silhouette with paw-print ────────────────────────────────────────────
function BowlSilhouette({ color = '#1C1008' }: { color?: string }) {
  return (
    <svg width="80" height="65" viewBox="0 0 80 65" fill="none">
      <path d="M4 30 Q4 62 40 62 Q76 62 76 30 Z" fill={color} />
      <path d="M11 30 Q11 52 40 52 Q69 52 69 30 Z" fill={color} opacity="0.48" />
      <ellipse cx="40" cy="30" rx="36" ry="8.5" fill={color} />
      {/* Paw print */}
      <circle cx="40" cy="24"   r="5.5" fill="white" opacity="0.22" />
      <circle cx="30" cy="17"   r="3.5" fill="white" opacity="0.22" />
      <circle cx="40" cy="14.5" r="3.5" fill="white" opacity="0.22" />
      <circle cx="50" cy="17"   r="3.5" fill="white" opacity="0.22" />
      {/* Base */}
      <rect x="31" y="62" width="18" height="5" rx="2.5" fill={color} />
    </svg>
  );
}

// ── CatLoader ─────────────────────────────────────────────────────────────────
export function CatLoader({ text = 'Memuat PawfectCare...' }: { text?: string }) {
  const progress = useFakeProgress();

  const stageRef = useRef<HTMLDivElement>(null);
  const bowlRef  = useRef<HTMLDivElement>(null);
  const [catMaxPct, setCatMaxPct] = useState(55);

  // Calculate max left% so the cat stops just before the bowl on any screen size
  useEffect(() => {
    const update = () => {
      if (!stageRef.current || !bowlRef.current) return;
      const s = stageRef.current.getBoundingClientRect();
      const b = bowlRef.current.getBoundingClientRect();
      const maxPx = b.left - s.left - 96 - 16; // 96 = cat width, 16 = gap
      setCatMaxPct(Math.max(8, Math.min(82, (maxPx / s.width) * 100)));
    };
    const tid = setTimeout(update, 40);
    window.addEventListener('resize', update);
    return () => { clearTimeout(tid); window.removeEventListener('resize', update); };
  }, []);

  // Cat x: 5% → catMaxPct% as progress goes 0 → 88
  const catLeftPct = 5 + (progress / 88) * (catMaxPct - 5);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-warm">

      {/* ── Brand ── */}
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

      {/* ── Scene ── */}
      <div className="relative w-full max-w-lg px-6">

        <p className="text-center text-base font-semibold text-gray-400 mb-6 tracking-wide">
          {text}
        </p>

        {/* Stage — cat and bowl share this coordinate space */}
        <div ref={stageRef} className="cl-stage">

          {/* Ground line */}
          <div className="cl-ground-line" />

          {/* Bowl — fixed at right */}
          <div ref={bowlRef} className="absolute right-0 bottom-0">
            <BowlSilhouette />
          </div>

          {/* Cat shadow — follows cat x via motion */}
          <motion.div
            className="cl-cat-shadow"
            animate={{ left: `calc(${catLeftPct}% + 14px)` }}
            transition={{ duration: 0.12, ease: 'linear' }}
          />

          {/* Cat — moves left → right as progress increases */}
          <motion.div
            className="absolute bottom-0"
            animate={{ left: `${catLeftPct}%` }}
            transition={{ duration: 0.12, ease: 'linear' }}
          >
            {/* scaleX(-1) flips the cat so the head faces right (toward the bowl) */}
            <div className="transform-[scaleX(-1)]">
              <CatSilhouette />
            </div>
          </motion.div>

        </div>

        {/* ── Progress bar + dots ── */}
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
