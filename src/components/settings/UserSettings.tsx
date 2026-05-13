import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  Shield,
  AlertCircle,
  Users,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { motion } from 'motion/react';

import { useAuth } from '../../lib/AuthContext';

import {
    db,
    auth,
    secondaryAuth,
} from '../../lib/firebase';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';

import { UserRole } from '../../types';

import { cn } from '../../lib/utils';

export function UserSettings() {
  const { user, profile, isAdmin } =
    useAuth();

  const [users, setUsers] = useState<
    any[]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  // MODAL
  const [
    showAddModal,
    setShowAddModal,
  ] = useState(false);

  const [
    selectedUser,
    setSelectedUser,
  ] = useState<any>(null);

  // FORM
  const [newEmail, setNewEmail] =
    useState('');

  const [
    newPassword,
    setNewPassword,
    ] = useState('');
    
    const [showPassword, setShowPassword] =
    useState(false);

  const [newRole, setNewRole] =
    useState<UserRole>(UserRole.USER);

  // FETCH USERS
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      try {
        const usersCollection =
          collection(db, 'users');

        const snapshot = await getDocs(
          usersCollection
        );

        const usersList =
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

        setUsers(usersList);
      } catch (err) {
        console.error(err);

        setError(
          'Failed to load users'
        );
      }
    };

    fetchUsers();
  }, [isAdmin]);

  // CHANGE ROLE
  const handleRoleChange = async (
    userId: string,
    role: UserRole
  ) => {
    try {
      setLoading(true);

      const userRef = doc(
        db,
        'users',
        userId
      );

      await updateDoc(userRef, {
        role,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, role }
            : u
        )
      );

      setSuccess('Role updated');

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error(err);

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADD USER
  const handleAddUser = async () => {
    if (!newEmail || !newPassword) {
      setError(
        'Email dan password wajib diisi'
      );

      return;
    }

    try {
      setLoading(true);

      setError('');

      const userCredential =
        await createUserWithEmailAndPassword(
          secondaryAuth,
          newEmail,
          newPassword
        );

      const firebaseUser =
        userCredential.user;

      const newUserData = {
        uid: firebaseUser.uid,
        email: newEmail,
        role: newRole,
        onboardingCompleted: false,
        createdAt: Date.now(),
        };

      // SAVE TO FIRESTORE
      await setDoc(
        doc(
          db,
          'users',
          firebaseUser.uid
        ),
        newUserData
      );

      // UPDATE UI
      setUsers((prev) => [
        ...prev,
        {
          id: firebaseUser.uid,
          ...newUserData,
        },
      ]);

      setSuccess(
        'User berhasil ditambahkan'
      );

      // RESET FORM
      setNewEmail('');
      setNewPassword('');
      setNewRole(UserRole.USER);

      setShowAddModal(false);

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error(err);

      if (
        err.code ===
        'auth/email-already-in-use'
      ) {
        setError(
          'Email sudah digunakan'
        );
      } else if (
        err.code ===
        'auth/weak-password'
      ) {
        setError(
          'Password minimal 6 karakter'
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // DELETE USER
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);

      await deleteDoc(
        doc(
          db,
          'users',
          selectedUser.id
        )
      );

      setUsers((prev) =>
        prev.filter(
          (u) =>
            u.id !== selectedUser.id
        )
      );

      setSuccess(
        'User berhasil dihapus'
      );

      setSelectedUser(null);

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error(err);

      setError(
        'Gagal menghapus user'
      );
    } finally {
      setLoading(false);
    }
  };

    // RESET PASSWORD
    const handleResetPassword =
  async (email: string) => {

    try {

      setLoading(true);

      await sendPasswordResetEmail(
        auth,
        email,
        {
          url:
            'http://localhost:3000/login',
          handleCodeInApp: false,
        }
      );

      alert(
        `Link reset password berhasil dikirim ke ${email}`
      );

    } catch (err: any) {

      console.error(err);

      alert(
        err.message
      );

    } finally {

      setLoading(false);
    }
  };
    
  // LOADING
  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-gray-400">
          Loading...
        </p>
      </div>
    );
  }

  // NON ADMIN
    if (!isAdmin) {
    return (
        <div className="card-premium p-8">
        <h2 className="text-2xl font-bold">
            User Settings
        </h2>

        <p className="text-gray-400 mt-2">
            Kamu tidak memiliki akses
            untuk mengelola user.
        </p>
        </div>
    );
    }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-text-main">
            User Management 👥
          </h2>

          <p className="text-gray-400 mt-1">
            Manage users and permissions
          </p>
        </div>

        {/* ADD BUTTON */}
              <button
                  aria-label='Add New Account'
          onClick={() =>
            setShowAddModal(true)
          }
          className="w-14 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500" />

          <p className="text-red-700 text-sm">
            {error}
          </p>
        </motion.div>
      )}

      {/* SUCCESS */}
      {success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3"
        >
          <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
            ✓
          </div>

          <p className="text-green-700 text-sm">
            {success}
          </p>
        </motion.div>
      )}

      {/* USERS */}
      <div className="card-premium p-8">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-blue-500" />

          <h3 className="text-xl font-bold">
            All Users
          </h3>
        </div>

        <div className="space-y-4">
          {users.length === 0 ? (
            <p className="text-center text-gray-400 py-10">
              No users found
            </p>
          ) : (
            users.map((userData) => (
              <div
                key={userData.id}
                className="p-6 rounded-3xl border border-gray-100 bg-gray-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* LEFT */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-primary/20">
                    <img
                        src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${userData.email}`}
                        alt="avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src =
                            'https://ui-avatars.com/api/?name=' +
                            encodeURIComponent(userData.email);
                        }}
                        />
                  </div>

                  <div>
                    <p className="font-bold text-text-main">
                      {userData.email}
                    </p>

                    <p className="text-xs text-gray-400">
                      Joined{' '}
                      {new Date(
                        userData.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-3">
                  <select
                    aria-label={`Change role for ${userData.email}`}
                    value={userData.role}
                    onChange={(e) =>
                      handleRoleChange(
                        userData.id,
                        e.target
                          .value as UserRole
                      )
                    }
                    disabled={loading}
                    className={cn(
                      'px-4 py-3 rounded-xl border outline-none font-medium',
                      userData.role ===
                        UserRole.SUPER_ADMIN
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-gray-50 border-gray-300 text-gray-700'
                    )}
                  >
                    <option value={UserRole.USER}>
                      User
                    </option>

                    <option
                      value={
                        UserRole.SUPER_ADMIN
                      }
                    >
                      Admin
                    </option>
                        </select>

                      {/* RESET PASSWORD */}
                    <button
                    aria-label={`Reset password ${userData.email}`}
                    onClick={() =>
                        handleResetPassword(
                        userData.email
                        )
                    }
                    className="px-4 h-12 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-sm transition-all"
                    >
                    Reset Password
                    </button>

                  {/* DELETE */}
                  <button
                    aria-label={`Delete ${userData.email}`}
                    onClick={() =>
                      setSelectedUser(
                        userData
                      )
                    }
                    className="w-12 h-12 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* INFO */}
      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 flex gap-4">
        <Shield className="w-6 h-6 text-blue-600 shrink-0" />

        <div>
          <p className="font-bold text-blue-900 mb-2">
            Admin Permissions
          </p>

          <p className="text-sm text-blue-800">
            Admin users can manage
            feeding, analytics, device
            settings, and all users.
          </p>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">
                Add User
              </h3>

                          <button
                    aria-label='Close Add User Modal'
                onClick={() =>
                  setShowAddModal(false)
                }
              >
                <X />
              </button>
            </div>

            <div className="space-y-4">
              {/* EMAIL */}
              <input
                type="email"
                placeholder="Email"
                value={newEmail}
                onChange={(e) =>
                  setNewEmail(
                    e.target.value
                  )
                }
                className="w-full px-4 py-3 rounded-xl border outline-none"
              />

              {/* PASSWORD */}
              <div className="relative">
                <input
                    type={
                    showPassword
                        ? 'text'
                        : 'password'
                    }
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) =>
                    setNewPassword(
                        e.target.value
                    )
                    }
                    className="w-full px-4 py-3 rounded-xl border outline-none pr-14"
                />

                <button
                    type="button"
                    onClick={() =>
                    setShowPassword(
                        !showPassword
                    )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                    ) : (
                    <Eye className="w-5 h-5" />
                    )}
                </button>
                </div>

              {/* ROLE */}
              <select
                aria-label="Select role"
                value={newRole}
                onChange={(e) =>
                  setNewRole(
                    e.target
                      .value as UserRole
                  )
                }
                className="w-full px-4 py-3 rounded-xl border outline-none"
              >
                <option
                  value={UserRole.USER}
                >
                  User
                </option>

                <option
                  value={
                    UserRole.SUPER_ADMIN
                  }
                >
                  Admin
                </option>
              </select>

              {/* BUTTON */}
              <button
                onClick={handleAddUser}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold transition-all"
              >
                {loading
                  ? 'Adding User...'
                  : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm">
            <h3 className="text-2xl font-bold mb-4">
              Delete User
            </h3>

            <p className="text-gray-500 mb-6">
              Are you sure want to delete:
              <br />

              <span className="font-bold text-black">
                {selectedUser.email}
              </span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setSelectedUser(null)
                }
                className="flex-1 py-3 rounded-xl border"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteUser}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}