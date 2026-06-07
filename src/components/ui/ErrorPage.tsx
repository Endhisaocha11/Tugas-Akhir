import { motion } from 'motion/react';
import { RefreshCw, WifiOff } from 'lucide-react';

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

        <div className="flex justify-center mb-4">
          <img src="/kucingeror.gif" alt="error cat" className="w-64 h-64 object-contain" />
        </div>

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
