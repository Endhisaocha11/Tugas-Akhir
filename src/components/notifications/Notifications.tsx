import type { ElementType } from 'react';
import {
  Bell, CheckCircle, AlertTriangle, XCircle, Info,
  Wifi, WifiOff, Database, Utensils, RefreshCw, Zap, ShieldAlert,
} from 'lucide-react';
import { useCatData } from '../../lib/useCatData';
import { cn } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType = 'success' | 'warning' | 'error' | 'info';
type NotifSource = 'device' | 'health' | 'manual' | 'auto' | 'overfeeding' | 'profile';

interface NotifItem {
  id: string;
  type: NotifType;
  source: NotifSource;
  title: string;
  body: string;
  time: string;
  priority: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, {
  icon: ElementType;
  iconColor: string;
  iconBg: string;
  border: string;
}> = {
  success: { icon: CheckCircle, iconColor: 'text-green-500',  iconBg: 'bg-green-50',  border: 'border-green-100' },
  warning: { icon: AlertTriangle, iconColor: 'text-yellow-500', iconBg: 'bg-yellow-50', border: 'border-yellow-100' },
  error:   { icon: XCircle,      iconColor: 'text-red-500',    iconBg: 'bg-red-50',    border: 'border-red-100'   },
  info:    { icon: Info,         iconColor: 'text-blue-500',   iconBg: 'bg-blue-50',   border: 'border-blue-100'  },
};

const SOURCE_CONFIG: Record<NotifSource, { label: string; bg: string; text: string; icon: ElementType }> = {
  device:     { label: 'Perangkat',  bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Wifi },
  health:     { label: 'Kesehatan',  bg: 'bg-purple-100', text: 'text-purple-700', icon: ShieldAlert },
  manual:     { label: 'Manual',     bg: 'bg-green-100',  text: 'text-green-700',  icon: Utensils },
  auto:       { label: 'Otomatis',   bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Zap },
  overfeeding:{ label: 'Overfeeding',bg: 'bg-red-100',    text: 'text-red-700',    icon: AlertTriangle },
  profile:    { label: 'Profil',     bg: 'bg-teal-100',   text: 'text-teal-700',   icon: RefreshCw },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Baru saja';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit lalu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`;
  return new Date(ts).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function getTriggerType(notes?: string): 'manual' | 'auto' | null {
  if (!notes) return null;
  const n = notes.toLowerCase();
  if (n.includes('manual')) return 'manual';
  if (n.includes('auto') || n.includes('scheduled') || n.includes('otomatis') || n.includes('jadwal')) return 'auto';
  return null;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Notifications() {
  const { cat, device, feedingLogs, loading } = useCatData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const notifs: NotifItem[] = [];

  // ── 1. Device notifications ──────────────────────────────────────────────
  if (device) {
    if (!device.isOnline) {
      notifs.push({
        id: 'dev-offline',
        type: 'error',
        source: 'device',
        title: 'Perangkat Offline',
        body: 'Smart Cat Feeder tidak terhubung ke internet. Periksa koneksi Wi-Fi perangkat Anda.',
        time: device.lastPulse ? formatTime(device.lastPulse) : '—',
        priority: 0,
      });
    }

    if (device.foodStockLevel < 20) {
      notifs.push({
        id: 'low-stock',
        type: 'warning',
        source: 'device',
        title: 'Stok Makanan Hampir Habis',
        body: `Sisa stok pakan hanya ${device.foodStockLevel}%. Segera isi ulang wadah sebelum kehabisan.`,
        time: 'Sekarang',
        priority: 1,
      });
    }

    if (device.servoStatus === 'jammed') {
      notifs.push({
        id: 'servo-jammed',
        type: 'error',
        source: 'device',
        title: 'Servo Macet',
        body: 'Mekanisme dispenser mengalami hambatan mekanis. Periksa kondisi fisik perangkat dan bersihkan dari sumbatan.',
        time: 'Sekarang',
        priority: 0,
      });
    }

    if (device.isOnline && device.servoStatus === 'idle' && device.foodStockLevel >= 20) {
      notifs.push({
        id: 'dev-ready',
        type: 'success',
        source: 'device',
        title: 'Perangkat Siap Digunakan',
        body: `Smart Cat Feeder aktif dan siaga. Stok pakan ${device.foodStockLevel}%. Servo dalam kondisi baik.`,
        time: device.lastPulse ? formatTime(device.lastPulse) : 'Sekarang',
        priority: 3,
      });
    }

    if (device.isOnline && device.servoStatus === 'active') {
      notifs.push({
        id: 'dev-active',
        type: 'info',
        source: 'device',
        title: 'Perangkat Sedang Aktif',
        body: 'Smart Cat Feeder sedang mendispens pakan. Berat mangkok saat ini: ' + device.currentWeightOnScale + 'g.',
        time: 'Sekarang',
        priority: 2,
      });
    }
  } else {
    notifs.push({
      id: 'no-device',
      type: 'info',
      source: 'device',
      title: 'Perangkat Belum Terhubung',
      body: 'Belum ada data perangkat. Admin perlu menghubungkan Smart Cat Feeder ke sistem terlebih dahulu.',
      time: 'Sekarang',
      priority: 2,
    });
  }

  // ── 2. Cat health notifications ──────────────────────────────────────────
  if (cat) {
    const bc = cat.bodyCondition as unknown as number;

    if (bc >= 7) {
      notifs.push({
        id: 'cat-overweight',
        type: 'warning',
        source: 'health',
        title: `${cat.name} — Kelebihan Berat Badan`,
        body: `BCS ${bc}/9 (${bc >= 9 ? 'Obesitas' : 'Overweight'}). Feeding harian dikurangi otomatis 15%. Konsultasikan ke dokter hewan untuk diet yang tepat.`,
        time: 'Data terkini',
        priority: 1,
      });
    } else if (bc <= 2) {
      notifs.push({
        id: 'cat-underweight',
        type: 'warning',
        source: 'health',
        title: `${cat.name} — Kekurangan Berat Badan`,
        body: `BCS ${bc}/9 (Sangat Kurus). Feeding harian ditingkatkan. Segera konsultasikan ke dokter hewan.`,
        time: 'Data terkini',
        priority: 1,
      });
    } else {
      notifs.push({
        id: 'cat-healthy',
        type: 'success',
        source: 'health',
        title: `${cat.name} — Kondisi Tubuh Normal`,
        body: `BCS ${bc}/9. Berat badan dalam rentang ideal. Tetap pantau kondisi tubuh secara berkala.`,
        time: 'Data terkini',
        priority: 4,
      });
    }

    // Profile updated notification
    const updatedAt = (cat as any).updatedAt as string | undefined;
    if (updatedAt) {
      const updatedMs = new Date(updatedAt).getTime();
      if (Date.now() - updatedMs < 86_400_000) {
        notifs.push({
          id: 'profile-updated',
          type: 'info',
          source: 'profile',
          title: 'Profil Kucing Diperbarui',
          body: `Data profil ${cat.name} baru saja diperbarui melalui Onboarding Flow. Target feeding diperbarui: ${cat.dailyGramTarget}g/hari.`,
          time: formatTime(updatedMs),
          priority: 2,
        });
      }
    }
  }

  // ── 3. Feeding log notifications ─────────────────────────────────────────
  feedingLogs.slice(0, 15).forEach((log) => {
    const trigger = getTriggerType(log.notes);
    const isOverfed = log.amountDispensed > log.amountRequested * 1.1;

    // Overfeeding alert takes priority
    if (isOverfed && log.status !== 'failed') {
      notifs.push({
        id: `overfed-${log.id}`,
        type: 'error',
        source: 'overfeeding',
        title: 'Pakan Diberikan Berlebihan',
        body: `Diberikan ${log.amountDispensed}g, target hanya ${log.amountRequested}g (lebih ${log.amountDispensed - log.amountRequested}g). Periksa kalibrasi timbangan.`,
        time: formatTime(log.timestamp),
        priority: 0,
      });
      return;
    }

    const source: NotifSource = trigger === 'manual' ? 'manual' : trigger === 'auto' ? 'auto' : 'auto';

    const title =
      log.status === 'success'
        ? trigger === 'manual' ? 'Feeding Manual Berhasil' : 'Feeding Otomatis Berhasil'
        : log.status === 'warning'
        ? trigger === 'manual' ? 'Feeding Manual Kurang Akurat' : 'Feeding Otomatis Kurang Akurat'
        : trigger === 'manual' ? 'Feeding Manual Gagal' : 'Feeding Otomatis Gagal';

    const body =
      log.status === 'success'
        ? `Diberikan ${log.amountDispensed}g sesuai target ${log.amountRequested}g.${log.notes ? ` (${log.notes})` : ''}`
        : log.status === 'warning'
        ? `Diberikan ${log.amountDispensed}g dari target ${log.amountRequested}g. Selisih melebihi toleransi ±5%.`
        : `Gagal memberikan pakan. Target ${log.amountRequested}g tidak tercapai. Periksa stok dan kondisi servo.`;

    notifs.push({
      id: log.id,
      type: log.status === 'success' ? 'success' : log.status === 'warning' ? 'warning' : 'error',
      source,
      title,
      body,
      time: formatTime(log.timestamp),
      priority: log.status === 'success' ? 4 : log.status === 'warning' ? 2 : 1,
    });
  });

  // ── Group by source ──────────────────────────────────────────────────────
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
    <div className="space-y-8 max-w-3xl">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Notifikasi</h2>
          <p className="text-gray-400 mt-1 text-sm">
            {urgentCount > 0
              ? `${urgentCount} notifikasi perlu perhatian segera`
              : 'Semua sistem berjalan dalam kondisi normal'}
          </p>
        </div>
        {urgentCount > 0 && (
          <span className="px-4 py-2 rounded-full bg-red-500 text-white text-sm font-black shrink-0">
            {urgentCount} perlu tindakan
          </span>
        )}
      </div>

      {/* ── SUMMARY STRIP ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Device */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            device?.isOnline ? 'bg-green-50' : 'bg-gray-50'
          )}>
            {device?.isOnline
              ? <Wifi className="w-5 h-5 text-green-500" />
              : <WifiOff className="w-5 h-5 text-gray-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium truncate">Perangkat</p>
            <p className={cn('font-black text-sm', device?.isOnline ? 'text-green-600' : 'text-gray-500')}>
              {device ? (device.isOnline ? 'Online' : 'Offline') : 'Tidak ada'}
            </p>
          </div>
        </div>

        {/* Stock */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            (device?.foodStockLevel ?? 100) < 20 ? 'bg-orange-50' : 'bg-green-50'
          )}>
            <Database className={cn('w-5 h-5', (device?.foodStockLevel ?? 100) < 20 ? 'text-orange-500' : 'text-green-500')} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium truncate">Stok Pakan</p>
            <p className={cn('font-black text-sm', (device?.foodStockLevel ?? 100) < 20 ? 'text-orange-600' : 'text-green-600')}>
              {device ? `${device.foodStockLevel}%` : '—'}
            </p>
          </div>
        </div>

        {/* Total logs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 shrink-0">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium truncate">Total Log</p>
            <p className="font-black text-sm text-amber-700">{feedingLogs.length} feeding</p>
          </div>
        </div>
      </div>

      {/* ── SECTION LIST ── */}
      {SECTION_ORDER.map((src) => {
        const items = grouped[src];
        if (!items || items.length === 0) return null;
        const srcCfg = SOURCE_CONFIG[src];
        const SrcIcon = srcCfg.icon;

        return (
          <div key={src} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-1">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', srcCfg.bg)}>
                <SrcIcon className={cn('w-4 h-4', srcCfg.text)} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
                {SECTION_LABELS[src]}
              </h3>
              <span className={cn('ml-auto px-2 py-0.5 rounded-full text-xs font-black', srcCfg.bg, srcCfg.text)}>
                {items.length}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {items.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type];
                const Icon = cfg.icon;

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'bg-white rounded-2xl border p-4 flex items-start gap-4',
                      cfg.border
                    )}
                  >
                    {/* Type icon */}
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.iconBg)}>
                      <Icon className={cn('w-4.5 h-4.5', cfg.iconColor)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className={cn('font-black text-sm', cfg.iconColor)}>{notif.title}</p>
                        <span className="text-xs text-gray-400 shrink-0">{notif.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notif.body}</p>

                      {/* Source badge */}
                      <div className="mt-2">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black', srcCfg.bg, srcCfg.text)}>
                          <SrcIcon className="w-2.5 h-2.5" />
                          {srcCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── EMPTY STATE ── */}
      {notifs.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-14 text-center">
          <div className="text-5xl mb-4">🐾</div>
          <p className="text-gray-500 font-bold">Tidak ada notifikasi</p>
          <p className="text-gray-400 text-sm mt-1">Semua sistem berjalan normal.</p>
        </div>
      )}
    </div>
  );
}
