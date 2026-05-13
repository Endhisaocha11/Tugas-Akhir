import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * FIX #1 — MEMORY LEAK / NESTED UNSUBSCRIBE
   *
   * Masalah asli:
   *   onAuthStateChanged menerima callback. Di dalam callback itu, kita
   *   membuat listener Firestore (onSnapshot) dan mencoba return cleanup-nya.
   *   Tapi useEffect HANYA membaca return value dari fungsi setup-nya sendiri,
   *   bukan dari callback yang dipanggil nanti secara async.
   *   Akibatnya: listener Firestore tidak pernah di-unsubscribe → memory leak.
   *
   * Solusi:
   *   Simpan referensi unsubscribeProfile ke dalam useRef.
   *   Setiap kali auth state berubah, panggil dulu cleanup listener lama,
   *   baru daftarkan listener baru. Ini juga menyelesaikan race condition (#2).
   */
  const unsubscribeProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      console.log(
        'AuthProvider: Auth state changed',
        firebaseUser ? `User: ${firebaseUser.email}` : 'No user'
      );

      /**
       * FIX #2 — RACE CONDITION
       *
       * Kalau user logout lalu login lagi dengan cepat, listener Firestore
       * dari sesi sebelumnya masih aktif. Dengan cleanup eksplisit di sini,
       * kita pastikan hanya ada SATU listener aktif dalam satu waktu.
       */
      if (unsubscribeProfileRef.current) {
        console.log('AuthProvider: Cleaning up previous profile listener');
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }

      setUser(firebaseUser);

      // Kalau tidak ada user (logout), reset state langsung
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Daftarkan listener Firestore untuk profil user yang baru login
      const unsubscribeProfile = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            console.log('AuthProvider: User profile found');
            setProfile(docSnap.data() as UserProfile);
          } else {
            console.log('AuthProvider: No profile document');
            setProfile(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error('AuthProvider: Error fetching user profile:', error);
          setProfile(null);
          setLoading(false);
        }
      );

      // Simpan referensi cleanup ke ref agar bisa dipanggil di luar useEffect
      unsubscribeProfileRef.current = unsubscribeProfile;
    });

    // Cleanup saat komponen unmount:
    // 1. Hentikan listener auth
    // 2. Hentikan listener Firestore yang sedang aktif (jika ada)
    return () => {
      console.log('AuthProvider: Unmounting, cleaning up all listeners');
      unsubscribeAuth();
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }
    };
  }, []); // Dependency array kosong: setup hanya sekali saat mount

  /**
   * FIX #3 — MEMOIZE isAdmin
   *
   * Masalah asli: `isAdmin` dihitung ulang setiap render meski `profile`
   * tidak berubah (karena ditulis sebagai expression biasa di body komponen).
   *
   * Solusi: useMemo agar nilai hanya dihitung ulang saat `profile` berubah.
   */
  const isAdmin = useMemo(
    () => profile?.role === UserRole.SUPER_ADMIN,
    [profile]
  );

  /**
   * FIX #4 — MEMOIZE context value
   *
   * Tanpa useMemo, object `value` dibuat ulang setiap render AuthProvider,
   * sehingga semua consumer (useAuth) ikut re-render meski datanya sama.
   */
  const contextValue = useMemo<AuthContextType>(
    () => ({ user, profile, loading, isAdmin }),
    [user, profile, loading, isAdmin]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}