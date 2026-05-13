import React, { useEffect, useState } from 'react';

import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../../lib/firebase';

import { useAuth } from '../../lib/AuthContext';

import { UserRole } from '../../types';

export function MonitoringSelection() {
  const { user } = useAuth();

  const [admins, setAdmins] = useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  /**
   * FETCH ADMINS
   */

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, 'users')
        );

        const adminList = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(
            (u: any) =>
              u.role ===
              UserRole.SUPER_ADMIN
          );

        setAdmins(adminList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  /**
   * SELECT ADMIN
   */

  const handleSelectAdmin = async (
    admin: any
  ) => {
    if (!user) return;

    try {
      localStorage.setItem(
        'selectedAdminId',
        admin.id
      );

      localStorage.setItem(
        'selectedAdminEmail',
        admin.email
      );

      localStorage.setItem(
        'appMode',
        'monitor'
      );

      await updateDoc(
        doc(db, 'users', user.uid),
        {
          monitoringAdminId: admin.id,
        }
      );

      window.location.href = '/';
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * GUEST MODE
   */

  const handleGuestMode = () => {
    localStorage.setItem(
      'appMode',
      'guest'
    );

    window.location.href = '/';
  };

  /**
   * LOADING
   */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="flex flex-col items-center">

          <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin mb-5" />

          <p className="text-gray-500 font-medium">
            Loading Admin Accounts...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-6">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="text-center mb-12">

          <div className="w-24 h-24 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-6 text-5xl shadow-sm">
            🐱
          </div>

          <h1 className="text-5xl font-bold text-[#1F2937] mb-4">
            FelineGuard
          </h1>

          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Pilih admin untuk monitoring
            atau coba feeding calculator.
          </p>
        </div>

        {/* OPTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">

          {/* GUEST */}
          <button
            onClick={handleGuestMode}
            className="bg-white rounded-3xl p-8 border border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all text-left"
          >

            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 text-3xl">
              🧮
            </div>

            <h2 className="text-2xl font-bold text-[#1F2937] mb-3">
              Coba Feeding Calculator
            </h2>

            <p className="text-gray-500 leading-relaxed mb-4">
              Hitung kebutuhan makan
              kucing tanpa menyimpan
              data.
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700 leading-relaxed">
              Hubungi Super Admin untuk
              menyimpan feeding plan
              dan sinkronisasi device.
            </div>
          </button>

          {/* MONITOR INFO */}
          <div className="bg-white rounded-3xl p-8 border border-amber-200 shadow-sm">

            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-5 text-3xl">
              👀
            </div>

            <h2 className="text-2xl font-bold text-[#1F2937] mb-3">
              Monitoring Admin
            </h2>

            <p className="text-gray-500 leading-relaxed mb-4">
              Pilih salah satu admin
              di bawah untuk mulai
              monitoring dashboard.
            </p>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700 leading-relaxed">
              Monitoring harus dipilih
              setiap kali login.
            </div>
          </div>
        </div>

        {/* ADMIN TITLE */}
        <div className="mb-6">

          <h2 className="text-2xl font-bold text-[#1F2937] mb-2">
            Available Admin Accounts
          </h2>

          <p className="text-gray-500">
            Pilih admin untuk monitoring.
          </p>
        </div>

        {/* ADMIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {admins.map((admin) => (
            <button
              key={admin.id}
              onClick={() =>
                handleSelectAdmin(admin)
              }
              className="bg-white rounded-3xl p-6 shadow-sm border border-transparent hover:border-amber-300 hover:shadow-lg hover:scale-[1.02] transition-all text-left"
            >

              {/* TOP */}
              <div className="flex items-center gap-4 mb-5">

                {/* AVATAR */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-amber-50 border border-amber-100">

                  <img
                    src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${admin.email}`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://ui-avatars.com/api/?name=' +
                        encodeURIComponent(
                          admin.email
                        );
                    }}
                  />
                </div>

                {/* INFO */}
                <div>

                  <h3 className="font-bold text-lg text-[#1F2937]">
                    {admin.email.split('@')[0]}
                  </h3>

                  <p className="text-sm text-gray-400">
                    {admin.email}
                  </p>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between">

                <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                  Super Admin
                </div>

                <div className="text-amber-500 font-semibold text-sm">
                  Monitor →
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* EMPTY */}
        {admins.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 mt-6">

            <div className="text-6xl mb-5">
              😿
            </div>

            <h3 className="text-2xl font-bold text-[#1F2937] mb-3">
              Tidak Ada Admin
            </h3>

            <p className="text-gray-500 leading-relaxed">
              Saat ini belum ada akun
              Super Admin tersedia.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}