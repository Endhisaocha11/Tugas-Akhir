import type { ElementType } from 'react';
import {
  Bell, CheckCircle, AlertTriangle, XCircle, Info,
  Wifi, WifiOff, Database, Utensils, RefreshCw, Zap, ShieldAlert,
} from 'lucide-react';
import { useCatData } from '../../lib/useCatData';
import { cn } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType   = 'success' | 'warning' | 'error' | 'info';
type NotifSource = 'device' | 'health' | 'manual' | 'auto' | 'overfeeding' | 'profile';

interface NotifItem {
  id: string;
  type: NotifType;
  source: NotifSource;
  title: string;
  body: string;
  time: string;
  priority: number;
  route?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, {
  icon: ElementType;
  iconColor: string;
  iconBg: string;
  border: string;
}> = {
  success: { icon: CheckCircle,   iconColor: 'text-green-500',  iconBg: 'bg-green-50',  border: 'border-green-100'  },
  warning: { icon: AlertTriangle, iconColor: 'text-yellow-500', iconBg: 'bg-yellow-50', border: 'border-yellow-100' },
  error:   { icon: XCircle,       iconColor: 'text-red-500',    iconBg: 'bg-red-50',    border: 'border-red-100'    },
  info:    { icon: Info,          iconColor: 'text-blue-500',   iconBg: 'bg-blue-50',   border: 'border-blue-100'   },
};

const SOURCE_CONFIG: Record<NotifSource, { label: string; bg: string; text: string; icon: ElementType }> = {
  device:      { label: 'Perangkat',   bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Wifi         },
  health:      { label: 'Kesehatan',   bg: 'bg-purple-100', text: 'text-purple-700', icon: ShieldAlert  },
  manual:      { label: 'Manual',      bg: 'bg-green-100',  text: 'text-green-700',  icon: Utensils     },
  auto:        { label: 'Otomatis',    bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Zap          },
  overfeeding: { label: 'Overfeeding', bg: 'bg-red-100',    text: 'text-red-700',    icon: AlertTriangle},
  profile:     { label: 'Profil',      bg: 'bg-teal-100',   text: 'text-teal-700',   icon: RefreshCw    },
};

const SECTION_ORDER: NotifSource[] = ['device', 'health', 'overfeeding', 'profile', 'auto', 'manual'];

const SECTION_LABELS: Record<NotifSource, string> = {
  device:      'Status Perangkat',
  health:      'Kesehatan Kucing',
  overfeeding: 'Peringatan Overfeeding',
  profile:     'Pembaruan Profil',
  auto:        'Feeding Otomatis',
  manual:      'Feeding Manual',
};

const TWENTY_FOUR_HOURS = 86_400_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000)        return 'Baru saja';
  if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)} menit lalu`;
  if (diff < TWENTY_FOUR_HOURS) return `${Math.floor(diff / 3_600_000)} jam lalu`;
  return new Date(ts).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function getTriggerType(notes?: string): 'manual' | 'auto' {
  if (!notes) return 'auto';
  const n = notes.toLowerCase();
  if (n.includes('manual')) return 'manual';
  return 'auto';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor,
}: {
  icon: ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
      <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate">{label}</p>
        <p className={cn('font-black text-xs sm:text-sm truncate', valueColor)}>{value}</p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function Notifications({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { cat, device, feedingLogs, loading } = useCatData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/load.gif" alt="loading" className="h-24 w-auto object-contain" />
      </div>
    );
  }

  const now = Date.now();
  const profileUpdatedAt = cat?.profileUpdatedAt ?? 0;

  const notifs: NotifItem[] = [];

  // ── 1. Device ─────────────────────────────────────────────────────────────
  if (device) {
    if (!device.isOnline) {
      notifs.push({
        id: 'dev-offline', type: 'error', source: 'device', priority: 0,
        title: 'Perangkat Offline',
        body: 'PawfectCare tidak terhubung ke internet. Periksa koneksi Wi-Fi perangkat.',
        time: device.lastPulse ? formatTime(device.lastPulse) : '—',
        route: 'settings',
      });
    }

    if (device.foodStockLevel < 20) {
      notifs.push({
        id: 'low-stock', type: 'warning', source: 'device', priority: 1,
        title: 'Stok Makanan Hampir Habis',
        body: `Sisa stok pakan ${device.foodStockLevel}%. Segera isi ulang sebelum kehabisan.`,
        time: 'Sekarang',
        route: 'settings',
      });
    }

    if (device.servoStatus === 'jammed') {
      notifs.push({
        id: 'servo-jammed', type: 'error', source: 'device', priority: 0,
        title: 'Servo Macet',
        body: 'Mekanisme dispenser mengalami hambatan. Periksa kondisi fisik dan bersihkan sumbatan.',
        time: 'Sekarang',
        route: 'settings',
      });
    }

    if (device.isOnline && device.servoStatus === 'active') {
      notifs.push({
        id: 'dev-active', type: 'info', source: 'device', priority: 2,
        title: 'Perangkat Sedang Mendispens',
        body: `PawfectCare sedang mengeluarkan pakan. Berat mangkok: ${device.currentWeightOnScale}g.`,
        time: 'Sekarang',
        route: 'feeding-control',
      });
    }

    if (device.isOnline && device.servoStatus === 'idle' && device.foodStockLevel >= 20) {
      notifs.push({
        id: 'dev-ready', type: 'success', source: 'device', priority: 3,
        title: 'Perangkat Siap Digunakan',
        body: `PawfectCare aktif dan siaga. Stok ${device.foodStockLevel}%. Servo normal.`,
        time: device.lastPulse ? formatTime(device.lastPulse) : 'Sekarang',
        route: 'settings',
      });
    }
  } else {
    notifs.push({
      id: 'no-device', type: 'info', source: 'device', priority: 2,
      title: 'Perangkat Belum Terhubung',
      body: 'Belum ada data perangkat. Admin perlu menghubungkan PawfectCare terlebih dahulu.',
      time: 'Sekarang',
      route: 'settings',
    });
  }

  // ── 2. Cat health ─────────────────────────────────────────────────────────
  if (cat) {
    const bc = cat.bodyCondition as unknown as number;

    if (bc >= 4) {
      notifs.push({
        id: 'cat-overweight', type: 'warning', source: 'health', priority: 1,
        title: `${cat.name} — Kelebihan Berat Badan`,
        body: `BCS ${bc}/5. Konsultasikan ke dokter hewan untuk program diet yang tepat.`,
        time: 'Data terkini',
        route: 'cat-profile',
      });
    } else if (bc <= 2) {
      notifs.push({
        id: 'cat-underweight', type: 'warning', source: 'health', priority: 1,
        title: `${cat.name} — Kekurangan Berat Badan`,
        body: `BCS ${bc}/5. Segera konsultasikan ke dokter hewan.`,
        time: 'Data terkini',
        route: 'cat-profile',
      });
    } else {
      notifs.push({
        id: 'cat-healthy', type: 'success', source: 'health', priority: 4,
        title: `${cat.name} — Kondisi Tubuh Normal`,
        body: `BCS ${bc}/5. Berat badan dalam rentang ideal. Tetap pantau secara berkala.`,
        time: 'Data terkini',
        route: 'cat-profile',
      });
    }

    // Profil diperbarui: hanya tampilkan dalam 24 jam terakhir
    if (profileUpdatedAt && now - profileUpdatedAt < TWENTY_FOUR_HOURS) {
      notifs.push({
        id: 'profile-updated', type: 'info', source: 'profile', priority: 2,
        title: 'Profil Kucing Diperbarui',
        body: `Profil ${cat.name} diperbarui ${formatTime(profileUpdatedAt)}. Target feeding baru: ${cat.dailyGramTarget}g/hari.`,
        time: formatTime(profileUpdatedAt),
        route: 'cat-profile',
      });
    }
  }

  // ── 3. Feeding logs: hanya profil saat ini + hari ini (sejak tengah malam lokal) ─
  const todayStartMs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const recentLogs = feedingLogs.filter(
    (log) => log.timestamp >= profileUpdatedAt && log.timestamp >= todayStartMs
  );

  recentLogs.slice(0, 20).forEach((log) => {
    const trigger  = getTriggerType(log.notes);
    const isOverfed = (log.amountDispensed ?? 0) > log.amountRequested * 1.1;

    if (isOverfed && log.status !== 'failed') {
      notifs.push({
        id: `overfed-${log.id}`, type: 'error', source: 'overfeeding', priority: 0,
        title: 'Pakan Diberikan Berlebihan',
        body: `Diberikan ${log.amountDispensed}g, target ${log.amountRequested}g (lebih ${((log.amountDispensed ?? 0) - log.amountRequested).toFixed(1)}g). Periksa kalibrasi timbangan.`,
        time: formatTime(log.timestamp),
        route: 'history',
      });
      return;
    }

    const source: NotifSource = trigger === 'manual' ? 'manual' : 'auto';

    const title =
      log.status === 'success'
        ? trigger === 'manual' ? 'Feeding Manual Berhasil'      : 'Feeding Otomatis Berhasil'
        : log.status === 'warning'
        ? trigger === 'manual' ? 'Feeding Manual Kurang Akurat'  : 'Feeding Otomatis Kurang Akurat'
        : trigger === 'manual' ? 'Feeding Manual Gagal'          : 'Feeding Otomatis Gagal';

    const body =
      log.status === 'success'
        ? `Diberikan ${log.amountDispensed}g sesuai target ${log.amountRequested}g.`
        : log.status === 'warning'
        ? `Diberikan ${log.amountDispensed}g dari target ${log.amountRequested}g. Selisih melebihi toleransi ±5%.`
        : `Gagal memberikan pakan. Target ${log.amountRequested}g tidak tercapai. Periksa stok dan servo.`;

    notifs.push({
      id: log.id,
      type: log.status === 'success' ? 'success' : log.status === 'warning' ? 'warning' : 'error',
      source, title, body,
      time: formatTime(log.timestamp),
      priority: log.status === 'success' ? 4 : log.status === 'warning' ? 2 : 1,
      route: trigger === 'manual' ? 'feeding-control' : 'history',
    });
  });

  // ── Group ─────────────────────────────────────────────────────────────────
  const grouped = SECTION_ORDER.reduce<Record<NotifSource, NotifItem[]>>(
    (acc, src) => {
      acc[src] = notifs
        .filter((n) => n.source === src)
        .sort((a, b) => a.priority - b.priority);
      return acc;
    },
    {} as Record<NotifSource, NotifItem[]>
  );

  const urgentCount = notifs.filter((n) => n.type === 'error' || n.type === 'warning').length;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2.5">
            <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 shrink-0" />
            Notifikasi
          </h2>
          <p className="text-gray-400 mt-0.5 text-sm">
            {urgentCount > 0
              ? `${urgentCount} notifikasi perlu perhatian segera`
              : 'Semua sistem berjalan dalam kondisi normal'}
          </p>
        </div>
        {urgentCount > 0 && (
          <span className="self-start sm:self-auto px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-black shrink-0">
            {urgentCount} perlu tindakan
          </span>
        )}
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryCard
          icon={device?.isOnline ? Wifi : WifiOff}
          iconBg={device?.isOnline ? 'bg-green-50' : 'bg-gray-50'}
          iconColor={device?.isOnline ? 'text-green-500' : 'text-gray-400'}
          label="Perangkat"
          value={device ? (device.isOnline ? 'Online' : 'Offline') : 'Tidak ada'}
          valueColor={device?.isOnline ? 'text-green-600' : 'text-gray-500'}
        />
        <SummaryCard
          icon={Database}
          iconBg={(device?.foodStockLevel ?? 100) < 20 ? 'bg-orange-50' : 'bg-green-50'}
          iconColor={(device?.foodStockLevel ?? 100) < 20 ? 'text-orange-500' : 'text-green-500'}
          label="Stok Pakan"
          value={device ? `${device.foodStockLevel}%` : '—'}
          valueColor={(device?.foodStockLevel ?? 100) < 20 ? 'text-orange-600' : 'text-green-600'}
        />
        <SummaryCard
          icon={Bell}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          label="Hari Ini"
          value={`${recentLogs.length} feeding`}
          valueColor="text-amber-700"
        />
      </div>

      {/* ── Section list ── */}
      {SECTION_ORDER.map((src) => {
        const items = grouped[src];
        if (!items || items.length === 0) return null;
        const srcCfg = SOURCE_CONFIG[src];
        const SrcIcon = srcCfg.icon;

        return (
          <div key={src} className="space-y-2">
            {/* Section header */}
            <div className="flex items-center gap-2 px-1">
              <div className={cn('w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0', srcCfg.bg)}>
                <SrcIcon className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', srcCfg.text)} />
              </div>
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500">
                {SECTION_LABELS[src]}
              </h3>
              <span className={cn('ml-auto px-2 py-0.5 rounded-full text-[10px] font-black', srcCfg.bg, srcCfg.text)}>
                {items.length}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {items.map((notif) => {
                const cfg      = TYPE_CONFIG[notif.type];
                const Icon     = cfg.icon;
                const clickable = !!notif.route && !!onNavigate;

                const inner = (
                  <>
                    <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.iconBg)}>
                      <Icon className={cn('w-4 h-4', cfg.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('font-black text-xs sm:text-sm leading-snug', cfg.iconColor)}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] sm:text-xs text-gray-400 shrink-0 whitespace-nowrap">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-relaxed">
                        {notif.body}
                      </p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black',
                          srcCfg.bg, srcCfg.text
                        )}>
                          <SrcIcon className="w-2.5 h-2.5" />
                          {srcCfg.label}
                        </span>
                        {clickable && (
                          <span className="text-[10px] text-gray-400 font-medium">Ketuk →</span>
                        )}
                      </div>
                    </div>
                  </>
                );

                const baseClass = cn(
                  'w-full text-left bg-white rounded-2xl border p-3 sm:p-4 flex items-start gap-3 transition-all',
                  cfg.border,
                  clickable && 'cursor-pointer hover:shadow-md active:scale-[0.99]'
                );

                return clickable ? (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => onNavigate!(notif.route!)}
                    className={baseClass}
                  >
                    {inner}
                  </button>
                ) : (
                  <div key={notif.id} className={baseClass}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Empty state ── */}
      {notifs.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-gray-500 font-bold">Tidak ada notifikasi</p>
          <p className="text-gray-400 text-sm mt-1">Semua sistem berjalan normal.</p>
        </div>
      )}
    </div>
  );
}
