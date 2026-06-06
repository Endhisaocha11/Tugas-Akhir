import { motion } from 'motion/react';
import { RefreshCw, WifiOff } from 'lucide-react';

// ── Sad Cat SVG (front view, sitting, with tears) ─────────────────────────────

function SadCatSVG() {
  const tearAnim = (delay: number) => ({
    animate: { y: [0, 8, 0], opacity: [0.7, 1, 0.7] },
    transition: { duration: 1.8, repeat: Infinity, delay, ease: 'easeInOut' as const },
  });

  return (
    <svg width="134" height="145" viewBox="0 0 134 145" fill="none">
      {/* Body */}
      <ellipse cx="67" cy="106" rx="44" ry="36" fill="#FBBF24"/>
      {/* Tummy */}
      <ellipse cx="67" cy="109" rx="26" ry="22" fill="#FDE68A" opacity="0.65"/>

      {/* Head */}
      <circle cx="67" cy="58" r="40" fill="#FBBF24"/>

      {/* Left ear */}
      <polygon points="32,25 23,5 48,21" fill="#F59E0B"/>
      <polygon points="33,24 26,8 45,21" fill="#FDE68A"/>
      {/* Right ear */}
      <polygon points="102,25 111,5 86,21" fill="#F59E0B"/>
      <polygon points="101,24 108,8 89,21" fill="#FDE68A"/>

      {/* Sad eyebrows (angled inward = sad) */}
      <path d="M42 41 Q52 36 60 43" stroke="#92400E" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      <path d="M74 43 Q82 36 92 41" stroke="#92400E" strokeWidth="2.8" fill="none" strokeLinecap="round"/>

      {/* Left eye */}
      <ellipse cx="52" cy="55" rx="8.5" ry="9.5" fill="#1F2937"/>
      <circle  cx="54"  cy="51"  r="3"    fill="white"/>
      {/* Right eye */}
      <ellipse cx="82" cy="55" rx="8.5" ry="9.5" fill="#1F2937"/>
      <circle  cx="84"  cy="51"  r="3"    fill="white"/>

      {/* Tear drops */}
      <motion.g {...tearAnim(0.4)}>
        <ellipse cx="48" cy="67" rx="3.2" ry="5.5" fill="#BAE6FD" opacity="0.9"/>
      </motion.g>
      <motion.g {...tearAnim(0.95)}>
        <ellipse cx="86" cy="67" rx="3.2" ry="5.5" fill="#BAE6FD" opacity="0.9"/>
      </motion.g>

      {/* Nose */}
      <ellipse cx="67" cy="67" rx="5" ry="3.5" fill="#FDA4AF"/>

      {/* Sad mouth (frown) */}
      <path d="M55 77 Q67 72 79 77"
        stroke="#9CA3AF" strokeWidth="2.4" fill="none" strokeLinecap="round"/>

      {/* Whiskers */}
      <line x1="22" y1="63" x2="52" y2="67" stroke="#D1D5DB" strokeWidth="1.6"/>
      <line x1="22" y1="70" x2="52" y2="70" stroke="#D1D5DB" strokeWidth="1.6"/>
      <line x1="112" y1="63" x2="82" y2="67" stroke="#D1D5DB" strokeWidth="1.6"/>
      <line x1="112" y1="70" x2="82" y2="70" stroke="#D1D5DB" strokeWidth="1.6"/>

      {/* Blush */}
      <ellipse cx="46" cy="71" rx="9"  ry="5.5" fill="#FCA5A5" opacity="0.25"/>
      <ellipse cx="88" cy="71" rx="9"  ry="5.5" fill="#FCA5A5" opacity="0.25"/>

      {/* Front paws (sitting pose) */}
      <ellipse cx="47" cy="140" rx="18" ry="11" fill="#F59E0B"/>
      <ellipse cx="87" cy="140" rx="18" ry="11" fill="#F59E0B"/>
      {/* Paw toes left */}
      <circle cx="40" cy="136" r="4.5" fill="#FBBF24"/>
      <circle cx="47" cy="134" r="4.5" fill="#FBBF24"/>
      <circle cx="54" cy="136" r="4.5" fill="#FBBF24"/>
      {/* Paw toes right */}
      <circle cx="80" cy="136" r="4.5" fill="#FBBF24"/>
      <circle cx="87" cy="134" r="4.5" fill="#FBBF24"/>
      <circle cx="94" cy="136" r="4.5" fill="#FBBF24"/>
    </svg>
  );
}

// ── ErrorPage ─────────────────────────────────────────────────────────────────

export function ErrorPage({
  onRetry,
  message,
}: {
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FFFBF7] px-6">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-sm w-full text-center"
      >

        {/* Floating sad cat */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex justify-center mb-2"
        >
          <SadCatSVG/>
        </motion.div>

        {/* WiFi-off badge */}
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 230, damping: 16 }}
          className="w-14 h-14 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5"
        >
          <WifiOff className="w-7 h-7 text-red-400"/>
        </motion.div>

        <h1 className="text-3xl font-black text-gray-900 mb-2 leading-tight">
          Gagal Memuat
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          {message ?? (
            <>
              Ups! Kucing kamu sedang menunggu,<br/>
              tapi koneksi bermasalah.<br/>
              Periksa internet kamu lalu coba lagi.
            </>
          )}
        </p>

        <div className="flex flex-col gap-3">
          {onRetry && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onRetry}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-black px-6 py-3.5 rounded-2xl w-full transition-colors shadow-sm shadow-amber-200/60"
            >
              <RefreshCw className="w-4 h-4"/>
              Coba Lagi
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-500 font-bold px-6 py-3.5 rounded-2xl w-full transition-colors border border-gray-100"
          >
            Muat Ulang Halaman
          </motion.button>
        </div>

        <p className="text-xs text-gray-300 mt-8 font-medium tracking-wide">
          PawfectCare · Smart Cat Feeder
        </p>
      </motion.div>
    </div>
  );
}
