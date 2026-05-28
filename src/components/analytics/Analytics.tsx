import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
  Activity,
  ChevronLeft,
  ChevronRight,
  X,
  Utensils,
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
  ReferenceLine,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useCatData } from '../../lib/useCatData';
import { cn } from '../../lib/utils';
import type { FeedingLog } from '../../types';

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const COLORS = ['#F59E0B', '#374151'];

// ── Feeding Calendar for Analytics (color logic: yellow < target, green = target, red = overfeed) ─

type FeedStatus = 'overfeed' | 'met' | 'under' | 'none' | 'future' | 'today-overfeed' | 'today-met' | 'today-under' | 'today-none';

function getFeedStatus(date: Date, logsByDay: Record<string, FeedingLog[]>, dailyTarget: number): FeedStatus {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isPast = date < now && !isToday;
  if (!isToday && !isPast) return 'future';

  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const logs = logsByDay[key] ?? [];
  const total = logs.reduce((s, l) => s + (l.amountDispensed ?? 0), 0);

  if (total === 0) return isToday ? 'today-none' : 'none';
  if (dailyTarget === 0) return isToday ? 'today-met' : 'met';
  if (total > dailyTarget) return isToday ? 'today-overfeed' : 'overfeed';
  if (total >= dailyTarget * 0.85) return isToday ? 'today-met' : 'met';
  return isToday ? 'today-under' : 'under';
}

const STATUS_STYLE: Record<FeedStatus, string> = {
  'overfeed':       'bg-red-400 text-white border-red-500 hover:bg-red-500',
  'met':            'bg-green-400 text-white border-green-500 hover:bg-green-500',
  'under':          'bg-yellow-300 text-yellow-900 border-yellow-400 hover:bg-yellow-400',
  'none':           'bg-gray-100 text-gray-400 border-gray-200',
  'future':         'bg-gray-50 text-gray-300 border-gray-100 cursor-default',
  'today-overfeed': 'bg-red-500 text-white border-red-600 ring-2 ring-red-400 ring-offset-1',
  'today-met':      'bg-green-500 text-white border-green-600 ring-2 ring-green-400 ring-offset-1',
  'today-under':    'bg-yellow-400 text-white border-yellow-500 ring-2 ring-yellow-300 ring-offset-1',
  'today-none':     'bg-blue-500 text-white border-blue-600 ring-2 ring-blue-400 ring-offset-1',
};

function FeedingCalendarAnalytics({ feedingLogs, dailyTarget }: { feedingLogs: FeedingLog[]; dailyTarget: number }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const logsByDay: Record<string, FeedingLog[]> = {};
  feedingLogs.forEach((log) => {
    const d = new Date(log.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!logsByDay[key]) logsByDay[key] = [];
    logsByDay[key].push(log);
  });

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedKey = selectedDay
    ? `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`
    : null;
  const selectedLogs = (selectedKey ? logsByDay[selectedKey] ?? [] : [])
    .sort((a, b) => a.timestamp - b.timestamp);
  const selectedTotal = selectedLogs.reduce((s, l) => s + (l.amountDispensed ?? 0), 0);
  const selectedStatus = selectedDay ? getFeedStatus(selectedDay, logsByDay, dailyTarget) : null;

  return (
    <div className="bg-white rounded-4xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h4 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Calendar className="text-green-500 w-5 h-5" /> Kalender Pemberian Pakan
          </h4>
          <p className="text-xs text-gray-400 mt-0.5">
            🟢 Terpenuhi &nbsp;·&nbsp; 🟡 Kurang &nbsp;·&nbsp; 🔴 Overfeeding
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" title="Bulan sebelumnya"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-bold text-gray-600 w-32 text-center">
            {MONTHS_ID[month]} {year}
          </span>
          <button type="button" title="Bulan berikutnya"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-7 mb-1.5">
            {DAYS_ID.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const status = getFeedStatus(date, logsByDay, dailyTarget);
              const isSelected = selectedDay?.toDateString() === date.toDateString();
              const key2 = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const dayTotal = (logsByDay[key2] ?? []).reduce((s, l) => s + (l.amountDispensed ?? 0), 0);
              return (
                <button
                  key={i}
                  type="button"
                  title={`${date.getDate()} ${MONTHS_ID[date.getMonth()]} — ${dayTotal}g`}
                  onClick={() => status !== 'future' ? setSelectedDay(date) : undefined}
                  className={cn(
                    'h-9 w-full rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5',
                    STATUS_STYLE[status],
                    isSelected && 'ring-2 ring-offset-1 ring-gray-500 scale-110',
                  )}
                >
                  <span>{date.getDate()}</span>
                  {dayTotal > 0 && <span className="text-[8px] opacity-75 leading-none">{dayTotal}g</span>}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
            {[
              { color: 'bg-green-400', label: 'Terpenuhi (≥85% target)' },
              { color: 'bg-yellow-300', label: 'Kurang dari target' },
              { color: 'bg-red-400', label: 'Overfeeding (> target)' },
              { color: 'bg-gray-200', label: 'Tidak ada pakan' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn('w-3 h-3 rounded shrink-0', color)} />
                <span className="text-[10px] text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-52 shrink-0">
          <AnimatePresence mode="wait">
            {selectedDay ? (
              <motion.div
                key={selectedDay.toDateString()}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="h-full"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-black text-gray-700">
                      {selectedDay.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {selectedDay.toLocaleDateString('id-ID', { weekday: 'long' })}
                    </p>
                  </div>
                  <button type="button" title="Tutup"
                    onClick={() => setSelectedDay(null)}
                    className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>

                {/* Status badge */}
                <div className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-black inline-block mb-3',
                  selectedStatus?.includes('overfeed') ? 'bg-red-100 text-red-700' :
                  selectedStatus?.includes('met') ? 'bg-green-100 text-green-700' :
                  selectedStatus?.includes('under') ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {selectedStatus?.includes('overfeed') ? '🔴 Overfeeding' :
                   selectedStatus?.includes('met') ? '🟢 Terpenuhi' :
                   selectedStatus?.includes('under') ? '🟡 Kurang dari target' :
                   '— Tidak ada pakan'}
                </div>

                <p className="text-xl font-black text-gray-800 mb-0.5">{selectedTotal}g</p>
                {dailyTarget > 0 && (
                  <p className="text-xs text-gray-400 mb-3">
                    dari target {dailyTarget}g ({Math.round((selectedTotal / dailyTarget) * 100)}%)
                  </p>
                )}

                {selectedLogs.length > 0 && (
                  <div className="space-y-1.5 overflow-y-auto max-h-48">
                    {selectedLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-2.5 py-2 border border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                            log.notes === 'manual' ? 'bg-blue-400' : 'bg-amber-400'
                          )} />
                          <span className="text-xs font-bold text-gray-600">
                            {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-amber-600">{log.amountDispensed}g</span>
                          <span className="text-[9px] text-gray-400 ml-1">{log.notes === 'manual' ? 'M' : 'A'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedLogs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Utensils className="w-7 h-7 text-gray-200 mb-2" />
                    <p className="text-[10px] text-gray-400">Tidak ada pemberian makan</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full py-8 text-center"
              >
                <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400">Klik tanggal<br />untuk detail</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Main Analytics Component ─────────────────────────────────────────────────

export function Analytics() {
  const { cat, feedingLogs, loading } = useCatData();

  // Filter logs by profileUpdatedAt — sama seperti Dashboard agar chart reset saat profil berubah
  const profileUpdatedAt = cat?.profileUpdatedAt ?? 0;
  const filteredLogs = profileUpdatedAt > 0
    ? feedingLogs.filter((l) => l.timestamp >= profileUpdatedAt)
    : feedingLogs;

  // ── Last 7 days line data (gram/hari) ─────────────────
  const now = Date.now();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    return { day: DAYS_ID[d.getDay()], dateStr: d.toDateString() };
  });

  const dayTotals: Record<string, number> = {};
  filteredLogs.forEach((log) => {
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
  filteredLogs.forEach((log) => {
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
  const manualCount = filteredLogs.filter((l) => l.notes === 'manual').length;
  const scheduledCount = filteredLogs.length - manualCount;
  const totalLogs = filteredLogs.length || 1;
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
            Analitik Pemberian Pakan
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
          {filteredLogs.length === 0 && (
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
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis hide />
                {dailyTarget > 0 && (
                  <ReferenceLine y={dailyTarget} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ value: `Target ${dailyTarget}g`, position: 'insideTopRight', fontSize: 10, fill: '#22c55e' }} />
                )}
                <Tooltip
                  formatter={(v) => [`${v}g`, 'Dikonsumsi']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                />
                <Line type="monotone" dataKey="gram" stroke="#F59E0B" strokeWidth={4}
                  dot={{ r: 5, fill: '#F59E0B', strokeWidth: 3, stroke: '#fff' }} />
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
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip formatter={(v) => [`${v}g`, 'Pakan']} cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px' }} />
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
              {filteredLogs.length} total event
            </span>
          </div>
          <div className="flex-1 flex gap-8 items-center">
            <div className="w-1/2 h-full min-h-50">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={55} outerRadius={80} paddingAngle={6} dataKey="value">
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
                  <div className={`w-1.5 h-10 rounded-full shrink-0 ${idx === 0 ? 'bg-amber-400' : 'bg-gray-900'}`} />
                  <div>
                    <p className="font-bold text-gray-700 text-sm">{item.name}</p>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-black text-gray-900">
                      {item.value}%
                    </motion.p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {filteredLogs.length > 0 && scheduledCount > manualCount && (
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

      {/* ── FEEDING CALENDAR PER TANGGAL ── */}
      <FeedingCalendarAnalytics feedingLogs={filteredLogs} dailyTarget={dailyTarget} />
    </div>
  );
}
