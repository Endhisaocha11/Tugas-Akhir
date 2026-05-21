import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { UserRole } from '../../types';

const EDU_ARTICLES = [
  {
    icon: '🏥',
    category: 'Kesehatan',
    title: 'Memahami FLUTD pada Kucing',
    desc: 'Feline Lower Urinary Tract Disease (FLUTD) sering berkaitan dengan pola makan dan stres. Pemberian pakan yang tepat dapat mencegah risiko ini secara signifikan.',
    color: 'border-red-100',
    badge: 'text-red-600 bg-red-100',
  },
  {
    icon: '🧮',
    category: 'Nutrisi',
    title: 'Formula Kebutuhan Kalori',
    desc: 'Kebutuhan kalori dihitung dari RER = 70 × BB^0.75, dikalikan faktor sterilisasi (Fm), gender (Fg), kondisi tubuh (Fo), dan aktivitas (Fa), lalu dikonversi ke gram.',
    color: 'border-amber-100',
    badge: 'text-amber-700 bg-amber-100',
  },
  {
    icon: '💧',
    category: 'Pencegahan',
    title: 'Pentingnya Hidrasi',
    desc: 'Asupan air yang cukup adalah pertahanan utama terhadap kristal urine dan penyumbatan. Kucing dengan pakan kering membutuhkan air ekstra setiap hari.',
    color: 'border-blue-100',
    badge: 'text-blue-700 bg-blue-100',
  },
  {
    icon: '⚖️',
    category: 'Berat Badan',
    title: 'Skor Kondisi Tubuh (BCS)',
    desc: 'BCS 1–9 menilai lemak tubuh secara visual. Skor 4–5 adalah ideal. BCS ≥ 7 berisiko diabetes dan masalah sendi, sementara BCS ≤ 2 berisiko malnutrisi.',
    color: 'border-green-100',
    badge: 'text-green-700 bg-green-100',
  },
  {
    icon: '🏃',
    category: 'Aktivitas',
    title: 'Aktivitas & Porsi Pakan',
    desc: 'Kucing indoor kurang aktif butuh ~20% kalori lebih sedikit, kucing outdoor sangat aktif butuh ~20% lebih. Faktor aktivitas (Fa) menyesuaikan porsi secara otomatis.',
    color: 'border-purple-100',
    badge: 'text-purple-700 bg-purple-100',
  },
  {
    icon: '📦',
    category: 'Pakan',
    title: 'Membaca Kemasan Pakan',
    desc: 'Nilai energi pakan biasanya tertulis sebagai kcal/kg atau kcal/100g. Masukkan nilai ini ke kalkulator agar porsi gram per hari akurat sesuai kandungan pakan.',
    color: 'border-orange-100',
    badge: 'text-orange-700 bg-orange-100',
  },
];

export function MonitoringSelection() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdu, setShowEdu] = useState(false);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', UserRole.SUPER_ADMIN)
        );
        const snapshot = await getDocs(q);
        setAdmins(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  const handleSelectAdmin = async (admin: any) => {
    if (!user) return;
    try {
      localStorage.setItem('selectedAdminId', admin.id);
      localStorage.setItem('selectedAdminEmail', admin.email);
      localStorage.setItem('appMode', 'monitor');
      await updateDoc(doc(db, 'users', user.uid), { monitoringAdminId: admin.id });
      window.location.href = '/';
    } catch (err) {
      console.error(err);
    }
  };

  const handleGuestMode = () => {
    localStorage.setItem('appMode', 'guest');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
          <p className="text-gray-400 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-amber-50">

      {/* ── TOPBAR ── */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-amber-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐾</span>
          <span className="font-black text-amber-900 tracking-tight">FelineGuard</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs font-bold text-amber-800 truncate max-w-44">
            {user?.email}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* ── HERO ── */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-5 text-4xl shadow-sm">
            🐱
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-amber-950 mb-3">
            Selamat Datang!
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Pilih opsi di bawah untuk mulai menggunakan FelineGuard.
          </p>
        </div>

        {/* ── TOP OPTIONS ── */}
        <div className="grid sm:grid-cols-2 grid-cols-1 gap-5 mb-10">

          {/* EDUKASI */}
          <button
            type="button"
            onClick={() => setShowEdu((v) => !v)}
            className={`group text-left rounded-3xl p-7 border-2 transition-all ${
              showEdu
                ? 'border-purple-400 bg-purple-50 shadow-lg shadow-purple-100'
                : 'bg-white border-transparent hover:border-purple-300 hover:shadow-xl'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-5 text-3xl group-hover:scale-110 transition-transform">
              📚
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">
              Edukasi Kucing
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Pelajari nutrisi, FLUTD, hidrasi, skor kondisi tubuh, dan cara membaca kemasan pakan.
            </p>
            <span className={`inline-flex items-center gap-1 font-bold text-sm ${showEdu ? 'text-purple-700' : 'text-purple-500'}`}>
              {showEdu ? '▲ Sembunyikan' : '▼ Lihat Materi'}
            </span>
          </button>

          {/* MONITORING */}
          <div className="bg-white rounded-3xl p-7 border-2 border-transparent shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-5 text-3xl">
              📡
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">
              Monitoring Admin
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Pantau dashboard feeding kucing yang dikelola oleh Super Admin secara real-time.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-amber-700 font-bold">
                {admins.length} admin tersedia — pilih di bawah
              </span>
            </div>
          </div>
        </div>

        {/* ── INLINE EDUCATION PANEL ── */}
        {showEdu && (
          <div className="mb-10 bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="bg-linear-to-r from-purple-600 to-indigo-600 px-8 py-6">
              <p className="text-xs font-black uppercase tracking-[3px] text-white/70 mb-1">EDUKASI</p>
              <h2 className="text-2xl font-black text-white">Panduan Nutrisi &amp; Kesehatan Kucing</h2>
            </div>
            <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4">
              {EDU_ARTICLES.map((art) => (
                <div key={art.title} className={`rounded-2xl border bg-gray-50 p-5 ${art.color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{art.icon}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${art.badge}`}>
                      {art.category}
                    </span>
                  </div>
                  <h3 className="font-black text-gray-900 text-sm mb-1 leading-snug">{art.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{art.desc}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-black text-amber-900">Ingin menghitung kebutuhan pakan kucing Anda?</p>
                  <p className="text-sm text-amber-700 mt-1">Gunakan Simulasi Feeding Calculator — gratis, tanpa menyimpan data.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGuestMode}
                  className="shrink-0 px-6 py-3 bg-amber-700 text-white font-black rounded-2xl hover:bg-amber-800 transition-colors text-sm whitespace-nowrap"
                >
                  🧮 Coba Simulasi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ADMIN SECTION ── */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-gray-900 mb-1">
            Pilih Admin untuk Dimonitoring
          </h2>
          <p className="text-gray-400 text-sm">
            Klik kartu admin di bawah untuk mulai monitoring dashboard-nya.
          </p>
        </div>

        {admins.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-5">
            {admins.map((admin) => (
              <button
                key={admin.id}
                type="button"
                onClick={() => handleSelectAdmin(admin)}
                className="group bg-white rounded-3xl p-6 border-2 border-transparent hover:border-amber-400 hover:shadow-xl transition-all text-left"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-amber-50 border border-amber-100 shrink-0">
                    <img
                      src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${admin.email}`}
                      alt="avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://ui-avatars.com/api/?name=' +
                          encodeURIComponent(admin.email);
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-base text-gray-900 truncate">
                      {admin.email.split('@')[0]}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-400 font-medium">Super Admin</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black border border-amber-100 group-hover:bg-amber-700 group-hover:text-white transition-colors">
                    Monitor →
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-14 text-center border border-gray-100">
            <div className="text-6xl mb-5">😿</div>
            <h3 className="text-2xl font-black text-gray-800 mb-3">Belum Ada Admin Tersedia</h3>
            <p className="text-gray-400 leading-relaxed max-w-sm mx-auto">
              Saat ini belum ada akun Super Admin yang terdaftar.
              Hubungi pengelola sistem untuk informasi lebih lanjut.
            </p>
          </div>
        )}

        {/* INFO STRIP */}
        <div className="mt-8 bg-white border border-amber-100 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-lg shrink-0">💡</span>
          <p className="text-sm text-gray-500 leading-relaxed">
            Akun Anda terdaftar sebagai <span className="font-black text-amber-700">User</span>.
            Untuk akses penuh ke perangkat Smart Cat Feeder,{' '}
            <span className="font-black">silakan hubungi Super Admin.</span>
          </p>
        </div>

      </div>
    </div>
  );
}
