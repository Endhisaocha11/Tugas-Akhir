import { Scale, Heart, Activity, ShieldCheck, Calculator, Utensils, ChevronRight } from 'lucide-react';
import { useCatData } from '../../lib/useCatData';
import { cn } from '../../lib/utils';

function getBodyLabel(bc: number): string {
  if (bc <= 2) return 'Sangat Kurus';
  if (bc <= 4) return 'Kurus';
  if (bc <= 5) return 'Normal';
  if (bc <= 7) return 'Overweight';
  return 'Obesitas';
}

function getBcsColor(bc: number): string {
  if (bc <= 2) return 'text-red-500 bg-red-50';
  if (bc <= 4) return 'text-orange-500 bg-orange-50';
  if (bc <= 5) return 'text-green-500 bg-green-50';
  if (bc <= 7) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

function getAgeLabel(age: number): string {
  if (age < 1) return 'Kitten';
  if (age <= 7) return 'Adult';
  return 'Senior';
}

const ACTIVITY_LABEL: Record<string, string> = {
  low: 'Kurang Aktif',
  normal: 'Normal',
  high: 'Sangat Aktif',
};

export function CatProfilePage() {
  const { cat, feedingLogs, loading } = useCatData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (!cat) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="text-6xl">🐱</span>
        <p className="text-gray-500 text-lg font-medium">Belum ada data profil kucing.</p>
        <p className="text-gray-400 text-sm">Admin perlu mengisi Onboarding Flow terlebih dahulu.</p>
      </div>
    );
  }

  const bc = cat.bodyCondition as unknown as number;
  const activity = (cat as any).activity as string | undefined;

  // Last 7 feeding logs
  const recentLogs = feedingLogs.slice(0, 7);

  const metrics = [
    {
      label: 'Berat',
      value: `${cat.weight} kg`,
      icon: Scale,
      color: 'text-amber-500',
    },
    {
      label: 'Kondisi Tubuh',
      value: getBodyLabel(bc),
      icon: Heart,
      color: bc <= 5 ? 'text-green-500' : 'text-orange-500',
    },
    {
      label: 'Aktivitas',
      value: ACTIVITY_LABEL[activity ?? 'normal'] ?? 'Normal',
      icon: Activity,
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="space-y-10">

      {/* ── PROFILE HEADER ── */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-10 p-10 bg-white rounded-[40px] border border-amber-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-50 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none" />

        {/* AVATAR */}
        <div className="relative shrink-0">
          <div className="w-40 h-40 rounded-[40px] overflow-hidden border-8 border-amber-100 shadow-xl">
            <img
              src={
                (cat as any).photoUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${cat.name}`
              }
              alt={cat.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* INFO */}
        <div className="flex-1 text-center md:text-left space-y-5">
          <div>
            <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
              <h2 className="text-5xl font-black text-gray-900 tracking-tight">{cat.name}</h2>
              <span className={cn('px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider border', getBcsColor(bc))}>
                BCS {bc} — {getBodyLabel(bc)}
              </span>
            </div>
            <p className="text-xl text-gray-400 font-medium">
              {cat.gender === 'male' ? '♂ Jantan' : '♀ Betina'}
              {' • '}
              {cat.age} Tahun ({getAgeLabel(cat.age)})
              {cat.isSterilized ? ' • Sterilisasi' : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="p-4 rounded-3xl bg-amber-50/50 border border-amber-50">
                <div className={cn('w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm', m.color)}>
                  <m.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{m.label}</p>
                <p className="text-lg font-black text-gray-900">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* ── HEALTH STATUS ── */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <ShieldCheck className="text-green-500 w-6 h-6" />
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Status Kesehatan</h3>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            {[
              {
                title: 'Status Berat Badan',
                status: getBodyLabel(bc),
                detail: `BCS ${bc}/9 — ${bc <= 5 ? 'Berat ideal' : 'Perlu perhatian diet'}`,
                color: bc <= 5 ? 'text-green-500' : 'text-orange-500',
                bg: bc <= 5 ? 'bg-green-50' : 'bg-orange-50',
              },
              {
                title: 'Status Sterilisasi',
                status: cat.isSterilized ? 'Sudah Steril' : 'Belum Steril',
                detail: cat.isSterilized
                  ? 'Faktor metabolisme Fm = 1.2 (lebih rendah)'
                  : 'Faktor metabolisme Fm = 1.4 (lebih tinggi)',
                color: 'text-blue-500',
                bg: 'bg-blue-50',
              },
              {
                title: 'Risiko FLUTD',
                status: bc >= 7 ? 'Perlu Perhatian' : 'Rendah',
                detail: bc >= 7
                  ? 'Berat badan di atas ideal meningkatkan risiko FLUTD'
                  : 'Kondisi tubuh dalam batas aman',
                color: bc >= 7 ? 'text-orange-500' : 'text-green-500',
                bg: bc >= 7 ? 'bg-orange-50' : 'bg-green-50',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.bg)}>
                    <ShieldCheck className={cn('w-5 h-5', item.color)} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-xs font-black uppercase tracking-wider', item.color)}>{item.status}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEEDING PLAN ── */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <Calculator className="text-amber-500 w-6 h-6" />
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Rencana Feeding</h3>
          </div>

          <div className="bg-gray-900 rounded-3xl p-8 text-white space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                  Target Kalori/Hari
                </p>
                <p className="text-4xl font-black">
                  {cat.dailyCalorieTarget}
                  <span className="text-lg text-amber-400 ml-1">kcal</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                  Porsi/Hari
                </p>
                <p className="text-4xl font-black">
                  {cat.dailyGramTarget}
                  <span className="text-lg text-amber-400 ml-1">g</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Energi Pakan</p>
                <p className="font-black text-amber-400">{cat.kiloCaloriesPerKg} kcal/kg</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Aktivitas</p>
                <p className="font-black text-amber-400">
                  {ACTIVITY_LABEL[activity ?? 'normal'] ?? 'Normal'}
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-5">
              <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">
                Jadwal Pemberian
              </p>
              <div className="space-y-3">
                {cat.feedingSchedule && cat.feedingSchedule.length > 0
                  ? cat.feedingSchedule.map((slot) => (
                      <div
                        key={slot.time}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-amber-400">{slot.time}</span>
                          <div>
                            <p className="text-sm font-bold">{slot.label ?? 'Feeding'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Utensils className="w-3 h-3 text-white/40" />
                          <span className="text-sm font-black text-amber-400">{slot.amount}g</span>
                        </div>
                      </div>
                    ))
                  : (
                    <p className="text-sm text-white/40 text-center py-4">
                      Belum ada jadwal feeding.
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT FEEDING LOGS ── */}
      {recentLogs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-black text-gray-900 px-1">Riwayat Feeding Terakhir</h3>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-left">
                <tr>
                  <th className="px-6 py-3 font-black text-gray-500 text-xs uppercase tracking-wider">Waktu</th>
                  <th className="px-6 py-3 font-black text-gray-500 text-xs uppercase tracking-wider">Diminta</th>
                  <th className="px-6 py-3 font-black text-gray-500 text-xs uppercase tracking-wider">Diberikan</th>
                  <th className="px-6 py-3 font-black text-gray-500 text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(log.timestamp).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{log.amountRequested}g</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{log.amountDispensed}g</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-black',
                        log.status === 'success' ? 'bg-green-100 text-green-600' :
                        log.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      )}>
                        {log.status === 'success' ? 'Sukses' :
                         log.status === 'warning' ? 'Peringatan' : 'Gagal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
