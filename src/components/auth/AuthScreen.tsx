import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserRole } from '../../types';
import { Cat, ArrowRight, Mail, Lock, User as UserIcon } from 'lucide-react';

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const { user } = userCredential;
        
        // Initialize user profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          role: UserRole.USER, // Default to USER, Super Admin is set manually or by first user logic
          onboardingCompleted: false,
          createdAt: Date.now()
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side: Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-16">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl">
              <Cat className="text-primary w-8 h-8" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">FelineGuard</h1>
          </div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-6xl font-display font-bold text-white/90 leading-tight mb-6">
              Empower Your Cat's <br />
              <span className="text-secondary-warm italic">Daily Wellness.</span>
            </h2>
            <p className="text-white/80 text-xl max-w-md font-light leading-relaxed">
              Premium IoT Smart Feeding system designed to optimize nutrition and prevent FLUTD in felines.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 flex gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <p className="text-white font-bold text-2xl mb-1">98%</p>
            <p className="text-white/60 text-xs uppercase tracking-wider">Feeding Precision</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <p className="text-white font-bold text-2xl mb-1">Real-time</p>
            <p className="text-white/60 text-xs uppercase tracking-wider">Health Monitoring</p>
          </div>
        </div>

        {/* Abstract shapes */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary-warm rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full" />
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 bg-bg-warm flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[40px] p-12 shadow-2xl shadow-amber-200/20 border border-amber-100"
        >
          <div className="mb-10 text-center">
            <h3 className="text-3xl font-display font-bold text-text-main mb-2">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h3>
            <p className="text-gray-400 font-sans">
              {isLogin ? 'Manage your cat\'s nutrition dashboard.' : 'Protect your cat with smart feeding technology.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent focus:border-primary/30 rounded-2xl outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent focus:border-primary/30 rounded-2xl outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-5 group"
            >
              {loading ? 'Processing...' : (isLogin ? 'Login Dashboard' : 'Create Account')}
               <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-amber-50 text-center">
            <p className="text-gray-400">
              {isLogin ? 'New to FelineGuard?' : 'Already have an account?'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary font-bold hover:underline"
              >
                {isLogin ? 'Create Profile' : 'Login Now'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
