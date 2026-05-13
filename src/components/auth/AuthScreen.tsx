import React, { useState } from 'react';

import {
  motion,
  AnimatePresence,
} from 'motion/react';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

import {
  auth,
  db,
} from '../../lib/firebase';

import { UserRole } from '../../types';

import {
  Cat,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
} from 'lucide-react';

export function AuthScreen() {

  // =========================
  // STATE
  // =========================

  const [isLogin, setIsLogin] =
    useState(true);

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showRolePopup,
    setShowRolePopup,
  ] = useState(false);

  const [role, setRole] =
    useState('USER');

  const [
    selectedMonitor,
    setSelectedMonitor,
  ] = useState('');

  const [isNewUser, setIsNewUser] =
    useState(false);

  // =========================
  // HANDLE SUBMIT
  // =========================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setLoading(true);

    setError('');

    try {

      // =========================
      // LOGIN
      // =========================

      if (isLogin) {

        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );

        const uid =
          userCredential.user.uid;

        // GET USER DATA

        const userSnap =
          await getDoc(
            doc(db, 'users', uid)
          );

        if (
          userSnap.exists()
        ) {

          const data =
            userSnap.data();

          const userRole =
            data.role || 'USER';

          setRole(userRole);

          setIsNewUser(
            data.onboardingCompleted === false
          );

          setShowRolePopup(true);
        }
      }

      // =========================
      // REGISTER
      // =========================

      else {

        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

        const { user } =
          userCredential;

        await setDoc(
          doc(
            db,
            'users',
            user.uid
          ),
          {
            uid: user.uid,

            email: user.email,

            role:
              UserRole.USER,

            onboardingCompleted:
              false,

            createdAt:
              Date.now(),
          }
        );

        setRole('USER');

        setIsNewUser(true);

        setShowRolePopup(true);
      }

    } catch (err: any) {

      console.error(err);

      switch (err.code) {

        case 'auth/user-not-found':

          setError(
            'Tidak ada akun dengan email tersebut'
          );

          break;

        case 'auth/wrong-password':

          setError(
            'Password salah'
          );

          break;

        case 'auth/invalid-credential':

          setError(
            'Email atau password salah'
          );

          break;

        case 'auth/email-already-in-use':

          setError(
            'Email sudah digunakan'
          );

          break;

        case 'auth/weak-password':

          setError(
            'Password minimal 6 karakter'
          );

          break;

        case 'auth/invalid-email':

          setError(
            'Format email tidak valid'
          );

          break;

        default:

          setError(
            'Terjadi kesalahan'
          );
      }

    } finally {

      setLoading(false);
    }
  };

  // =========================
  // UI
  // =========================

  return (

    <div className="min-h-screen flex">

      {/* LEFT */}

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-700 via-orange-600 to-yellow-500 relative overflow-hidden flex-col justify-between p-16">

        <div>

          <div className="flex items-center gap-3 mb-10">

            <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-2xl">

              <Cat className="w-8 h-8 text-amber-700" />

            </div>

            <h1 className="text-4xl font-black text-white">
              FelineGuard
            </h1>
          </div>

          <motion.div
            initial={{
              opacity: 0,
              x: -30,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
          >

            <h2 className="text-6xl font-black text-white leading-tight mb-6">
              Smart Feeding
              <br />
              For Your Cat 🐾
            </h2>

            <p className="text-white/80 text-xl leading-relaxed max-w-lg">
              Sistem Smart Cat Feeder
              modern berbasis IoT untuk
              monitoring kesehatan dan
              nutrisi kucing secara
              real-time.
            </p>

          </motion.div>
        </div>

        <div className="flex gap-5">

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">

            <h3 className="text-white text-3xl font-black">
              98%
            </h3>

            <p className="text-white/70 text-sm mt-1">
              Feeding Accuracy
            </p>

          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">

            <h3 className="text-white text-3xl font-black">
              Real-time
            </h3>

            <p className="text-white/70 text-sm mt-1">
              Monitoring
            </p>

          </div>
        </div>

        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/20 rounded-full blur-3xl" />

      </div>

      {/* RIGHT */}

      <div className="w-full lg:w-1/2 bg-amber-50 flex items-center justify-center p-8">

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-amber-100"
        >

          {/* HEADER */}

          <div className="text-center mb-10">

            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">

              <Cat className="w-10 h-10 text-amber-700" />

            </div>

            <h2 className="text-4xl font-black text-amber-900">

              {isLogin
                ? 'Welcome Back'
                : 'Create Account'}

            </h2>

            <p className="text-gray-400 mt-3">

              {isLogin
                ? 'Masuk ke dashboard Smart Cat Feeder'
                : 'Daftar akun baru untuk monitoring kucing'}

            </p>
          </div>

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* EMAIL */}

            <div className="space-y-2">

              <label
                htmlFor="email"
                className="text-sm font-bold text-gray-600"
              >
                Email
              </label>

              <div className="relative">

                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  placeholder="Masukkan email"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-transparent focus:border-amber-400 outline-none"
                />

              </div>
            </div>

            {/* PASSWORD */}

            <div className="space-y-2">

              <label
                htmlFor="password"
                className="text-sm font-bold text-gray-600"
              >
                Password
              </label>

              <div className="relative">

                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />

                <input
                  id="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Masukkan password"
                  className="w-full pl-12 pr-14 py-4 rounded-2xl bg-gray-50 border border-transparent focus:border-amber-400 outline-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-700"
                >

                  {showPassword ? (

                    <EyeOff className="w-5 h-5" />

                  ) : (

                    <Eye className="w-5 h-5" />

                  )}

                </button>
              </div>
            </div>

            {/* ERROR */}

            {error && (

              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                {error}
              </div>

            )}

            {/* BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >

              {loading
                ? 'Processing...'
                : isLogin
                ? 'Masuk Dashboard'
                : 'Buat Akun'}

              <ArrowRight className="w-5 h-5" />

            </button>
          </form>

          {/* SWITCH */}

          <div className="mt-8 text-center">

            <p className="text-gray-400">

              {isLogin
                ? 'Belum punya akun?'
                : 'Sudah punya akun?'}

              <button
                onClick={() =>
                  setIsLogin(
                    !isLogin
                  )
                }
                className="ml-2 text-amber-700 font-bold hover:underline"
              >

                {isLogin
                  ? 'Daftar'
                  : 'Login'}

              </button>
            </p>
          </div>
        </motion.div>
      </div>

      {/* POPUP */}

      <AnimatePresence>

        {showRolePopup && (

          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-5"
          >

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.85,
                y: 40,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              transition={{
                type: 'spring',
                damping: 20,
                stiffness: 200,
              }}
              className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
            >

              {/* HEADER */}

              <div className="relative bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-500 p-10 text-white text-center overflow-hidden">

                <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full" />

                <div className="relative z-10">

                  <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-5 border border-white/20">

                    {role === 'ADMIN' ? (

                      <ShieldCheck className="w-12 h-12" />

                    ) : (

                      <User className="w-12 h-12" />

                    )}

                  </div>

                  <h2 className="text-4xl font-black">

                    {role === 'ADMIN'
                      ? 'Admin Access'
                      : 'Welcome 👋'}

                  </h2>

                  <p className="text-white/80 mt-3 leading-relaxed">

                    {role === 'ADMIN'
                      ? 'Kamu memiliki akses penuh ke seluruh fitur Smart Cat Feeder.'
                      : 'Sistem siap digunakan untuk monitoring kesehatan dan feeding kucing.'}

                  </p>
                </div>
              </div>

              {/* CONTENT */}

              <div className="p-8">

                {/* USER BARU */}

                {role !== 'ADMIN' &&
                  isNewUser && (

                    <div className="space-y-5">

                      <div>

                        <h3 className="text-2xl font-black text-amber-900">
                          Kamu ingin monitoring siapa?
                        </h3>

                        <p className="text-gray-500 mt-2">
                          Pilih jenis monitoring yang ingin digunakan pada dashboard.
                        </p>
                      </div>

                      {/* OPTION */}

                      <div className="grid grid-cols-2 gap-4">

                        <button
                          onClick={() =>
                            setSelectedMonitor('self')
                          }
                          className={`p-5 rounded-3xl border-2 transition-all text-left ${
                            selectedMonitor ===
                            'self'
                              ? 'border-amber-600 bg-amber-50'
                              : 'border-gray-200'
                          }`}
                        >

                          <div className="text-4xl mb-3">
                            🐱
                          </div>

                          <h4 className="font-black text-lg text-amber-900">
                            Kucing Sendiri
                          </h4>

                          <p className="text-sm text-gray-500 mt-2">
                            Monitoring kucing milik pribadi.
                          </p>

                        </button>

                        <button
                          onClick={() =>
                            setSelectedMonitor('family')
                          }
                          className={`p-5 rounded-3xl border-2 transition-all text-left ${
                            selectedMonitor ===
                            'family'
                              ? 'border-amber-600 bg-amber-50'
                              : 'border-gray-200'
                          }`}
                        >

                          <div className="text-4xl mb-3">
                            🏠
                          </div>

                          <h4 className="font-black text-lg text-amber-900">
                            Banyak Kucing
                          </h4>

                          <p className="text-sm text-gray-500 mt-2">
                            Monitoring beberapa kucing sekaligus.
                          </p>

                        </button>
                      </div>
                    </div>
                  )}

                {/* ADMIN */}

                {role === 'ADMIN' && (

                  <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">

                    <h3 className="font-black text-2xl text-amber-900">
                      Full Administrator
                    </h3>

                    <p className="text-amber-700 mt-3 leading-relaxed">
                      Kamu dapat mengakses dashboard, analytics, user management, feeder control, dan seluruh sistem monitoring.
                    </p>

                  </div>
                )}

                {/* BUTTON */}

                <button
                  disabled={
                    role !== 'ADMIN' &&
                    isNewUser &&
                    !selectedMonitor
                  }
                  onClick={() => {

                    window.location.href =
                      '/dashboard';
                  }}
                  className="mt-8 w-full py-5 rounded-2xl bg-amber-700 hover:bg-amber-800 text-white font-black transition-all disabled:opacity-50"
                >

                  Masuk Dashboard

                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}