import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Cell,
  Pie,
} from 'recharts';
import { motion } from 'motion/react';
import { useCatData } from '../../lib/useCatData';

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const COLORS = ['#F59E0B', '#374151'];

export function Analytics() {
  const { cat, feedingLogs, loading } = useCatData();

  // ── Last 7 days line data (gram/hari) ─────────────────
  const now = Date.now();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    return { day: DAYS_ID[d.getDay()], dateStr: d.toDateString() };
  });

  const dayTotals: Record<string, number> = {};
  feedingLogs.forEach((log) => {
    const key = new Date(log.timestamp).toDateString();
    dayTotals[key] = (dayTotals[key] ?? 0) + (log.amountDispensed ?? 0);
  });

  const lineData = last7.map(({ day, dateStr }) => ({
    day,
    gram: Math.round(dayTotals[dateStr] ?? 0),
  }));

  const dailyAvg =
    lineData.length > 0
      ? Math.round(lineData.reduce((s, d) => s + d.gram, 0) / lineData.length)
      : 0;

  // ── Portion by time-of-day bar data ───────────────────
  const periodMap: Record<string, number> = { Pagi: 0, Siang: 0, Sore: 0, Malam: 0 };
  feedingLogs.forEach((log) => {
    const hour = new Date(log.timestamp).getHours();
    if (hour < 11) periodMap['Pagi'] += log.amountDispensed ?? 0;
    else if (hour < 15) periodMap['Siang'] += log.amountDispensed ?? 0;
    else if (hour < 19) periodMap['Sore'] += log.amountDispensed ?? 0;
    else periodMap['Malam'] += log.amountDispensed ?? 0;
  });
  const barData = Object.entries(periodMap).map(([period, grams]) => ({
    period,
    grams: Math.round(grams),
  }));

  // ── Manual vs Scheduled pie data ─────────────────────
  const manualCount = feedingLogs.filter((l) => l.notes === 'manual').length;
  const scheduledCount = feedingLogs.length - manualCount;
  const totalLogs = feedingLogs.length || 1;
  const pieData = [
    { name: 'Terjadwal', value: Math.round((scheduledCount / totalLogs) * 100) },
    { name: 'Manual', value: Math.round((manualCount / totalLogs) * 100) },
  ];

  // ── Variation check ───────────────────────────────────
  const nonZero = lineData.filter((d) => d.gram > 0);
  const maxGram = Math.max(...nonZero.map((d) => d.gram), 0);
  const minGram = Math.min(...nonZero.map((d) => d.gram), 0);
  const variation =
    dailyAvg > 0 ? Math.round(((maxGram - minGram) / dailyAvg) * 100) : 0;

  const dailyTarget = cat?.dailyGramTarget ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-1 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-amber-500" />
            Analitik Kesehatan
          </h2>
          <p className="text-gray-400">Pola konsumsi dan efisiensi perangkat 7 hari terakhir.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-300" />
            <span className="text-xs font-bold text-gray-700">7 Hari Terakhir</span>
          </div>
        </div>
      </div>

      {/* ── TOP ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metabolic pulse card */}
        <div className="p-8 bg-gray-900 rounded-[40px] text-white space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Activity className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
            <Activity className="w-3 h-3" /> Rata-rata Harian
          </div>
          <h3 className="text-4xl font-black leading-tight">
            {dailyAvg > 0 ? `${dailyAvg}g` : '—'}
          </h3>
          <p className="text-sm text-white/50 leading-relaxed">
            {dailyTarget > 0
              ? `Target harian: ${dailyTarget}g. Variasi: ±${variation}%.`
              : 'Belum ada target harian yang dikonfigurasi.'}
          </p>
          {feedingLogs.length === 0 && (
            <p className="text-xs text-white/40">Belum ada data log pemberian makan.</p>
          )}
        </div>

        {/* Line chart */}
        <div className="md:col-span-2 bg-white rounded-4xl border border-gray-100 p-7 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-amber-500 w-5 h-5" /> Konsumsi Harian (gram)
            </h4>
            {dailyTarget > 0 && (
              <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">
                Target: {dailyTarget}g
              </span>
            )}
          </div>
          <div className="h-55 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => [`${v}g`, 'Dikonsumsi']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                />
                <Line
                  type="monotone"
                  dataKey="gram"
                  stroke="#F59E0B"
                  strokeWidth={4}
                  dot={{ r: 5, fill: '#F59E0B', strokeWidth: 3, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar chart: by time of day */}
        <div className="bg-white rounded-4xl border border-gray-100 p-7 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <BarChart3 className="text-blue-500 w-5 h-5" /> Distribusi Waktu Pemberian
            </h4>
            <span className="text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
              Total: {Math.round(barData.reduce((s, d) => s + d.grams, 0))}g
            </span>
          </div>
          <div className="h-65">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                />
                <Tooltip
                  formatter={(v) => [`${v}g`, 'Pakan']}
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '12px' }}
                />
                <Bar dataKey="grams" fill="#F59E0B" radius={[12, 12, 0, 0]} barSize={52} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart: manual vs scheduled */}
        <div className="bg-white rounded-4xl border border-gray-100 p-7 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <PieIcon className="text-red-400 w-5 h-5" /> Terjadwal vs Manual
            </h4>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {feedingLogs.length} total event
            </span>
          </div>
          <div className="flex-1 flex gap-8 items-center">
            <div className="w-1/2 h-full min-h-50">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-5">
              {pieData.map((item, idx) => (
                <div key={item.name} className="flex gap-4 items-center">
                  <div
                    className={`w-1.5 h-10 rounded-full shrink-0 ${idx === 0 ? 'bg-amber-400' : 'bg-gray-900'}`}
                  />
                  <div>
                    <p className="font-bold text-gray-700 text-sm">{item.name}</p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-2xl font-black text-gray-900"
                    >
                      {item.value}%
                    </motion.p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {scheduledCount > manualCount && (
            <div className="mt-6 p-5 bg-amber-50 rounded-3xl border border-amber-100">
              <p className="text-sm font-bold text-amber-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Jadwal berjalan dengan baik
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Sebagian besar pemberian makan mengikuti jadwal otomatis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
