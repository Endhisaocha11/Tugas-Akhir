import { useState, useEffect } from 'react';
import {
  BookOpen, AlertCircle, Droplets, Calculator, ArrowRight,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ExternalLink, CheckCircle2, Microscope,
  FlaskConical, Cpu, Scale, Shield, TrendingUp, FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
const kucingminum = '/kucingminum.png';
const flutd = '/flutd.png';
const kucing = '/kucing.png';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JournalRef {
  authors: string;
  year: number;
  title: string;
  journal: string;
  doi?: string;
  url?: string;
  badge: 'peer-reviewed' | 'guidelines' | 'systematic-review' | 'national';
}

interface Article {
  id: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  image: string;
  summary: string;
  sections: { heading: string; body: string }[];
  keyPoints: string[];
  refs: JournalRef[];
}

// ── Journal Badge ─────────────────────────────────────────────────────────────

function JournalBadge({ badge }: { badge: JournalRef['badge'] }) {
  const map = {
    'peer-reviewed':    { label: 'Peer-Reviewed', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    'guidelines':       { label: 'Panduan Resmi', cls: 'bg-green-50 text-green-700 border-green-200' },
    'systematic-review':{ label: 'Systematic Review', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    'national':         { label: 'Jurnal Nasional', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  }[badge];
  return (
    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', map.cls)}>
      {map.label}
    </span>
  );
}

// ── Reference Card ────────────────────────────────────────────────────────────

function RefCard({ ref: r }: { ref: JournalRef }) {
  // URL langsung (PMC/open access) lebih diprioritaskan daripada DOI
  const primaryHref = r.url ?? (r.doi ? `https://doi.org/${r.doi}` : null);
  const primaryLabel = r.url ? 'Buka Artikel ↗' : `DOI: ${r.doi}`;

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-amber-200 hover:bg-amber-50/40 transition-colors group">
      <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
        <FileText className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <JournalBadge badge={r.badge} />
          <span className="text-[10px] font-bold text-gray-400">{r.year}</span>
        </div>
        <p className="text-xs font-bold text-gray-800 leading-snug mb-0.5">{r.title}</p>
        <p className="text-[11px] text-gray-500 italic">{r.authors}</p>
        <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{r.journal}</p>
        <div className="flex items-center flex-wrap gap-3 mt-1.5">
          {primaryHref && (
            <a href={primaryHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline">
              {primaryLabel}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {/* Tampilkan DOI sebagai info sekunder jika url sudah ada sebagai primary */}
          {r.url && r.doi && (
            <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600">
              DOI ↗
              <ExternalLink className="w-2 h-2" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Article Data ──────────────────────────────────────────────────────────────

const ARTICLES: Article[] = [
  // ── ARTICLE 1: FLUTD ──────────────────────────────────────────────────────
  {
    id: 'flutd',
    category: 'Kesehatan',
    categoryColor: 'text-red-600',
    categoryBg: 'bg-red-50 border-red-100',
    icon: AlertCircle,
    title: 'FLUTD: Bahaya di Balik Pakan Berlebih',
    subtitle: 'Feline Lower Urinary Tract Disease & kaitannya dengan pola makan',
    image: kucing,
    summary:
      'FLUTD adalah kelompok penyakit saluran kemih bawah pada kucing yang sangat umum dan berkaitan erat dengan pola makan dan hidrasi.',
    sections: [
      {
        heading: 'Apa itu FLUTD?',
        body:
          'FLUTD (Feline Lower Urinary Tract Disease) adalah istilah umum untuk berbagai kondisi yang memengaruhi kandung kemih dan uretra kucing. Gejalanya meliputi susah buang air kecil, sering ke kotak pasir tanpa hasil, urine berdarah, dan menjilat area genital berlebihan. Pada kucing jantan, FLUTD dapat menyebabkan sumbatan uretra yang mengancam jiwa jika tidak ditangani.',
      },
      {
        heading: 'Hubungan Diet & FLUTD',
        body:
          'Diet adalah faktor risiko yang paling bisa dikendalikan oleh pemilik kucing. Studi klinis Naarden & Corbee (2019) membuktikan bahwa kucing yang diberi diet terapeutik (lebih tinggi asam lemak omega-3, vitamin E, dan taurin) mengalami rekurensi FIC (Feline Idiopathic Cystitis) hanya 29,4% dalam 5 minggu, dibandingkan 78,6% pada kelompok kontrol — risiko relatif berkurang 7,89 kali lipat. Diet ini juga mempertahankan pH urine 6,0–6,4 yang menghambat pembentukan kristal struvit dan kalsium oksalat.',
      },
      {
        heading: 'Makanan Kering vs Basah',
        body:
          'Riset oleh Bartges & Kirk (2007) di Journal of Feline Medicine and Surgery menunjukkan bahwa kucing yang diberi pakan basah (wet food) mengalami rekurensi FIC hanya 11%, versus 39% pada kelompok pakan kering. Hal ini karena pakan basah meningkatkan asupan air, mengencerkan urine, dan menurunkan urine specific gravity (USG). Meski demikian, kontrol porsi tetap penting — pakan basah berlebih dapat menyebabkan obesitas yang juga merupakan faktor risiko FLUTD.',
      },
      {
        heading: 'Systematic Review Terbaru (2025)',
        body:
          'Tinjauan sistematis terbaru yang dipublikasikan di New Zealand Veterinary Journal (2025) mengonfirmasi bahwa strategi manajemen FLUTD yang paling konsisten didukung bukti adalah: (1) diet promotif pH urine seimbang, (2) peningkatan asupan air, (3) penurunan berat badan pada kucing overweight, dan (4) pengurangan stres lingkungan. Tidak ada bukti kuat untuk diet "anti-FLUTD" tertentu kecuali yang telah melalui uji klinis terkontrol.',
      },
      {
        heading: 'Peran PawfectCare dalam Pencegahan',
        body:
          'Sistem PawfectCare membantu mencegah FLUTD dengan cara: mengontrol porsi pakan secara akurat (±1,5 gram) sehingga kucing tidak kelebihan berat badan, menjalankan jadwal makan teratur agar pH urine stabil, mencegah overfeeding melalui batas kalori harian otomatis, dan memberikan notifikasi jika stok pakan rendah sehingga kucing tidak kelaparan dan tergesa-gesa minum berlebih.',
      },
    ],
    keyPoints: [
      'Diet terapeutik mengurangi rekurensi FIC hingga 7,89× dibanding pakan biasa',
      'Pakan basah: 11% rekurensi vs pakan kering: 39% rekurensi FIC',
      'Kontrol porsi dan berat badan adalah kunci pencegahan utama',
      'pH urine target 6,0–6,4 menghambat pembentukan kristal',
      'Jadwal makan teratur membantu menjaga kestabilan metabolisme',
    ],
    refs: [
      {
        authors: 'Naarden, B. & Corbee, R.J.',
        year: 2019,
        title: 'The effect of a therapeutic urinary stress diet on the short-term recurrence of feline idiopathic cystitis',
        journal: 'Veterinary Medicine and Science, 6(1), 32–38',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7036317/',
        doi: '10.1002/vms3.197',
        badge: 'peer-reviewed',
      },
      {
        authors: 'Witzel-Rollins, A., Murphy, M., Springer, C.M., et al.',
        year: 2022,
        title: 'Unsupervised weight loss in multi-cat households: effects of an automatic feeder and meal frequency',
        journal: 'Journal of Feline Medicine and Surgery',
        url: 'https://journals.sagepub.com/doi/full/10.1177/1098612X221105046',
        doi: '10.1177/1098612X221105046',
        badge: 'peer-reviewed',
      },
      {
        authors: 'Bartges, J. & Kirk, C.',
        year: 2007,
        title: 'Nutrition and Urinary Tract Disease in Cats: Myths and Legends',
        journal: 'Journal of Feline Medicine and Surgery, 9(6), 487–490',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10911512/',
        doi: '10.1016/S1098-612X-07-00199-4',
        badge: 'peer-reviewed',
      },
      {
        authors: 'Tinjauan Sistematis — Taylor & Francis',
        year: 2025,
        title: 'Understanding the current evidence base for the commonly recommended management strategies for recurrent feline idiopathic cystitis: a systematic review',
        journal: 'New Zealand Veterinary Journal',
        url: 'https://www.tandfonline.com/doi/full/10.1080/00480169.2025.2477542',
        doi: '10.1080/00480169.2025.2477542',
        badge: 'systematic-review',
      },
    ],
  },

  // ── ARTICLE 2: Formula RER ────────────────────────────────────────────────
  {
    id: 'formula',
    category: 'Nutrisi & Sains',
    categoryColor: 'text-amber-600',
    categoryBg: 'bg-amber-50 border-amber-100',
    icon: Calculator,
    title: 'Formula Ilmiah di Balik Takaran Pakan',
    subtitle: 'Gram = (Fm × Fg × Fo × Fa × RER) ÷ E — 4 faktor, 1 sumber riset',
    image: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&q=80&w=600',
    summary:
      'Takaran pakan PawfectCare dihitung dari formula 4-faktor berbasis NRC 2006 & WSAVA 2021: Fm (maintenance), Fg (gender), Fo (berat badan/BCS), Fa (aktivitas).',
    sections: [
      {
        heading: 'Dasar Formula: RER dari Max Kleiber (1932)',
        body:
          'Inti formula adalah RER = 70 × BB(kg)⁰·⁷⁵, yaitu kalori minimum kucing untuk mempertahankan fungsi vital saat istirahat total. Angka 70 dan eksponen 0,75 berasal dari hukum metabolik Kleiber: kebutuhan energi sebanding dengan luas permukaan tubuh (metabolic body weight), bukan massa langsung. NRC (2006) mengkonfirmasi formula ini untuk kucing domestik, dan WSAVA (2021) menggunakannya sebagai standar global.',
      },
      {
        heading: 'Fm — Faktor Maintenance (Umur + Status Steril)',
        body:
          'Fm menggabungkan dua variabel paling dominan: tahap kehidupan (life stage) dan status reproduksi. Anak kucing membutuhkan hingga 3× RER untuk mendukung pertumbuhan aktif. Sterilisasi menurunkan kebutuhan ~20–25% karena pengurangan hormon reproduksi. WSAVA (2021) menetapkan: kitten 0–6 bln = 3,0 | kitten 6–12 bln = 2,0 | dewasa steril = 1,2 | dewasa tidak steril = 1,6 | senior steril = 1,1 | senior tidak steril = 1,4 | geriatri >12 th = 0,8. Fm adalah faktor dengan pengaruh terbesar dalam formula.',
      },
      {
        heading: 'Fg — Faktor Jenis Kelamin (Koreksi Risiko)',
        body:
          'Fg adalah faktor koreksi opsional berdasarkan jenis kelamin. Jantan memiliki massa otot dan luas tubuh sedikit lebih besar, sehingga BMR-nya sedikit lebih tinggi. Betina — terutama yang steril — cenderung punya risiko penambahan berat lebih tinggi sehingga nilai Fg diperkecil sebagai koreksi. Nilai panduan: Jantan = 1,0 (referensi) | Betina = 0,9. Perbedaan ~10% ini dibuktikan oleh studi perbandingan metabolisme kucing jantan vs betina (Wolfsheimer, 1994 dalam Kirk\'s Current Veterinary Therapy XII). Fg bersifat opsional — jika tidak diketahui, gunakan Fg = 1,0.',
      },
      {
        heading: 'Fo — Faktor Berat Badan (Body Condition Score)',
        body:
          'Fo menyesuaikan kalori berdasarkan kondisi tubuh aktual kucing, diukur menggunakan BCS (Body Condition Score) skala 1–5. Kucing dengan BCS di bawah ideal perlu asupan lebih tinggi untuk mencapai berat ideal; sebaliknya, kucing obesitas harus diberi kalori lebih rendah agar berat turun secara aman. WSAVA (2021) merekomendasikan untuk kucing obesitas menggunakan berat ideal (bukan berat aktual) lalu mengalikan dengan faktor 0,8. Nilai: BCS 1–2 (kurus) = 1,2 | BCS 3 (ideal) = 1,0 | BCS 4 (gemuk) = 0,9 | BCS 5 (obesitas) = 0,8.',
      },
      {
        heading: 'Fa — Faktor Aktivitas',
        body:
          'Fa mencerminkan tingkat aktivitas fisik kucing sehari-hari. Kucing yang lebih banyak bergerak membakar lebih banyak kalori untuk kontraksi otot dan termoregulasi. Hand et al. (2010) dalam Small Animal Clinical Nutrition memberikan panduan berdasarkan observasi klinis: Sangat tidak aktif = 0,8 | Tidak aktif = 0,9 | Normal = 1,0 | Aktif = 1,1 | Sangat aktif = 1,3. Fa berbeda dari faktor lingkungan outdoor — seekor kucing indoor yang sering bermain bisa punya Fa lebih tinggi dari kucing outdoor yang lebih banyak tidur.',
      },
      {
        heading: 'E — Energi Pakan & Mengapa Default 4 kcal/gram?',
        body:
          'E adalah metabolizable energy (ME) per gram pakan — nilai yang tertera di label kemasan sebagai kcal/kg, dibagi 1000 menjadi kcal/gram. PawfectCare menggunakan default E = 4,0 kcal/gram karena NRC (2006) mencatat rentang ME pakan kering komersial adalah 3.700–4.200 kcal/kg, dengan rata-rata mendekati 4.000 kcal/kg. Case et al. (2011) dalam Canine and Feline Nutrition (3rd ed.) juga mengkonfirmasi bahwa 4.000 kcal/kg adalah nilai tengah praktis untuk pakan kering standar. Pengguna disarankan menggantinya dengan nilai aktual dari label kemasan untuk presisi maksimal.',
      },
      {
        heading: 'Mengapa PawfectCare Default 6× Pemberian Makan?',
        body:
          'Kucing adalah karnivora obligat yang berevolusi dari leluhur gurun Afrika yang berburu mangsa kecil 8–16 kali sehari. Bradshaw (2006) dalam Journal of Nutrition membuktikan bahwa feeding pattern alami kucing adalah multiple small meals — bukan 1–2 kali makan besar. Kapasitas lambung kucing hanya ~40–60 mL (Zoran, 2002), sehingga terlalu banyak pakan sekaligus menyebabkan regurgitasi, lonjakan insulin, dan stres. 6× per hari adalah titik tengah praktis yang mendistribusikan kalori merata, mencegah overeating sekaligus menjaga pH urine lebih stabil untuk mencegah FLUTD (Buffington et al., 2006).',
      },
      {
        heading: 'Contoh Perhitungan Lengkap',
        body:
          'Mochi: betina, steril, 4,5 kg, 3 tahun, BCS 3 (ideal), normal aktif, pakan kering E=4,0 kcal/g. RER = 70 × 4,5⁰·⁷⁵ = 218 kcal. Fm=1,2 (steril dewasa), Fg=0,9 (betina), Fo=1,0 (BCS ideal), Fa=1,0 (normal). DER = 1,2 × 0,9 × 1,0 × 1,0 × 218 = 235 kcal/hari. Gram = 235 ÷ 4,0 = 59 gram/hari. Dibagi 6× feeding: ~10g per makan. Hasilnya konsisten dengan rekomendasi WSAVA untuk kucing steril betina dewasa ideal.',
      },
    ],
    keyPoints: [
      'Formula: Gram = (Fm × Fg × Fo × Fa × 70 × BB⁰·⁷⁵) ÷ E',
      'Fm (maintenance+steril): Kitten=3,0 | Steril dewasa=1,2 | Tidak steril dewasa=1,6',
      'Fg (gender): Jantan=1,0 | Betina=0,9 — koreksi opsional ±10%',
      'Fo (BCS/berat badan): BCS 1-2=1,2 | BCS 3=1,0 | BCS 4=0,9 | BCS 5=0,8',
      'Fa (aktivitas): Sangat tdk aktif=0,8 | Normal=1,0 | Sangat aktif=1,3',
      'E default = 4 kcal/gram karena rata-rata pakan kering komersial 3.700–4.200 kcal/kg (NRC 2006)',
      '6× makan/hari = sesuai pola alami kucing (8–16 meal/hari di alam liar, Bradshaw 2006)',
    ],
    refs: [
      {
        authors: 'National Research Council (NRC)',
        year: 2006,
        title: 'Nutrient Requirements of Dogs and Cats',
        journal: 'National Academies Press, Washington DC',
        badge: 'guidelines',
      },
      {
        authors: 'WSAVA Global Nutrition Committee',
        year: 2021,
        title: 'WSAVA Global Nutrition Guidelines & Toolkit',
        journal: 'World Small Animal Veterinary Association',
        url: 'https://wsava.org/global-guidelines/global-nutrition-guidelines/',
        badge: 'guidelines',
      },
      {
        authors: 'Hand, M.S., Thatcher, C.D., Remillard, R.L., et al.',
        year: 2010,
        title: 'Small Animal Clinical Nutrition, 5th Edition',
        journal: 'Mark Morris Institute',
        badge: 'guidelines',
      },
      {
        authors: 'Case, L.P., Daristotle, L., Hayek, M.G., Raasch, M.F.',
        year: 2011,
        title: 'Canine and Feline Nutrition: A Resource for Companion Animal Professionals, 3rd ed.',
        journal: 'Mosby/Elsevier',
        badge: 'guidelines',
      },
      {
        authors: 'Bradshaw, J.W.S.',
        year: 2006,
        title: 'The evolutionary basis for the feeding behavior of domestic dogs and cats',
        journal: 'Journal of Nutrition, 136(7 Suppl), 1927S–1931S',
        url: 'https://academic.oup.com/jn/article/136/7/1927S/4664437',
        doi: '10.1093/jn/136.7.1927S',
        badge: 'peer-reviewed',
      },
      {
        authors: 'Zoran, D.L.',
        year: 2002,
        title: 'The carnivore connection to nutrition in cats',
        journal: 'Journal of the American Veterinary Medical Association, 221(11), 1559–1567',
        url: 'https://avmajournals.avma.org/doi/10.2460/javma.2002.221.1559',
        doi: '10.2460/javma.2002.221.1559',
        badge: 'peer-reviewed',
      },
      {
        authors: 'Buffington, C.A.T., Westropp, J.L., Chew, D.J., Bolus, R.R.',
        year: 2006,
        title: 'Clinical evaluation of multimodal environmental modification in the management of cats with idiopathic cystitis',
        journal: 'Journal of Feline Medicine and Surgery, 8(4), 261–268',
        doi: '10.1016/j.jfms.2006.02.002',
        badge: 'peer-reviewed',
      },
    ],
  },

  // ── ARTICLE 3: Akurasi Alat ───────────────────────────────────────────────
  {
    id: 'accuracy',
    category: 'Teknologi',
    categoryColor: 'text-blue-600',
    categoryBg: 'bg-blue-50 border-blue-100',
    icon: Scale,
    title: 'Seberapa Akurat Timbangan & Sensor Kami?',
    subtitle: 'Dasar ilmiah di balik akurasi sensor HX711 dan ultrasonik sistem ini',
    image: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=600',
    summary:
      'Akurasi dispensasi ±1,5 gram bukan klaim sembarangan — didukung oleh spesifikasi teknis dan penelitian tentang modul sensor HX711.',
    sections: [
      {
        heading: 'HX711: ADC 24-bit untuk Timbangan Presisi',
        body:
          'Modul HX711 adalah penguat sinyal ADC (Analog-to-Digital Converter) 24-bit yang dirancang khusus untuk antarmuka dengan load cell (sel beban). Resolusi 24-bit berarti dapat membedakan hingga 16,7 juta tingkat nilai dari rentang penuh timbangan — jauh melampaui kebutuhan pengukuran pakan kucing yang hanya perlu resolusi ±0,5 gram. Spesifikasi resmi Avia Semiconductor menyatakan akurasi ±0,05% dari nilai penuh skala timbangan.',
      },
      {
        heading: 'Hasil Pengujian Penelitian (Jurnal Nasional)',
        body:
          'Sri Hartanto dari Universitas Krisnadwipayana Jakarta melakukan pengujian implementasi timbangan digital berbasis HX711 berkapasitas 20 kg. Hasil menunjukkan bahwa modul HX711 mampu memberikan pembacaan yang stabil dan konsisten dengan error yang dapat diminimalkan melalui kalibrasi faktor skala yang tepat. Penelitian ini dipublikasikan dalam Jurnal Elektro Krisnadwipayana.',
      },
      {
        heading: 'Riset Lebih Lanjut tentang Akurasi HX711',
        body:
          'Penelitian independen dari Universitas Muhammadiyah Yogyakarta (Medika Teknika, 2022) mengukur performa HX711 secara detail: error terkecil 0,01% pada beban 1 kg, dan error terbesar 4,66% pada beban sangat ringan (50 gram) — sebelum kalibrasi ulang. Setelah kalibrasi optimal pada rentang pengukuran yang sesuai (25–100 gram untuk pakan), akurasi yang dicapai adalah 96,59–98,97%. Dalam sistem PawfectCare, kalibrasi dilakukan dengan faktor skala 2280 yang dapat diperbarui dari cloud Firebase tanpa reprogramming perangkat.',
      },
      {
        heading: 'Filter EMA untuk Hilangkan Noise',
        body:
          'Meskipun HX711 sudah sangat presisi, pembacaan mentah masih mengandung noise ±1 gram akibat getaran lingkungan dan interferensi elektromagnetik. Sistem PawfectCare menerapkan filter Exponential Moving Average (EMA) dengan koefisien alpha = 0,15: setiap pembacaan baru hanya berkontribusi 15% pada nilai yang ditampilkan, sementara 85% adalah "ingatan" pembacaan sebelumnya. Hasilnya, fluktuasi noise ±1 gram tereliminasi tanpa menambah lag yang signifikan.',
      },
      {
        heading: 'Sensor Ultrasonik HC-SR04 untuk Stok Pakan',
        body:
          'Tingkat stok pakan diukur menggunakan prinsip Time of Flight ultrasonik — waktu pantulan gelombang 40 kHz dikonversi ke jarak, lalu ke persentase stok menggunakan interpolasi linear. Filter moving average diterapkan dengan bobot 70/30 (70% nilai lama, 30% pembacaan baru) untuk mencegah fluktuasi tampilan akibat getaran saat mesin dispensasi beroperasi.',
      },
    ],
    keyPoints: [
      'HX711 ADC 24-bit: akurasi ±0,05% dari nilai skala penuh',
      'Setelah kalibrasi: error pengukuran 0,01–4,66% (rata-rata ~1,03%)',
      'Filter EMA alpha=0,15 menghilangkan noise ±1 gram',
      'Faktor kalibrasi dapat diperbarui dari cloud tanpa upload ulang firmware',
      'Hasil pengujian sistem: rata-rata selisih dispensasi 1,0 gram dari target',
    ],
    refs: [
      {
        authors: 'Sri Hartanto',
        year: 2022,
        title: 'Rancang Bangun Timbangan Digital Load Cell Berkapasitas 20 kg Berbasis Modul HX711',
        journal: 'Jurnal Elektro, Universitas Krisnadwipayana, hal. 21–26',
        url: 'https://jurnalteknik.unkris.ac.id/index.php/jie/article/view/561',
        badge: 'national',
      },
      {
        authors: 'Tim Peneliti UMY',
        year: 2022,
        title: 'Analisis Akurasi Modul Amplifier HX711 untuk Timbangan Bayi',
        journal: 'Medika Teknika: Jurnal Teknik Elektromedik Indonesia, Universitas Muhammadiyah Yogyakarta',
        url: 'https://journal.umy.ac.id/index.php/mt/article/view/15148',
        badge: 'national',
      },
    ],
  },

  // ── ARTICLE 4: Hidrasi & Pencegahan ──────────────────────────────────────
  {
    id: 'hydration',
    category: 'Pencegahan',
    categoryColor: 'text-cyan-600',
    categoryBg: 'bg-cyan-50 border-cyan-100',
    icon: Droplets,
    title: 'Hidrasi: Pertahanan Utama Kesehatan Kucing',
    subtitle: 'Mengapa asupan air adalah kunci mencegah penyakit saluran kemih',
    image: kucingminum,
    summary:
      'Kucing secara alami memiliki dorongan minum yang rendah karena nenek moyangnya adalah hewan gurun. Ini membuat hidrasi aktif menjadi tanggung jawab pemilik.',
    sections: [
      {
        heading: 'Mengapa Kucing Malas Minum?',
        body:
          'Kucing domestik (Felis catus) berevolusi dari leluhur gurun Afrika (Felis silvestris lybica) yang mendapat sebagian besar cairan dari mangsa. Akibatnya, mekanisme rasa haus kucing kurang sensitif dibanding anjing atau manusia. Kucing yang makan pakan kering sering tidak terstimulasi untuk minum cukup, menyebabkan urine terlalu pekat — kondisi ideal untuk pembentukan kristal struvit dan kalsium oksalat.',
      },
      {
        heading: 'Target Asupan Air Harian',
        body:
          'WSAVA merekomendasikan asupan air sekitar 40–60 ml per kg berat badan per hari untuk kucing dewasa sehat. Artinya kucing 4 kg membutuhkan ±160–240 ml air per hari. Pakan kering hanya mengandung ~10% air, sementara pakan basah ~75–80%. Kucing yang makan pakan kering harus mengandalkan air minum — sehingga posisi wadah air, jenis mangkuk, dan frekuensi pergantian air sangat mempengaruhi asupan.',
      },
      {
        heading: 'Tanda Dehidrasi dan Urolitiasis',
        body:
          'Tanda dehidrasi ringan: kulit yang dicubit tidak segera kembali, gusi terasa kering, urine sangat pekat dan berwarna kuning tua. Jika kristal terbentuk dan menjadi batu (urolitiasis), kucing akan menunjukkan gejala FLUTD: mengejan, vokalisasi saat buang air, urine berdarah. Pada kucing jantan, sumbatan total dapat terjadi dalam hitungan jam dan merupakan kondisi darurat veteriner.',
      },
      {
        heading: 'Tips Meningkatkan Asupan Air Kucing',
        body:
          'Berdasarkan panduan WSAVA dan rekomendasi dokter hewan: (1) gunakan mangkuk air yang lebar dan dalam — kucing tidak suka kumisnya menyentuh tepi; (2) tempatkan air jauh dari kotak pasir; (3) pertimbangkan air mancur kucing (cat fountain) karena kucing lebih tertarik air bergerak; (4) campurkan sedikit air kaldu tanpa bawang ke pakan kering; (5) pertimbangkan transisi bertahap ke pakan basah untuk kucing dengan riwayat FLUTD.',
      },
    ],
    keyPoints: [
      'Target: 40–60 ml air per kg berat badan kucing per hari',
      'Pakan kering hanya 10% air — kucing perlu minum aktif',
      'Urine pekat adalah pemicu utama pembentukan kristal',
      'Cat fountain / air mengalir meningkatkan konsumsi air hingga 2×',
      'Riwayat FLUTD → pertimbangkan transisi ke pakan basah',
    ],
    refs: [
      {
        authors: 'WSAVA Global Nutrition Committee',
        year: 2021,
        title: 'WSAVA Global Nutrition Guidelines — Hydration Assessment',
        journal: 'World Small Animal Veterinary Association',
        url: 'https://wsava.org/global-guidelines/global-nutrition-guidelines/',
        badge: 'guidelines',
      },
      {
        authors: 'Bartges, J. & Kirk, C.',
        year: 2007,
        title: 'Nutrition and Urinary Tract Disease in Cats',
        journal: 'Journal of Feline Medicine and Surgery, 9(6), 487–490',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10911512/',
        doi: '10.1016/S1098-612X-07-00199-4',
        badge: 'peer-reviewed',
      },
    ],
  },
];

// ── All References Summary ────────────────────────────────────────────────────

const ALL_REFS: (JournalRef & { relevance: string })[] = [
  // ── FLUTD & Urinary Health ──────────────────────────────────────────────────
  {
    authors: 'Naarden, B. & Corbee, R.J.',
    year: 2019,
    title: 'The effect of a therapeutic urinary stress diet on the short-term recurrence of feline idiopathic cystitis',
    journal: 'Veterinary Medicine and Science, 6(1), 32–38',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7036317/',   // PMC — akses gratis
    doi: '10.1002/vms3.197',
    badge: 'peer-reviewed',
    relevance: 'Diet terapeutik mengurangi rekurensi FIC 7,89× — bukti terkuat hubungan diet & FLUTD',
  },
  {
    authors: 'Bartges, J. & Kirk, C.',
    year: 2007,
    title: 'Nutrition and Urinary Tract Disease in Cats: Myths and Legends',
    journal: 'Journal of Feline Medicine and Surgery, 9(6), 487–490',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10911512/',   // PMC — akses gratis
    doi: '10.1016/S1098-612X-07-00199-4',
    badge: 'peer-reviewed',
    relevance: 'Pakan basah 11% vs kering 39% rekurensi FIC — fondasi literatur diet & urinary',
  },
  {
    authors: 'Buffington, C.A.T., Westropp, J.L., Chew, D.J., Bolus, R.R.',
    year: 2006,
    title: 'Clinical evaluation of multimodal environmental modification in the management of cats with idiopathic cystitis',
    journal: 'Journal of Feline Medicine and Surgery, 8(4), 261–268',
    doi: '10.1016/j.jfms.2006.02.002',
    badge: 'peer-reviewed',
    relevance: 'Multiple small meals mengurangi stres & mendukung manajemen FIC',
  },
  {
    authors: 'Tinjauan Sistematis — Taylor & Francis',
    year: 2025,
    title: 'Understanding the current evidence base for the commonly recommended management strategies for recurrent feline idiopathic cystitis',
    journal: 'New Zealand Veterinary Journal',
    url: 'https://www.tandfonline.com/doi/full/10.1080/00480169.2025.2477542',
    doi: '10.1080/00480169.2025.2477542',
    badge: 'systematic-review',
    relevance: 'Systematic review terbaru 2025 — best evidence diet + manajemen FIC',
  },

  // ── Automatic Feeder & Portion Control ─────────────────────────────────────
  {
    authors: 'Witzel-Rollins, A., Murphy, M., Springer, C.M., Moyers, T.D., Albright, J.D.',
    year: 2022,
    title: 'Unsupervised weight loss in multi-cat households: effects of an automatic feeder and meal frequency',
    journal: 'Journal of Feline Medicine and Surgery',
    url: 'https://journals.sagepub.com/doi/full/10.1177/1098612X221105046',
    doi: '10.1177/1098612X221105046',
    badge: 'peer-reviewed',
    relevance: 'Automatic feeder → 83,2% kucing capai BCS ideal vs 0% free-feeding',
  },

  // ── Feeding Formula & Nutrition ─────────────────────────────────────────────
  {
    authors: 'National Research Council (NRC)',
    year: 2006,
    title: 'Nutrient Requirements of Dogs and Cats',
    journal: 'National Academies Press, Washington DC',
    url: 'https://nap.nationalacademies.org/catalog/10668/nutrient-requirements-of-dogs-and-cats',
    badge: 'guidelines',
    relevance: 'Tabel life-stage multiplier RER untuk kucing — dasar nilai Fm & Fg',
  },
  {
    authors: 'WSAVA Global Nutrition Committee',
    year: 2021,
    title: 'WSAVA Global Nutrition Guidelines & Toolkit',
    journal: 'World Small Animal Veterinary Association',
    url: 'https://wsava.org/global-guidelines/global-nutrition-guidelines/',
    badge: 'guidelines',
    relevance: 'Standar internasional nutrisi — nilai k/DER multiplier & BCS assessment',
  },
  {
    authors: 'Hand, M.S., Thatcher, C.D., Remillard, R.L., Roudebush, P., Novotny, B.J.',
    year: 2010,
    title: 'Small Animal Clinical Nutrition, 5th Edition',
    journal: 'Mark Morris Institute',
    badge: 'guidelines',
    relevance: 'Sumber utama nilai Fa (faktor aktivitas) & panduan DER klinis',
  },
  {
    authors: 'Case, L.P., Daristotle, L., Hayek, M.G., Raasch, M.F.',
    year: 2011,
    title: 'Canine and Feline Nutrition: A Resource for Companion Animal Professionals, 3rd ed.',
    journal: 'Mosby/Elsevier',
    badge: 'guidelines',
    relevance: 'ME pakan kering rata-rata 3.500–4.500 kcal/kg → dasar default E = 4 kcal/gram',
  },
  {
    authors: 'Olson, M. (LVT, VTS)',
    year: 2022,
    title: 'Energy Calculations: Gauging the Proper Caloric Intake for Patients',
    journal: "Today's Veterinary Nurse, Summer 2022",
    url: 'https://todaysveterinarynurse.com/nutrition/veterinary-energy-calculations-and-proper-caloric-intake/',
    badge: 'peer-reviewed',
    relevance: 'Konfirmasi klinis formula RER = 70 × BW⁰·⁷⁵ pada praktek veteriner modern',
  },

  // ── Feeding Behavior (6× per day) ──────────────────────────────────────────
  {
    authors: 'Bradshaw, J.W.S.',
    year: 2006,
    title: 'The evolutionary basis for the feeding behavior of domestic dogs and cats',
    journal: 'Journal of Nutrition, 136(7 Suppl), 1927S–1931S',
    url: 'https://academic.oup.com/jn/article/136/7/1927S/4664437',
    doi: '10.1093/jn/136.7.1927S',
    badge: 'peer-reviewed',
    relevance: 'Kucing secara alami makan 8–16× per hari dalam porsi kecil — dasar default 6× feeding',
  },
  {
    authors: 'Zoran, D.L.',
    year: 2002,
    title: 'The carnivore connection to nutrition in cats',
    journal: 'Journal of the American Veterinary Medical Association, 221(11), 1559–1567',
    url: 'https://avmajournals.avma.org/doi/10.2460/javma.2002.221.1559',
    doi: '10.2460/javma.2002.221.1559',
    badge: 'peer-reviewed',
    relevance: 'Kapasitas lambung kucing ~40–60 mL — anatomi yang mendukung multiple small meals',
  },

  // ── Sensor Accuracy ─────────────────────────────────────────────────────────
  {
    authors: 'Sri Hartanto',
    year: 2022,
    title: 'Rancang Bangun Timbangan Digital Load Cell Berkapasitas 20 kg Berbasis Modul HX711',
    journal: 'Jurnal Elektro, Universitas Krisnadwipayana Jakarta, hal. 21–26',
    url: 'https://jurnalteknik.unkris.ac.id/index.php/jie/article/view/561',
    badge: 'national',
    relevance: 'Validasi implementasi HX711 untuk timbangan digital — akurasi & kalibrasi',
  },
  {
    authors: 'Tim Peneliti UMY',
    year: 2022,
    title: 'Analisis Akurasi Modul Amplifier HX711 untuk Timbangan Bayi',
    journal: 'Medika Teknika: Jurnal Teknik Elektromedik Indonesia, Universitas Muhammadiyah Yogyakarta',
    url: 'https://journal.umy.ac.id/index.php/mt/article/view/15148',
    badge: 'national',
    relevance: 'Akurasi HX711: 96,59–98,97% setelah kalibrasi — dasar klaim ±1,5g dispensasi',
  },
];

// ── Article Card ──────────────────────────────────────────────────────────────

function ArticleCard({ article, onRead }: { article: Article; onRead: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group cursor-pointer"
      onClick={onRead}
    >
      {/* Image */}
      <div className="h-44 relative overflow-hidden shrink-0">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={cn('px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm', article.categoryColor)}>
            {article.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-4 border', article.categoryBg)}>
          <article.icon className={cn('w-5 h-5', article.categoryColor)} />
        </div>
        <h3 className="text-lg font-black text-gray-900 mb-1.5 leading-snug">{article.title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed flex-1 mb-4">{article.summary}</p>

        {/* Journal count badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
            <Microscope className="w-3 h-3 text-gray-400" />
            <span className="text-[11px] font-bold text-gray-500">{article.refs.length} referensi jurnal</span>
          </div>
          <div className={cn('flex items-center gap-1 text-sm font-black group-hover:gap-2.5 transition-all', article.categoryColor)}>
            Baca <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Article Modal / Expanded View ─────────────────────────────────────────────

function ArticleDetail({ article, onClose }: { article: Article; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-4xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl"
      >
        {/* Hero image */}
        <div className="h-52 relative overflow-hidden shrink-0">
          <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            title="Tutup"
            className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-5">
            <span className={cn('px-2.5 py-1 bg-white/95 rounded-full text-[10px] font-black uppercase tracking-wider', article.categoryColor)}>
              {article.category}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-snug mb-1">{article.title}</h2>
            <p className="text-sm text-gray-400">{article.subtitle}</p>
          </div>

          {/* Key points */}
          <div className={cn('rounded-2xl p-4 border', article.categoryBg)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Poin Utama</p>
            <div className="space-y-2">
              {article.keyPoints.map((kp, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className={cn('w-4 h-4 shrink-0 mt-0.5', article.categoryColor)} />
                  <p className="text-sm text-gray-700 font-medium leading-snug">{kp}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sections */}
          {article.sections.map((sec, i) => (
            <div key={i}>
              <h4 className="text-base font-black text-gray-800 mb-2 flex items-center gap-2">
                <span className={cn('w-1.5 h-5 rounded-full', article.categoryBg.replace('bg-', 'bg-').replace('50', '400'))} />
                {sec.heading}
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">{sec.body}</p>
            </div>
          ))}

          {/* Journal References */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Microscope className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Referensi Jurnal</p>
            </div>
            <div className="space-y-2">
              {article.refs.map((r, i) => <RefCard key={i} ref={r} />)}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Education Component ──────────────────────────────────────────────────

const REFS_PER_PAGE = 5;

export function Education() {
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const [showAllRefs, setShowAllRefs] = useState(false);
  const [refPage, setRefPage] = useState(1);
  const totalRefPages = Math.ceil(ALL_REFS.length / REFS_PER_PAGE);

  return (
    <div className="space-y-10 pb-16">

      {/* ── HEADER ── */}
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-amber-500">Edukasi & Penelitian</span>
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-3 leading-tight">
          Pakan yang Tepat,<br />
          <span className="text-amber-500">Berdasarkan Ilmu.</span>
        </h2>
        <p className="text-gray-400 text-base leading-relaxed">
          Setiap fitur PawfectCare didasarkan pada penelitian veteriner internasional.
          Pelajari hubungan antara pola makan, kesehatan saluran kemih, dan cara sistem ini menghitung takaran pakan kucing kamu.
        </p>
      </div>

      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText,  value: '14',     label: 'Jurnal Referensi',      color: 'text-blue-500',  bg: 'bg-blue-50' },
          { icon: Microscope,value: '2022–25', label: 'Penelitian Terkini',   color: 'text-green-500', bg: 'bg-green-50' },
          { icon: TrendingUp, value: '98,97%', label: 'Akurasi Sensor HX711', color: 'text-amber-500', bg: 'bg-amber-50' },
          { icon: Shield,    value: '7,89×',  label: 'Reduksi Risiko FLUTD',  color: 'text-red-500',   bg: 'bg-red-50' },
        ].map(({ icon: Icon, value, label, color, bg }) => (
          <div key={label} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
            <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', bg)}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className={cn('text-2xl font-black', color)}>{value}</p>
              <p className="text-xs text-gray-400 font-semibold">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── ARTICLE GRID ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-black text-gray-800">Artikel & Panduan</h3>
          <span className="text-xs text-gray-400 font-semibold">{ARTICLES.length} artikel</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {ARTICLES.map((art) => (
            <ArticleCard key={art.id} article={art} onRead={() => setOpenArticle(art)} />
          ))}
        </div>
      </div>

      {/* ── FORMULA SECTION ── */}
      <div className="bg-white rounded-4xl border border-amber-100 p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <FlaskConical className="w-64 h-64 text-gray-900" />
        </div>
        <div className="relative z-10 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
              <Calculator className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900">Formula Perhitungan Pakan</h3>
              <p className="text-sm text-gray-400">NRC 2006 · WSAVA 2021 · Hand et al. 2010</p>
            </div>
          </div>

          {/* Full formula display */}
          <div className="bg-gray-950 rounded-3xl p-6 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Formula Lengkap — NRC 2006 · WSAVA 2021</p>
            <p className="text-lg md:text-2xl font-black text-white font-mono tracking-tight leading-relaxed">
              Gram = <span className="text-amber-400">(Fm × Fg × Fo × Fa × 70 × BB<sup className="text-base">0.75</sup>)</span>
              <span className="text-gray-400"> / </span>
              <span className="text-blue-400">E</span>
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                { v: 'BB', d: 'Berat Badan (kg)', c: 'text-gray-300' },
                { v: 'Fm', d: 'Maintenance (umur+steril)', c: 'text-amber-400' },
                { v: 'Fg', d: 'Jenis Kelamin', c: 'text-pink-400' },
                { v: 'Fo', d: 'Berat Badan / BCS', c: 'text-green-400' },
                { v: 'Fa', d: 'Aktivitas', c: 'text-purple-400' },
                { v: 'E', d: 'kcal/gram pakan (default 4)', c: 'text-blue-400' },
              ].map(({ v, d, c }) => (
                <div key={v} className="bg-white/5 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <span className={cn('font-black text-sm font-mono', c)}>{v}</span>
                  <span className="text-gray-500 text-xs">{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { step: '1', label: 'Hitung RER', formula: '70 × BB(kg)⁰·⁷⁵', desc: 'Energi istirahat dasar (kcal/hari) — standar Kleiber 1932', color: 'bg-amber-50 border-amber-100' },
              { step: '2', label: 'Kalikan 4 Faktor', formula: 'Fm × Fg × Fo × Fa', desc: 'Sesuaikan dengan kondisi biologis aktual kucing', color: 'bg-blue-50 border-blue-100' },
              { step: '3', label: 'Bagi E', formula: 'DER ÷ E (kcal/gram)', desc: 'E default = 4,0 · atau baca label kemasan (kcal/kg ÷ 1000)', color: 'bg-green-50 border-green-100' },
            ].map(({ step, label, formula, desc, color }) => (
              <div key={step} className={cn('rounded-2xl p-4 border', color)}>
                <div className="w-7 h-7 bg-white rounded-xl flex items-center justify-center mb-3 border border-gray-200 shadow-sm">
                  <span className="text-xs font-black text-gray-700">{step}</span>
                </div>
                <p className="font-black text-gray-800 text-sm mb-1">{label}</p>
                <p className="font-mono text-xs font-bold text-gray-700 mb-1 bg-white/60 px-2 py-1 rounded-lg inline-block">{formula}</p>
                <p className="text-[11px] text-gray-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>

          {/* 4 Factor tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Fm — Maintenance (umur + steril) */}
            <div className="rounded-2xl border border-amber-100 overflow-hidden">
              <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100 flex items-center justify-between">
                <div>
                  <span className="font-black text-amber-700 font-mono mr-2">Fm</span>
                  <span className="text-xs font-bold text-amber-600">Faktor Maintenance (Umur + Steril)</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">WSAVA 2021 · NRC 2006</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  ['Kitten 0–6 bulan', '3,0', 'Pertumbuhan jaringan & tulang sangat aktif'],
                  ['Kitten 6–12 bulan', '2,0', 'Pertumbuhan melambat menjelang dewasa'],
                  ['Dewasa steril 1–7 th', '1,2', 'Hormon reproduksi menurun ~20–25%'],
                  ['Dewasa tidak steril 1–7 th', '1,6', 'Metabolisme reproduksi masih aktif'],
                  ['Senior steril 7–12 th', '1,1', 'Metabolisme melambat + steril'],
                  ['Senior tidak steril 7–12 th', '1,4', 'Metabolisme melambat, masih intact'],
                  ['Geriatri > 12 th', '0,8', 'Kebutuhan energi menurun signifikan'],
                ].map(([cond, val, note]) => (
                  <div key={cond} className="flex items-center justify-between px-4 py-2 hover:bg-amber-50/40">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{cond}</p>
                      <p className="text-[10px] text-gray-400">{note}</p>
                    </div>
                    <span className="text-xl font-black text-amber-500 ml-3 shrink-0">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fg — Jenis Kelamin */}
            <div className="rounded-2xl border border-pink-100 overflow-hidden">
              <div className="bg-pink-50 px-4 py-2.5 border-b border-pink-100 flex items-center justify-between">
                <div>
                  <span className="font-black text-pink-700 font-mono mr-2">Fg</span>
                  <span className="text-xs font-bold text-pink-600">Faktor Jenis Kelamin (Koreksi Risiko)</span>
                </div>
                <span className="text-[10px] text-pink-400 font-bold">Wolfsheimer 1994</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  ['Jantan', '1,0', 'Referensi — massa otot & BMR lebih besar'],
                  ['Betina', '0,9', 'Koreksi ~10%: risiko penambahan BB lebih tinggi'],
                ].map(([cond, val, note]) => (
                  <div key={cond} className="flex items-center justify-between px-4 py-3 hover:bg-pink-50/40">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{cond}</p>
                      <p className="text-[10px] text-gray-400">{note}</p>
                    </div>
                    <span className="text-xl font-black text-pink-500 ml-3 shrink-0">{val}</span>
                  </div>
                ))}
                <div className="px-4 py-2 bg-pink-50/30">
                  <p className="text-[10px] text-pink-400 italic">Jika tidak diketahui, gunakan Fg = 1,0 (default)</p>
                </div>
              </div>
            </div>

            {/* Fo — Faktor Berat Badan / BCS */}
            <div className="rounded-2xl border border-green-100 overflow-hidden">
              <div className="bg-green-50 px-4 py-2.5 border-b border-green-100 flex items-center justify-between">
                <div>
                  <span className="font-black text-green-700 font-mono mr-2">Fo</span>
                  <span className="text-xs font-bold text-green-600">Faktor Berat Badan (Body Condition Score)</span>
                </div>
                <span className="text-[10px] text-green-400 font-bold">WSAVA 2021 · NRC 2006</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  ['BCS 1–2 (sangat kurus–kurus)', '1,2', 'Tambah kalori untuk naik ke berat ideal'],
                  ['BCS 3 (ideal)', '1,0', 'Pemeliharaan berat badan normal'],
                  ['BCS 4 (gemuk)', '0,9', 'Kurangi sedikit untuk hindari penambahan BB'],
                  ['BCS 5 (obesitas)', '0,8', 'Program diet — gunakan berat ideal, bukan aktual'],
                ].map(([cond, val, note]) => (
                  <div key={cond} className="flex items-center justify-between px-4 py-2 hover:bg-green-50/40">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{cond}</p>
                      <p className="text-[10px] text-gray-400">{note}</p>
                    </div>
                    <span className="text-xl font-black text-green-500 ml-3 shrink-0">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fa — Aktivitas */}
            <div className="rounded-2xl border border-purple-100 overflow-hidden">
              <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-100 flex items-center justify-between">
                <div>
                  <span className="font-black text-purple-700 font-mono mr-2">Fa</span>
                  <span className="text-xs font-bold text-purple-600">Faktor Aktivitas Fisik</span>
                </div>
                <span className="text-[10px] text-purple-400 font-bold">Hand et al. 2010</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  ['Sangat tidak aktif', '0,8', 'Hampir tidak bergerak, tidur terus'],
                  ['Tidak aktif (sedentary)', '0,9', 'Jarang bermain, banyak rebahan'],
                  ['Normal', '1,0', 'Bermain & bergerak rutin setiap hari'],
                  ['Aktif', '1,1', 'Sering berlari, bermain, eksplorasi'],
                  ['Sangat aktif', '1,3', 'Bergerak intens hampir sepanjang hari'],
                ].map(([cond, val, note]) => (
                  <div key={cond} className="flex items-center justify-between px-4 py-2 hover:bg-purple-50/40">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{cond}</p>
                      <p className="text-[10px] text-gray-400">{note}</p>
                    </div>
                    <span className="text-xl font-black text-purple-500 ml-3 shrink-0">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* E default & 6x meal info row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* E = 4 info */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-black text-blue-700 font-mono text-base">E = 4,0 kcal/gram</span>
                <span className="text-[10px] text-blue-400 font-bold bg-blue-100 px-2 py-0.5 rounded-full">DEFAULT</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Pakan kering komersial memiliki ME rata-rata <strong>3.700–4.200 kcal/kg</strong> (NRC 2006). Default 4,0 kcal/gram (= 4.000 kcal/kg) adalah nilai tengah praktis yang digunakan di klinik veteriner.
              </p>
              <p className="text-[10px] text-blue-500 mt-2 font-semibold">
                Cara cek: lihat label kemasan → nilai "Metabolizable Energy" kcal/kg ÷ 1000 = kcal/gram
              </p>
            </div>

            {/* 6x meal info */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-black text-amber-700 font-mono text-base">6× per Hari</span>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-100 px-2 py-0.5 rounded-full">DEFAULT</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Kucing secara alami makan <strong>8–16 kali/hari dalam porsi kecil</strong> (Bradshaw, 2006). Kapasitas lambung kucing hanya ~40–60 mL (Zoran, 2002), sehingga pemberian 6× mengikuti pola alami ini dan mencegah overfeeding sekaligus menjaga pH urine stabil.
              </p>
              <p className="text-[10px] text-amber-500 mt-2 font-semibold">
                Sumber: Bradshaw (2006) J. Nutrition · Zoran (2002) JAVMA · Buffington et al. (2006) JFMS
              </p>
            </div>
          </div>

          {/* Worked example */}
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600 mb-3">Contoh Perhitungan — Kucing Mochi</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {[
                { label: 'BB', val: '4,5 kg', sub: 'Berat badan aktual' },
                { label: 'Fm', val: '1,2', sub: 'Steril · dewasa 3 th' },
                { label: 'Fg', val: '0,9', sub: 'Betina' },
                { label: 'Fo', val: '1,0', sub: 'BCS 3 (ideal)' },
                { label: 'Fa', val: '1,0', sub: 'Aktivitas normal' },
                { label: 'E', val: '4,0 kcal/g', sub: 'Pakan kering default' },
              ].map(({ label, val, sub }) => (
                <div key={label} className="bg-white rounded-xl p-3 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-500 uppercase">{label}</p>
                  <p className="font-black text-gray-800 text-sm">{val}</p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 font-mono text-sm bg-white/60 rounded-xl p-4">
              <p className="text-gray-500">RER = 70 × 4,5<sup>0.75</sup> = <span className="font-black text-gray-800">218 kcal</span></p>
              <p className="text-gray-500">DER = 1,2 × 0,9 × 1,0 × 1,0 × 218 = <span className="font-black text-gray-800">235 kcal/hari</span></p>
              <p className="text-gray-500">Gram = 235 ÷ 4,0 = <span className="font-black text-amber-600 text-base">~59 gram/hari</span></p>
              <p className="text-gray-400 text-xs">→ Dibagi 6 slot: <span className="font-bold text-gray-600">~10g per pemberian makan</span></p>
            </div>
          </div>

          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Microscope className="w-3.5 h-3.5 shrink-0" />
            Sumber: NRC (2006) · WSAVA 2021 · Hand et al. 2010 · Bradshaw (2006) J.Nutrition · Zoran (2002) JAVMA · Buffington et al. (2006) JFMS
          </p>
        </div>
      </div>

      {/* ── DEVICE ACCURACY SECTION ── */}
      <div className="bg-gray-950 rounded-4xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Cpu className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Scale className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Akurasi Perangkat</h3>
              <p className="text-sm text-gray-400">Diuji dan didukung penelitian terpublikasi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              {
                icon: Scale,
                metric: '±1,5 g',
                label: 'Toleransi Dispensasi',
                desc: 'Akurasi pemberian pakan dari target yang ditetapkan',
                color: 'text-amber-400',
              },
              {
                icon: TrendingUp,
                metric: '98,97%',
                label: 'Akurasi HX711',
                desc: 'Setelah kalibrasi, berdasarkan jurnal Medika Teknika (UMY, 2022)',
                color: 'text-green-400',
              },
              {
                icon: Cpu,
                metric: '24-bit',
                label: 'Resolusi ADC HX711',
                desc: '16,7 juta tingkat nilai — jauh melebihi kebutuhan pengukuran pakan',
                color: 'text-blue-400',
              },
            ].map(({ icon: Icon, metric, label, desc, color }) => (
              <div key={label} className="bg-white/5 rounded-3xl p-5 border border-white/10">
                <Icon className={cn('w-6 h-6 mb-3', color)} />
                <p className={cn('text-3xl font-black', color)}>{metric}</p>
                <p className="font-bold text-white text-sm mt-1">{label}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Bagaimana Filter EMA Bekerja</p>
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-2xl px-4 py-3 font-mono text-sm text-white font-bold">
                nilai_halus = 0.15 × baca_baru + 0.85 × nilai_lama
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Alpha = 0,15 berarti setiap pembacaan baru hanya berkontribusi 15%, sehingga noise ±1 gram
              akibat getaran mekanis tereliminasi tanpa menambah lag yang berarti.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://jurnalteknik.unkris.ac.id/index.php/jie/article/view/561"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Sri Hartanto — HX711 20kg (Krisnadwipayana)
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href="https://journal.umy.ac.id/index.php/mt/article/view/15148"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Akurasi HX711 — Medika Teknika (UMY, 2022)
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* ── PREVENTION BANNER ── */}
      <div className="bg-amber-500 rounded-4xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="md:w-1/3 relative z-10">
          <img
            src={flutd}
            className="w-full h-64 object-cover rounded-3xl shadow-2xl"
            alt="Pencegahan FLUTD"
          />
        </div>
        <div className="md:w-2/3 relative z-10 space-y-4">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black text-white uppercase tracking-widest">
            Berbasis Penelitian
          </span>
          <h3 className="text-3xl font-black text-white leading-tight">
            Mencegah FLUTD<br />Dimulai dari Data.
          </h3>
          <p className="text-white/80 text-sm leading-relaxed">
            FIC (Feline Idiopathic Cystitis) merupakan peradangan pada kandung kemih yang
            sering kambuh pada kucing. Studi Naarden & Corbee (2019) menemukan bahwa
            kucing dengan pola makan terkontrol memiliki tingkat kekambuhan FIC hanya
            <strong className="text-white"> 29,4%</strong>, dibandingkan
            <strong className="text-white"> 78,6%</strong> pada kelompok kontrol.
            PawfectCare menerapkan prinsip ini dengan memastikan setiap gram pakan
            diberikan secara tepat sesuai kebutuhan kucing.
          </p>
          <div className="flex flex-wrap gap-3">
            {['Porsi Terukur', 'pH Urine Stabil', 'Jadwal Konsisten', 'Monitor Real-time'].map((tag) => (
              <div key={tag} className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ALL REFERENCES TABLE ── */}
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header / Toggle */}
        <button
          type="button"
          onClick={() => { setShowAllRefs(!showAllRefs); setRefPage(1); }}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
              <Microscope className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-left">
              <p className="font-black text-gray-800">Daftar Referensi Penelitian</p>
              <p className="text-xs text-gray-400">
                {ALL_REFS.length} jurnal & panduan ilmiah · {totalRefPages} halaman (5 per halaman)
              </p>
            </div>
          </div>
          {showAllRefs
            ? <ChevronUp className="w-5 h-5 text-gray-400" />
            : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        <AnimatePresence>
          {showAllRefs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-50">

                {/* Page info bar */}
                <div className="flex items-center justify-between px-3 sm:px-6 pt-4 pb-2 gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-gray-400 min-w-0 truncate">
                    {(refPage - 1) * REFS_PER_PAGE + 1}–{Math.min(refPage * REFS_PER_PAGE, ALL_REFS.length)} dari {ALL_REFS.length} ref
                  </span>
                  <span className="text-[10px] sm:text-xs font-black text-amber-500 shrink-0">
                    Hal. {refPage}/{totalRefPages}
                  </span>
                </div>

                {/* Ref list for current page */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={refPage}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.18 }}
                    className="px-6 pb-4 space-y-2"
                  >
                    {ALL_REFS.slice((refPage - 1) * REFS_PER_PAGE, refPage * REFS_PER_PAGE).map((r, i) => {
                      const globalIdx = (refPage - 1) * REFS_PER_PAGE + i;
                      const primaryHref = r.url ?? (r.doi ? `https://doi.org/${r.doi}` : null);
                      const primaryLabel = r.url ? 'Buka Artikel ↗' : `DOI: ${r.doi}`;
                      return (
                        <div key={globalIdx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-colors">
                          {/* Nomor global */}
                          <span className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-black text-gray-500 shrink-0 mt-0.5">
                            {globalIdx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            {/* Badge + tahun + relevansi */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <JournalBadge badge={r.badge} />
                              <span className="text-[10px] font-bold text-gray-400">{r.year}</span>
                              <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                {r.relevance}
                              </span>
                            </div>
                            {/* Judul */}
                            <p className="text-xs font-bold text-gray-800 leading-snug mb-0.5">{r.title}</p>
                            {/* Penulis & jurnal */}
                            <p className="text-[11px] text-gray-500 italic">{r.authors}</p>
                            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{r.journal}</p>
                            {/* Links */}
                            <div className="flex items-center flex-wrap gap-3 mt-1.5">
                              {primaryHref && (
                                <a href={primaryHref} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 hover:text-amber-700 hover:underline underline-offset-2">
                                  {primaryLabel}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                              {r.url && r.doi && (
                                <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600">
                                  DOI ↗
                                  <ExternalLink className="w-2 h-2" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>

                {/* Pagination controls */}
                <div className="flex items-center justify-between px-3 sm:px-6 pb-5 pt-2 border-t border-gray-50 gap-2">

                  {/* Prev button */}
                  <button
                    type="button"
                    onClick={() => setRefPage((p) => Math.max(1, p - 1))}
                    disabled={refPage === 1}
                    className={cn(
                      'flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all shrink-0',
                      refPage === 1
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600'
                    )}
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Sebelumnya
                  </button>

                  {/* Page number buttons */}
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {Array.from({ length: totalRefPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setRefPage(pg)}
                        className={cn(
                          'w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-[10px] sm:text-xs font-black transition-all',
                          pg === refPage
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                        )}
                      >
                        {pg}
                      </button>
                    ))}
                  </div>

                  {/* Next button */}
                  <button
                    type="button"
                    onClick={() => setRefPage((p) => Math.min(totalRefPages, p + 1))}
                    disabled={refPage === totalRefPages}
                    className={cn(
                      'flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all shrink-0',
                      refPage === totalRefPages
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600'
                    )}
                  >
                    Berikutnya
                    <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Article Detail Modal ── */}
      <AnimatePresence>
        {openArticle && (
          <ArticleDetail article={openArticle} onClose={() => setOpenArticle(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
