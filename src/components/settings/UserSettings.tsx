import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Shield, AlertCircle, Users, Plus, Trash2, X, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { db, auth, secondaryAuth } from '../../lib/firebase';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { UserRole } from '../../types';
import { cn } from '../../lib/utils';

export function UserSettings() {
  const { user, profile, isAdmin } = useAuth();

  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const [showAddModal, setShowAddModal]   = useState(false);
  const [selectedUser, setSelectedUser]   = useState<any>(null);

  const [newEmail, setNewEmail]       = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole]         = useState<UserRole>(UserRole.USER);

  // ── Fetch users ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    getDocs(collection(db, 'users'))
      .then((snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setError('Gagal memuat daftar pengguna'));
  }, [isAdmin]);

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(''), 5000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  }

  // ── Change role ──────────────────────────────────────────────────────────────
  async function handleRoleChange(userId: string, role: UserRole) {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { role });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
      flash('Role berhasil diperbarui');
    } catch (err: any) {
      flash(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  // ── Add user ─────────────────────────────────────────────────────────────────
  async function handleAddUser() {
    if (!newEmail || !newPassword) { flash('Email dan password wajib diisi', true); return; }
    setLoading(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      const data = { uid: cred.user.uid, email: newEmail, role: newRole, onboardingCompleted: false, createdAt: Date.now() };
      await setDoc(doc(db, 'users', cred.user.uid), data);
      setUsers((prev) => [...prev, { id: cred.user.uid, ...data }]);
      flash('Pengguna berhasil ditambahkan');
      setNewEmail(''); setNewPassword(''); setNewRole(UserRole.USER);
      setShowAddModal(false);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Email sudah digunakan akun lain.',
        'auth/weak-password': 'Password minimal 6 karakter.',
        'auth/invalid-email': 'Format email tidak valid.',
      };
      flash(msgs[err.code] ?? err.message, true);
    } finally {
      setLoading(false);
    }
  }

  // ── Delete user ──────────────────────────────────────────────────────────────
  async function handleDeleteUser() {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', selectedUser.id));
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      flash('Pengguna berhasil dihapus');
      setSelectedUser(null);
    } catch {
      flash('Gagal menghapus pengguna', true);
    } finally {
      setLoading(false);
    }
  }

  // ── Reset password ───────────────────────────────────────────────────────────
  async function handleResetPassword(email: string) {
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      flash(`Link reset dikirim ke ${email}. Minta cek inbox atau folder spam.`);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/user-not-found': `Tidak ada akun dengan email ${email}.`,
        'auth/too-many-requests': 'Terlalu banyak permintaan. Tunggu lalu coba lagi.',
        'auth/network-request-failed': 'Gagal terhubung. Periksa koneksi internet.',
      };
      flash(msgs[err.code] ?? err.message, true);
    } finally {
      setLoading(false);
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (!user || !profile) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
    </div>
  );

  if (!isAdmin) return (
    <div className="bg-white rounded-3xl border border-gray-100 p-8">
      <h2 className="text-2xl font-bold">Pengaturan Pengguna</h2>
      <p className="text-gray-400 mt-2 text-sm">Kamu tidak memiliki akses untuk mengelola pengguna.</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 shrink-0" />
            Kelola Pengguna
          </h2>
          <p className="text-gray-400 mt-1 text-sm">Tambah, ubah role, atau hapus akun pengguna.</p>
        </div>
        <button
          type="button"
          aria-label="Tambah pengguna baru"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-black text-sm transition-all shadow-amber-200 shadow-md"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User list */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
          <Users className="w-5 h-5 text-gray-400" />
          <span className="font-black text-gray-900">Semua Pengguna</span>
          <span className="ml-auto text-xs text-gray-400">{users.length} akun</span>
        </div>

        {users.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-sm">Belum ada pengguna terdaftar.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">

                {/* Avatar + info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden border border-gray-100 shrink-0">
                    <img
                      src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${u.email}`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.email)}`; }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{u.email}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Bergabung {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
                  <select
                    aria-label={`Ubah role ${u.email}`}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    disabled={loading}
                    className={cn(
                      'px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer',
                      u.role === UserRole.SUPER_ADMIN
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    )}
                  >
                    <option value={UserRole.USER}>User</option>
                    <option value={UserRole.SUPER_ADMIN}>Admin</option>
                  </select>

                  <button
                    aria-label={`Reset password ${u.email}`}
                    onClick={() => handleResetPassword(u.email)}
                    disabled={loading}
                    className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition-all whitespace-nowrap disabled:opacity-50"
                  >
                    Reset PW
                  </button>

                  <button
                    aria-label={`Hapus ${u.email}`}
                    onClick={() => setSelectedUser(u)}
                    disabled={loading}
                    className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex gap-4">
        <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-blue-900 text-sm">Izin Admin</p>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            Admin dapat mengelola feeding, analitik, pengaturan perangkat, dan semua pengguna.
            User hanya bisa memantau data.
          </p>
        </div>
      </div>

      {/* Add user modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-black text-gray-900">Tambah Pengguna</h3>
                <button type="button" aria-label="Tutup" onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-amber-400 transition-colors"
                />

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password (min. 6 karakter)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm pr-12 focus:border-amber-400 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <select
                  aria-label="Pilih role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-amber-400 transition-colors"
                >
                  <option value={UserRole.USER}>User</option>
                  <option value={UserRole.SUPER_ADMIN}>Admin</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddUser}
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-white py-3 rounded-xl font-black text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menambahkan...</> : 'Tambah Pengguna'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-black text-gray-900 mb-2">Hapus Pengguna</h3>
              <p className="text-gray-500 text-sm mb-1">Yakin ingin menghapus akun:</p>
              <p className="font-bold text-gray-900 text-sm mb-5 break-all">{selectedUser.email}</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelectedUser(null)} disabled={loading}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-black text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Batal
                </button>
                <button type="button" onClick={handleDeleteUser} disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</> : 'Hapus'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
