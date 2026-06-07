import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { UserRole } from '../../types';
import { Cat, ArrowRight, Mail, Lock, Eye, EyeOff, ShieldCheck, User, Zap } from 'lucide-react';

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRegisterHint, setShowRegisterHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRolePopup, setShowRolePopup] = useState(false);
  const [role, setRole] = useState<string>(UserRole.USER);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowRegisterHint(false);

    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        if (snap.exists()) {
          setRole(snap.data().role || UserRole.USER);
        }
        setShowRolePopup(true);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: cred.user.email,
          role: UserRole.USER,
          onboardingCompleted: false,
          createdAt: Date.now(),
        });
        setRole(UserRole.USER);
        setShowRolePopup(true);
      }
    } catch (err: any) {
      console.error('Auth error code:', err.code, '| message:', err.message);
      const isInvalidCred = err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password';
      if (isLogin && isInvalidCred) {
        setError('Email belum terdaftar atau password salah.');
        setShowRegisterHint(true);
      } else {
        const msgs: Record<string, string> = {
          'auth/email-already-in-use': 'Email sudah digunakan, silakan masuk.',
          'auth/weak-password': 'Password minimal 6 karakter.',
          'auth/invalid-email': 'Format email tidak valid — pastikan email ditulis lengkap (contoh: nama@mail.ugm.ac.id)',
          'auth/network-request-failed': 'Gagal terhubung ke server. Periksa koneksi internet.',
          'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
          'auth/operation-not-allowed': 'Metode login ini belum diaktifkan. Hubungi admin.',
        };
        setError(msgs[err.code] || `Terjadi kesalahan (${err.code ?? 'unknown'}), coba lagi`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/user-not-found': 'Tidak ada akun dengan email tersebut.',
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/network-request-failed': 'Gagal terhubung ke server. Periksa koneksi internet.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
      };
      setResetError(msgs[err.code] || `Gagal mengirim email (${err.code ?? 'unknown'})`);
    } finally {
      setResetLoading(false);
    }
  };

  const isAdmin = role === UserRole.SUPER_ADMIN;

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-700 via-orange-600 to-yellow-500 relative overflow-hidden flex-col justify-between p-16">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
              <Cat className="w-8 h-8 text-amber-700" />
            </div>
            <h1 className="text-4xl font-black text-white">PawfectCare</h1>
          </div>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-6xl font-black text-white leading-tight mb-6">
              Smart Feeding<br />For Your Cat 🐾
            </h2>
            <p className="text-white/80 text-xl leading-relaxed max-w-lg">
              Sistem PawfectCare berbasis IoT untuk monitoring kesehatan
              dan nutrisi kucing secara real-time.
            </p>
          </motion.div>
        </div>

        <div className="flex gap-5">
          {[
            { val: '98%', label: 'Feeding Accuracy' },
            { val: 'Real-time', label: 'Monitoring' },
            { val: 'IoT', label: 'ESP32 Connected' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <h3 className="text-white text-2xl font-black">{s.val}</h3>
              <p className="text-white/70 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full lg:w-1/2 bg-amber-50 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">

          {/* ── FORGOT PASSWORD PANEL ── */}
          {isForgotPassword ? (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[40px] p-6 md:p-10 shadow-2xl border border-amber-100"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Mail className="w-10 h-10 text-amber-700" />
                </div>
                <h2 className="text-3xl font-black text-amber-900">Reset Password</h2>
                <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                  Masukkan email akun Anda. Kami akan mengirimkan link untuk membuat password baru.
                </p>
              </div>

              {resetSent ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
                  <h3 className="text-xl font-black text-green-800">Email Terkirim!</h3>
                  <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                    Link reset password sudah dikirim ke <span className="font-bold text-amber-800">{resetEmail}</span>.
                    Cek inbox atau folder spam Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setResetSent(false); setResetEmail(''); setResetError(''); }}
                    className="mt-6 w-full bg-amber-700 hover:bg-amber-800 text-white py-4 rounded-2xl font-bold transition-all"
                  >
                    Kembali ke Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="reset-email" className="text-sm font-bold text-gray-600">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Masukkan email akun Anda"
                        required
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-transparent focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                      {resetError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-amber-700 hover:bg-amber-800 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {resetLoading ? 'Mengirim...' : 'Kirim Link Reset'}
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setResetError(''); setResetEmail(''); }}
                    className="w-full text-gray-400 hover:text-amber-700 text-sm font-bold py-2 transition-colors"
                  >
                    ← Kembali ke Login
                  </button>
                </form>
              )}
            </motion.div>

          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[40px] p-6 md:p-10 shadow-2xl border border-amber-100"
            >
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Cat className="w-10 h-10 text-amber-700" />
                </div>
                <h2 className="text-4xl font-black text-amber-900">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-gray-400 mt-3">
                  {isLogin
                    ? 'Masuk ke dashboard PawfectCare'
                    : 'Daftar akun baru untuk monitoring kucing'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-bold text-gray-600">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Masukkan email"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-transparent focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-bold text-gray-600">Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setResetEmail(email); setResetError(''); setResetSent(false); }}
                        className="text-xs text-amber-700 font-bold hover:underline"
                      >
                        Lupa Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full pl-12 pr-14 py-4 rounded-2xl bg-gray-50 border border-transparent focus:border-amber-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 space-y-1.5">
                    <p className="text-red-600 text-sm">{error}</p>
                    {showRegisterHint && (
                      <p className="text-xs text-red-500">
                        Belum punya akun?{' '}
                        <button
                          type="button"
                          onClick={() => { setIsLogin(false); setError(''); setShowRegisterHint(false); }}
                          className="font-black text-amber-700 underline underline-offset-2 hover:text-amber-800"
                        >
                          Daftar sekarang
                        </button>
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : isLogin ? 'Masuk Dashboard' : 'Buat Akun'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-400">
                  {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
                  <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="ml-2 text-amber-700 font-bold hover:underline"
                  >
                    {isLogin ? 'Daftar' : 'Login'}
                  </button>
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── ROLE POPUP ── */}
      <AnimatePresence>
        {showRolePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-5"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
            >
              {/* HEADER */}
              <div className={`relative p-6 md:p-10 text-white text-center overflow-hidden ${
                isAdmin
                  ? 'bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-600'
                  : 'bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-500'
              }`}>
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full" />
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-5 border border-white/20">
                    {isAdmin
                      ? <ShieldCheck className="w-12 h-12" />
                      : <User className="w-12 h-12" />}
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 border border-white/30 mb-4">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-xs font-black uppercase tracking-widest">
                      {isAdmin ? 'Super Admin' : 'User'}
                    </span>
                  </div>
                  <h2 className="text-4xl font-black">
                    {isAdmin ? 'Admin Access 🛡️' : 'Welcome! 👋'}
                  </h2>
                  <p className="text-white/80 mt-3 leading-relaxed">
                    {isAdmin
                      ? 'Kamu memiliki akses penuh ke seluruh fitur PawfectCare.'
                      : 'Akun berhasil masuk. Pilih mode yang ingin digunakan.'}
                  </p>
                </div>
              </div>

              {/* BODY */}
              <div className="p-8">
                {isAdmin ? (
                  <div className="space-y-4">
                    {[
                      { icon: '📡', label: 'Monitoring Realtime', desc: 'Pantau sensor, servo, stok pakan, device online/offline.' },
                      { icon: '🎛️', label: 'Feeding Control', desc: 'Atur jadwal dan porsi makan otomatis/manual via ESP32.' },
                      { icon: '🗄️', label: 'Kelola Database', desc: 'Tambah device IoT, data kucing, dan kelola seluruh user.' },
                    ].map((f) => (
                      <div key={f.label} className="flex items-start gap-4 bg-violet-50 border border-violet-100 rounded-2xl p-4">
                        <span className="text-2xl">{f.icon}</span>
                        <div>
                          <p className="font-black text-violet-900">{f.label}</p>
                          <p className="text-sm text-violet-700 mt-0.5">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { icon: '👁️', label: 'Monitor Device Admin', desc: 'Pantau dashboard feeding kucing yang dikelola admin.' },
                      { icon: '🧮', label: 'Simulasi Perhitungan', desc: 'Hitung kebutuhan makan kucing dan unduh hasilnya sebagai CSV.' },
                    ].map((f) => (
                      <div key={f.label} className="flex items-start gap-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <span className="text-2xl">{f.icon}</span>
                        <div>
                          <p className="font-black text-amber-900">{f.label}</p>
                          <p className="text-sm text-amber-700 mt-0.5">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700 leading-relaxed">
                      💡 Ingin mencoba alat PawfectCare secara langsung?{' '}
                      <span className="font-black">Silakan hubungi admin.</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!isAdmin) {
                      localStorage.removeItem('appMode');
                      localStorage.removeItem('selectedAdminId');
                      localStorage.removeItem('selectedAdminEmail');
                      localStorage.removeItem('catProfile');
                    }
                    window.location.reload();
                  }}
                  className={`mt-6 w-full py-5 rounded-2xl text-white font-black transition-all ${
                    isAdmin
                      ? 'bg-violet-700 hover:bg-violet-800'
                      : 'bg-amber-700 hover:bg-amber-800'
                  }`}
                >
                  {isAdmin ? 'Masuk Dashboard Admin →' : 'Lanjutkan →'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}