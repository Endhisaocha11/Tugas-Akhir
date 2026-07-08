import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { track } from '@vercel/analytics';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/AuthContext";

async function compressImageToBase64(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = url;
  });
}



// ======================================
// TYPES
// ======================================
// BARU
type ActivityLevel = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';

interface FormState {
  name: string;
  gender: string;
  age: number;
  weight: number;
  isSterilized: boolean;
  bodyCondition: number;
  kiloCaloriesPerKg: number;
  foodEnergy: number;
  activity: ActivityLevel;
}

interface CalculateTargetsProps {
  weight: number;
  isSterilized: boolean;
  gender: string;
  age: number;  
  bodyCondition: number;
  kiloCaloriesPerKg?: number;
  activity?: ActivityLevel;
}

interface CalculateTargetsResult {
  dailyCalorieTarget: number;
  dailyGramTarget: number;
  Fm: number;
  Fg: number;
  Fo: number;
  Fa: number;
}

interface ScheduleItem {
  time: string;
  label: string;
  icon: string;
  amount: number;
}

// ======================================
// UTILITY
// ======================================
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * GENERATE CSV FROM ONBOARDING DATA
 */
const ACTIVITY_LABEL: Record<string, string> = {
  very_low:  'Sangat Tidak Aktif',
  low:       'Tidak Aktif (Sedentary)',
  normal:    'Normal',
  high:      'Aktif',
  very_high: 'Sangat Aktif',
};

function generateCSV(data: any): string {
  const actLabel = ACTIVITY_LABEL[data.activity] ?? data.activity;
  const lines = [
    ["FEEDING PLAN - FELINEGUARD"],
    [],
    ["CAT PROFILE"],
    ["Name", data.name],
    ["Gender", data.gender === "male" ? "Jantan" : "Betina"],
    ["Age (years)", data.age],
    ["Weight (kg)", data.weight],
    ["Sterilized", data.isSterilized ? "Yes" : "No"],
    ["Body Condition Score", data.bodyCondition],
    ["Activity Level", actLabel],
    [],
    ["FOOD INFORMATION"],
    ["Food Energy (kcal/kg)", data.kiloCaloriesPerKg],
    [],
    ["CALCULATED RESULTS"],
    ["Daily Calorie Target", data.result.dailyCalorieTarget + " kcal"],
    ["Daily Gram Target", data.result.dailyGramTarget + " g"],
    [],
    ["METABOLIC FACTORS"],
    ["Fm (Sterilization factor)", data.result.Fm],
    ["Fg (Gender factor)", data.result.Fg],
    ["Fo (Body Condition factor)", data.result.Fo],
    ["Fa (Activity factor)", data.result.Fa],
    [],
    ["FEEDING SCHEDULE"],
    ["Time", "Label", "Amount (g)"],
    ["06:00", "Subuh (Early Morning)", Math.round(data.result.dailyGramTarget / 6)],
    ["09:00", "Pagi (Morning)", Math.round(data.result.dailyGramTarget / 6)],
    ["12:00", "Siang (Noon)", Math.round(data.result.dailyGramTarget / 6)],
    ["15:00", "Sore (Afternoon)", Math.round(data.result.dailyGramTarget / 6)],
    ["18:00", "Petang (Evening)", Math.round(data.result.dailyGramTarget / 6)],
    ["21:00", "Malam (Night)", data.result.dailyGramTarget - 5 * Math.round(data.result.dailyGramTarget / 6)],
    [],
    ["NOTES"],
    ["Generated at", new Date().toISOString()],
    ["Ingin mencoba alat PawfectCare? Hubungi admin untuk akses device."],
  ];

  return lines.map(line => line.map(cell => `"${cell}"`).join(',')).join('\n');
}

// ======================================
// CALCULATION
// ======================================
function calculateTargets({
  weight, isSterilized, gender, age,   // ← tambah age
  bodyCondition, kiloCaloriesPerKg = 4000, activity = 'normal',
}: CalculateTargetsProps): CalculateTargetsResult {

  const rer = 70 * Math.pow(weight, 0.75);

  // Fm — NRC 2006 + WSAVA 2021: 7 kategori (umur + steril)
  let Fm: number;
  if (age < 0.5)       Fm = 3.0;                          // Kitten 0–6 bln
  else if (age < 1)    Fm = 2.0;                          // Kitten 6–12 bln
  else if (age <= 7)   Fm = isSterilized ? 1.2 : 1.6;    // Dewasa
  else if (age <= 12)  Fm = isSterilized ? 1.1 : 1.4;    // Senior
  else                 Fm = 0.8;                           // Geriatri >12 th

  // Fg — Wolfsheimer 1994
  const Fg = gender === 'male' ? 1.0 : 0.9;

  // Fo — WSAVA 2021 skala BCS 1–5
  const Fo = bodyCondition <= 2 ? 1.2
           : bodyCondition === 3 ? 1.0
           : bodyCondition === 4 ? 0.9
           : 0.8; // BCS 5 obesitas

  // Fa — Hand et al. 2010, 5 level
  const FA_MAP: Record<string, number> = {
    very_low: 0.8, low: 0.9, normal: 1.0, high: 1.1, very_high: 1.3,
  };
  const Fa = FA_MAP[activity ?? 'normal'] ?? 1.0;

  const dailyCalorieTarget = rer * Fm * Fg * Fo * Fa;
  const kcalPerGram = kiloCaloriesPerKg / 1000;

  return {
    dailyCalorieTarget: Math.round(dailyCalorieTarget),
    dailyGramTarget: Math.round(dailyCalorieTarget / kcalPerGram),
    Fm, Fg, Fo, Fa,
  };
}

function getAutoBodyCondition(weight: number): number {
  if (weight < 2.5)  return 1; // sangat kurus
  if (weight <= 3.5) return 3; // ideal
  if (weight <= 5.0) return 4; // gemuk
  return 5;                     // obesitas
}

function getAgeCategory(age: number): { label: string; sub: string } {
  if (age < 1) return { label: "Kitten", sub: "4-12mc" };
  if (age <= 7) return { label: "Adult", sub: "1-7yr" };
  return { label: "Senior", sub: ">7yr" };
}

function getBodyLabel(bc: number): string {
  if (bc <= 2) return 'Sangat Kurus – Kurus';
  if (bc === 3) return 'Ideal';
  if (bc === 4) return 'Gemuk';
  return 'Obesitas';
}


const STEPS = [
  { n: 1, label: "Identitas" },
  { n: 2, label: "Data Fisik" },
  { n: 3, label: "Kondisi" },
  { n: 4, label: "Hasil Feeding" },
];

// ======================================
// GAUGE COMPONENT
// ======================================
function CircularGauge({
  value,
  max,
  unit,
}: {
  value: number;
  max: number;
  unit: string;
}) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const safeValue = Number(value) || 0;
  const safeMax = Number(max) || 1;

  const dash =
    circ *
    Math.min(safeValue / safeMax, 1) *
    0.75;
  return (
    <div className="relative w-36 h-36">
      <svg width="144" height="144" viewBox="0 0 144 144">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        <circle cx="72" cy="72" r={r} fill="none" stroke="#FEF3C7" strokeWidth="9" />
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-135 72 72)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-amber-900 leading-none">{safeValue}</span>
        <span className="text-[10px] text-gray-400 font-medium mt-0.5">{unit}</span>
      </div>
    </div>
  );
}

// ======================================
// MAIN COMPONENT
// ======================================
interface OnboardingFlowProps {
  isAdmin?: boolean;
}

export default function OnboardingFlow({
  isAdmin = false,
}: OnboardingFlowProps) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [csvDownloaded, setCsvDownloaded] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoUploadWarning, setPhotoUploadWarning] = useState<boolean>(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [duplicateNameAlert, setDuplicateNameAlert] = useState<string | null>(null);
  // Draft text untuk input umur & berat — memisahkan apa yang diketik user
  // dari nilai number yang sudah di-clamp, supaya tidak "snap back" tiap ketik.
  const [ageDraft, setAgeDraft] = useState<string | null>(null);
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const nameCheckRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [form, setForm] = useState<FormState>({
    name: "",
    gender: "male",
    age: 2,
    weight: 4.5,
    isSterilized: true,
    bodyCondition: getAutoBodyCondition(4.5),
    kiloCaloriesPerKg: 4000,
    activity: 'normal',
    foodEnergy: 4000,
  });

  const upd = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  // Cek duplikat nama profil terhadap profil aktif & riwayat
  useEffect(() => {
    clearTimeout(nameCheckRef.current);
    if (!form.name.trim() || !user) {
      setDuplicateNameAlert(null);
      return;
    }
    nameCheckRef.current = setTimeout(async () => {
      try {
        const nameLower = form.name.trim().toLowerCase();
        const catId = `${user.uid}_main`;

        const catSnap = await getDoc(doc(db, 'cats', catId));
        if (catSnap.exists() && (catSnap.data().name ?? '').toLowerCase() === nameLower) {
          setDuplicateNameAlert(`Nama "${form.name.trim()}" sama dengan profil aktif saat ini.`);
          return;
        }

        const histSnap = await getDocs(
          query(collection(db, 'catProfileHistory'), where('ownerId', '==', user.uid))
        );
        const dup = histSnap.docs.find((d) => (d.data().name ?? '').toLowerCase() === nameLower);
        if (dup) {
          setDuplicateNameAlert(`Nama "${form.name.trim()}" sudah pernah digunakan di riwayat profil sebelumnya.`);
          return;
        }

        setDuplicateNameAlert(null);
      } catch {
        setDuplicateNameAlert(null);
      }
    }, 700);
  }, [form.name, user]);

 const targets = calculateTargets({
  weight:           form.weight,
  isSterilized:     form.isSterilized,
  gender:           form.gender,
  age:              form.age,   // ← TAMBAH
  bodyCondition:    form.bodyCondition,
  kiloCaloriesPerKg: form.foodEnergy,
  activity:         form.activity,
});

  const ageCategory = getAgeCategory(form.age);

  const schedule: ScheduleItem[] = [
    {
      time: "06:00",
      label: "Subuh",
      icon: "🌅",
      amount: Math.round(targets.dailyGramTarget / 6),
    },
    {
      time: "09:00",
      label: "Pagi",
      icon: "☀️",
      amount: Math.round(targets.dailyGramTarget / 6),
    },
    {
      time: "12:00",
      label: "Siang",
      icon: "🌤️",
      amount: Math.round(targets.dailyGramTarget / 6),
    },
    {
      time: "15:00",
      label: "Sore",
      icon: "🌇",
      amount: Math.round(targets.dailyGramTarget / 6),
    },
    {
      time: "18:00",
      label: "Petang",
      icon: "🌆",
      amount: Math.round(targets.dailyGramTarget / 6),
    },
    {
      time: "21:00",
      label: "Malam",
      icon: "🌙",
      amount:
        targets.dailyGramTarget - 5 * Math.round(targets.dailyGramTarget / 6),
    },
  ];

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    void handleComplete();
  };

  const handleComplete = async (): Promise<void> => {
    // ── USER: download CSV only ──────────────────────────────
    if (!isAdmin) {
      setLoading(true);
      const onboardingData = {
        ...form,
        result: {
          dailyCalorieTarget: targets.dailyCalorieTarget,
          dailyGramTarget: targets.dailyGramTarget,
          Fm: targets.Fm,
          Fg: targets.Fg,
          Fo: targets.Fo,
          Fa: targets.Fa,
        },
        updatedAt: new Date().toISOString(),
      };
      const csvContent = generateCSV(onboardingData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `feeding-plan-${form.name}-${(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()}.csv`);
      link.click();
      URL.revokeObjectURL(url);
      setLoading(false);
      setCsvDownloaded(true);
      return;
    }

    // ── SUPER_ADMIN: tampilkan modal konfirmasi ──────────────
    setShowConfirmModal(true);
  };

  const confirmSave = async (): Promise<void> => {
    if (!user) return;

    // Modal tetap terbuka — akan menampilkan loading → sukses/error
    setLoading(true);
    setSaveError(null);
    setPhotoUploadWarning(false);

    const catId = `${user.uid}_main`;

    // ── 1. Kompresi foto ke base64 (simpan di Firestore, hindari masalah CORS Firebase Storage) ──
    let photoUrl: string | undefined;
    let didPhotoFail = false;
    if (photoFile) {
      try {
        photoUrl = await compressImageToBase64(photoFile, 300);
      } catch (photoErr) {
        console.warn('Kompresi foto gagal, lanjut simpan tanpa foto:', photoErr);
        didPhotoFail = true;
        setPhotoUploadWarning(true);
      }
    }

    // ── 2. Simpan profil lama ke history sebelum overwrite ──────────────────
    // (prevPhotoUrl juga dipakai di step 3 sebagai fallback kalau user tidak upload foto baru)
    // PENTING: kalau langkah ini gagal, proses HARUS berhenti di sini — jangan
    // lanjut menimpa dokumen `cats/{id}` di step 3. Sebelumnya kegagalan di sini
    // cuma di-console.warn() lalu tetap lanjut overwrite, sehingga profil lama
    // hilang permanen tanpa pernah tercatat di riwayat & tanpa ada pemberitahuan
    // ke user sama sekali.
    let prevPhotoUrl: string | null | undefined;
    try {
      const existingSnap = await getDoc(doc(db, 'cats', catId));
      if (existingSnap.exists()) {
        const prev = existingSnap.data();
        prevPhotoUrl = prev.photoUrl ?? null;
        const histId = `${catId}_${prev.profileUpdatedAt ?? Date.now() - 1}`;
        await setDoc(doc(db, 'catProfileHistory', histId), {
          id: histId,
          catId,
          ownerId: user.uid,
          savedAt: prev.profileUpdatedAt ?? 0,
          endedAt: Date.now(),
          name: prev.name ?? '',
          photoUrl: prev.photoUrl ?? null,
          gender: prev.gender ?? 'male',
          age: prev.age ?? 0,
          weight: prev.weight ?? 0,
          isSterilized: prev.isSterilized ?? false,
          bodyCondition: prev.bodyCondition ?? 3,
          dailyGramTarget: prev.dailyGramTarget ?? 0,
          dailyCalorieTarget: prev.dailyCalorieTarget ?? 0,
          kiloCaloriesPerKg: prev.kiloCaloriesPerKg ?? 4000,
          activity: prev.activity ?? 'normal',
          feedingSchedule: prev.feedingSchedule ?? [],
        });
      }
    } catch (histErr) {
      console.error('Gagal menyimpan history profil, membatalkan simpan:', histErr);
      setSaveError('Gagal mengarsipkan profil sebelumnya. Profil aktif TIDAK diubah agar datanya tidak hilang. Periksa koneksi internet dan coba lagi.');
      setLoading(false);
      return;
    }

    // ── 3. Simpan data ke Firestore (selalu jalan meski foto gagal) ──────────
    try {
      await setDoc(doc(db, 'cats', catId), {
        id: catId,
        ownerId: user.uid,
        name: form.name,
        // Foto baru kalau user upload; kalau tidak, PERTAHANKAN foto profil
        // sebelumnya. setDoc ini menulis ulang SELURUH dokumen, jadi field
        // yang tidak disertakan akan hilang — photoUrl wajib selalu ada di
        // payload supaya tidak ke-reset kosong tiap kali simpan profil
        // tanpa upload foto baru.
        photoUrl: photoUrl ?? prevPhotoUrl ?? null,
        gender: form.gender,
        age: form.age,
        weight: form.weight,
        isSterilized: form.isSterilized,
        bodyCondition: form.bodyCondition,
        activity: form.activity,
        kiloCaloriesPerKg: form.foodEnergy,
        dailyCalorieTarget: targets.dailyCalorieTarget,
        dailyGramTarget: targets.dailyGramTarget,
        feedingSchedule: schedule.map((s) => ({
          time: s.time,
          amount: s.amount,
          label: s.label,
        })),
        profileUpdatedAt:      Date.now(),
        updatedAt:             new Date().toISOString(),
        dailyLimitReachedDate: null,
        dailyLimitResetDate:   (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
      });

      // ── 4. Tandai onboarding selesai di user profile ──────────────────────────
      await updateDoc(doc(db, 'users', user.uid), {
        onboardingCompleted: true,
      });

      // Track onboarding selesai
      track('onboarding_complete', {
        isAdmin,
        catName: form.name,
      });

      // ── 5. Link cat ke device (jika admin sudah klaim device) ────────────────
      const claimedDeviceId = profile?.claimedDeviceId;
      if (claimedDeviceId) {
        await updateDoc(doc(db, 'devices', claimedDeviceId), {
          linkedCatId: catId,
        });
      }

      setLoading(false);

      // tutup modal setelah sukses
      setShowConfirmModal(false);

      // AuthContext onSnapshot akan detect onboardingCompleted: true
      // dan routing App.tsx otomatis masuk Dashboard
      setTimeout(() => window.location.reload(), didPhotoFail ? 2500 : 800);
    } catch (err) {
      console.error('Gagal menyimpan ke Firestore:', err);
      setSaveError('Gagal menyimpan data ke database. Periksa koneksi internet dan coba lagi.');
      setLoading(false);
    }
  };

  const canNext: boolean = step === 1 ? form.name.trim().length > 0 : true;

  // ======================================
  // DONE STATE
  // ======================================
  // if (done) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-6">
  //       <div className="bg-white rounded-3xl shadow-xl border border-amber-100 p-12 text-center">
  //         <div className="text-6xl mb-4">🎉</div>
  //         <h1 className="text-2xl font-black text-amber-900">
  //           Data Berhasil Disimpan
  //         </h1>
  //         <p className="text-gray-400 mt-2 text-sm">
  //           Profil kucing berhasil disimpan ke sistem.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">

      {/* Slider global styles */}
      <style>{`
        .cat-slider{-webkit-appearance:none;appearance:none;width:100%;height:4px;background:#FEF3C7;border-radius:99px;outline:none;}
        .cat-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#92400E;cursor:pointer;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.2);}
      `}</style>

      <div className="
        w-full
        max-w-7xl
        min-h-[calc(100vh-40px)]
        bg-white
        rounded-[28px]
        shadow-xl
        border
        border-amber-100
        flex
        flex-col
        overflow-hidden
        ">

        {/* ── HEADER ── */}
        <div className="px-6 pt-5 pb-4 flex flex-col gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-lg">🐾</span>
            <span className="font-black text-amber-900 text-sm tracking-tight">
              PawfectCare
            </span>
          </div>

          {/* Step bar */}
          <div className="flex items-center">
            {STEPS.map(({ n, label }, i) => (
              <React.Fragment key={n}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all duration-200",
                      step >= n
                        ? "bg-amber-800 border-amber-800 text-white"
                        : "bg-transparent border-gray-200 text-gray-300"
                    )}
                  >
                    {step > n ? "✓" : n}
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-bold whitespace-nowrap",
                      step === n
                        ? "text-amber-800"
                        : step > n
                        ? "text-amber-600"
                        : "text-gray-300"
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < 3 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mb-4 mx-1 rounded-full transition-all duration-300",
                      step > n ? "bg-amber-800" : "bg-gray-100"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-amber-50 mx-6" />

        {/* ── CONTENT ── */}
        <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">

            {/* ══ STEP 1 ══ */}
            {step === 1 && (
              <div className="h-full grid lg:grid-cols-[320px_1fr] grid-cols-1 gap-10 items-center">

                {/* LEFT SIDE */}
                <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100 p-8">

                  <div className="relative">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-32 h-32 lg:w-44 lg:h-44 rounded-full overflow-hidden border-[5px] border-amber-400 bg-white flex items-center justify-center shadow-lg"
                    >
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="cat"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-7xl">🐱</span>
                      )}
                    </button>

                    {photoPreview && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="
                        absolute
                        top-1
                        right-1
                        w-9
                        h-9
                        rounded-full
                        bg-red-500
                        text-white
                        font-black
                        shadow-lg
                        border-4
                        border-white
                        hover:bg-red-600
                        transition-all
                      "
                    >
                      ✕
                    </button>
                  )}

                    <div className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-amber-700 text-white flex items-center justify-center text-2xl border-4 border-white shadow-lg">
                      +
                    </div>
                  </div>

                  <input
                    aria-label="Tambahkan Foto Kucingmu"
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhoto}
                  />

                  <h3 className="mt-6 text-xl font-black text-amber-900">
                    Upload Foto Kucing
                  </h3>

                  <p className="text-sm text-center text-amber-700 mt-2 leading-relaxed max-w-[220px]">
                    Tambahkan foto agar profil kucing lebih personal dan menarik.
                  </p>
 
                </div>

                {/* RIGHT SIDE */}
                <div className="flex flex-col justify-center max-w-3xl">

                  <div>
                    <p className="text-sm font-bold text-amber-600 uppercase tracking-[3px]">
                      SMART CAT FEEDER
                    </p>

                    <h1 className="text-3xl lg:text-5xl font-black text-amber-950 leading-tight mt-3">
                      Halo, Siapa Nama Kucingmu?
                    </h1>

                    <p className="text-gray-400 text-lg mt-4 leading-relaxed max-w-2xl">
                      Lengkapi identitas kucing untuk membuat sistem feeding otomatis
                      yang akurat berdasarkan kondisi tubuh dan kebutuhan energinya.
                    </p>
                  </div>

                  <div className="mt-10 grid grid-cols-2 gap-6">

                    {/* Nama */}
                    <div className="col-span-2">
                      <p className="block text-sm font-black text-gray-500 mb-3 uppercase tracking-wider">
                        Nama Kucing
                      </p>

                      <input
                        type="text"
                        value={form.name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          upd({ name: e.target.value })
                        }
                        placeholder="Contoh: Milo"
                        className={cn(
                          "w-full h-16 px-6 rounded-2xl border bg-gray-50 text-lg font-semibold outline-none transition-all",
                          duplicateNameAlert
                            ? "border-red-400 focus:border-red-500"
                            : "border-gray-200 focus:border-amber-400 focus:bg-white"
                        )}
                      />
                      {duplicateNameAlert && (
                        <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                          <span className="text-red-500 text-base shrink-0">⚠️</span>
                          <p className="text-sm font-semibold text-red-700">{duplicateNameAlert} Gunakan nama lain untuk menghindari kebingungan dengan riwayat profil.</p>
                        </div>
                      )}
                    </div>

                    {/* Gender */}
                    {[
                      { val: "male", icon: "♂", label: "Jantan" },
                      { val: "female", icon: "♀", label: "Betina" },
                    ].map(({ val, icon, label }) => (
                      <button
                        key={val}
                        onClick={() => upd({ gender: val })}
                        className={cn(
                          "h-28 lg:h-36 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3",
                          form.gender === val
                            ? "border-amber-700 bg-amber-50 shadow-lg shadow-amber-100"
                            : "border-gray-200 bg-white hover:border-amber-300"
                        )}
                      >
                        <span className="text-5xl">
                          {icon}
                        </span>

                        <span
                          className={cn(
                            "text-xl font-black",
                            form.gender === val
                              ? "text-amber-800"
                              : "text-gray-500"
                          )}
                        >
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                      ℹ
                    </div>

                    <div>
                      <p className="font-black text-amber-900">
                        Informasi Jenis Kelamin
                      </p>

                      <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                        Digunakan untuk menentukan kebutuhan energi dan metabolisme
                        harian kucing secara lebih akurat.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 2 ══ */}
            {step === 2 && (
              <div className="max-w-7xl mx-auto grid xl:grid-cols-[1fr_380px] grid-cols-1 gap-10 items-start">

                {/* LEFT */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:p-10">

                  <div>
                    <p className="text-sm font-black uppercase tracking-[3px] text-amber-600">
                      DATA FISIK
                    </p>

                    <h1 className="text-3xl lg:text-5xl font-black text-amber-950 mt-3 leading-tight">
                      Seberapa Besar Teman Bulumu?
                    </h1>

                    <p className="text-gray-400 text-base lg:text-lg mt-4 leading-relaxed max-w-3xl">
                      Data ini digunakan untuk menghitung kebutuhan energi harian,
                      feeding otomatis, dan target berat badan ideal kucingmu. Pastikan data yang dimasukkan akurat agar sistem feeding bekerja optimal.
                    </p>
                  </div>

                  {/* AGE */}
                  <div className="mt-12">

                    <div className="flex items-center justify-between mb-5">
                      <p className="text-sm font-black uppercase tracking-wider text-gray-500">
                        Usia Kucing
                      </p>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200">
                        <span>📅</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          aria-label="Usia kucing (tahun)"
                          min="0.3"
                          max="15"
                          step="0.1"
                          value={ageDraft ?? form.age}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setAgeDraft(raw);
                            const v = parseFloat(raw);
                            if (!isNaN(v)) upd({ age: v });
                          }}
                          onBlur={() => {
                            const v = parseFloat(ageDraft ?? String(form.age));
                            const clamped = isNaN(v) ? form.age : Math.min(15, Math.max(0.3, v));
                            upd({ age: clamped });
                            setAgeDraft(null);
                          }}
                          className="w-14 text-center font-black text-amber-800 bg-transparent outline-none border-b border-amber-300 focus:border-amber-600"
                        />
                        <span className="font-black text-amber-800 text-sm">Thn</span>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        aria-label="Berapa umur kucingmu?"
                        type="range"
                        min="0.3"
                        max="15"
                        step="0.1"
                        value={form.age}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          upd({ age: Number(e.target.value) })
                        }
                        className="cat-slider"
                      />
                      {/* Tick marks — satu titik per tahun, tanda batas kategori lebih besar */}
                      <div className="relative mt-2 h-5">
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((y) => {
                          const pct = ((y - 0.3) / (15 - 0.3)) * 100;
                          const isBoundary = y === 1 || y === 7;
                          return (
                            <div
                              key={y}
                              className="absolute flex flex-col items-center"
                              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                            >
                              <div className={cn(
                                'rounded-full',
                                isBoundary ? 'w-1 h-3 bg-amber-400' : 'w-0.5 h-2 bg-gray-300'
                              )} />
                              {isBoundary && (
                                <span className="text-[9px] font-black text-amber-500 mt-0.5 whitespace-nowrap">
                                  {y}y
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-5">
                      {[
                        { label: "Kitten", sub: "4-12 bulan", jumpTo: 0.7, emoji: "🐱" },
                        { label: "Adult",  sub: "1-7 tahun",  jumpTo: 4,   emoji: "🐈" },
                        { label: "Senior", sub: ">7 tahun",   jumpTo: 11,  emoji: "🐾" },
                      ].map(({ label, sub, jumpTo, emoji }) => {
                        const isActive = ageCategory.label === label;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => upd({ age: jumpTo })}
                            className={cn(
                              "rounded-2xl p-3 sm:p-4 border-2 transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-1 w-full",
                              isActive
                                ? "bg-amber-700 border-amber-700 text-white shadow-md shadow-amber-200 scale-105"
                                : "bg-white border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 active:scale-95"
                            )}
                          >
                            <span className="flex items-center justify-center w-8 h-8 text-2xl">{emoji}</span>
                            <span className="font-black text-sm sm:text-base leading-tight">{label}</span>
                            <span className={cn("text-[10px] sm:text-xs leading-tight", isActive ? "text-amber-200" : "text-gray-400")}>
                              {sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* WEIGHT */}
                  <div className="mt-14">

                    <div className="flex items-center justify-between mb-5">

                      <p className="text-sm font-black uppercase tracking-wider text-gray-500">
                        Berat Badan
                      </p>

                      <div className="flex items-end gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          aria-label="Berat badan kucing (kg)"
                          min="0.5"
                          max="15"
                          step="0.1"
                          value={weightDraft ?? form.weight}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setWeightDraft(raw);
                            const newWeight = parseFloat(raw);
                            if (!isNaN(newWeight)) {
                              upd({ weight: newWeight, bodyCondition: getAutoBodyCondition(newWeight) });
                            }
                          }}
                          onBlur={() => {
                            const newWeight = parseFloat(weightDraft ?? String(form.weight));
                            const clamped = isNaN(newWeight) ? form.weight : Math.min(15, Math.max(0.5, newWeight));
                            upd({ weight: clamped, bodyCondition: getAutoBodyCondition(clamped) });
                            setWeightDraft(null);
                          }}
                          className="text-5xl font-black text-amber-900 bg-transparent outline-none border-b-2 border-amber-200 focus:border-amber-500 w-28 text-right"
                        />
                        <span className="text-xl font-bold text-gray-400 mb-2">
                          KG
                        </span>
                      </div>
                    </div>

                    <input
                      aria-label="Berapa berat kucingmu?"
                      type="range"
                      min="0.5"
                      max="15"
                      step="0.1"
                      value={form.weight}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const newWeight = Number(e.target.value);
                        upd({
                          weight: newWeight,
                          bodyCondition: getAutoBodyCondition(newWeight),
                        });
                      }}
                      className="cat-slider"
                    />

                    <div className="flex justify-between mt-5">
                      {[1, 3, 5, 7, 9, 11, 13, 15].map((n) => (
                        <span
                          key={n}
                          className="text-xs text-gray-300 font-bold"
                        >
                          {n}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">

                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        ℹ
                      </div>

                      <div>
                        <p className="font-black text-blue-900">
                          Tips Menimbang Kucing
                        </p>

                        <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                          Timbang tubuh Anda terlebih dahulu, lalu timbang kembali sambil
                          menggendong kucing. Selisih beratnya adalah berat kucing Anda.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="sticky top-5">

                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-8 shadow-sm">

                    <div className="flex justify-between items-center">

                      <p className="text-sm font-black uppercase tracking-wider text-amber-700">
                        Body Condition
                      </p>

                      <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                        Auto Detect
                      </div>
                    </div>

                    <div className="mt-10 flex justify-center">

                      <div className="w-40 h-40 rounded-full overflow-hidden border-[6px] border-amber-200 shadow-lg">

                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="cat"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-white flex items-center justify-center text-7xl">
                            🐱
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 text-center">

                      <p className="text-lg font-black text-gray-800">
                        {getBodyLabel(form.bodyCondition)}
                      </p>

                      <p className="text-sm text-gray-400 mt-2">
                        Terdeteksi otomatis berdasarkan berat badan.
                      </p>
                    </div>

                    <div className="flex justify-center gap-2 mt-6">

                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-3 h-3 rounded-full",
                            i <= form.bodyCondition
                              ? "bg-amber-500"
                              : "bg-gray-200"
                          )}
                        />
                      ))}
                    </div>

                    <div className="mt-10 border-t border-amber-100 pt-6">

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">
                          Berat Saat Ini
                        </span>

                        <span className="text-2xl font-black text-amber-900">
                          {form.weight} KG
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <span className="text-gray-400">
                          Kategori Umur
                        </span>

                        <span className="text-lg font-black text-amber-700">
                          {ageCategory.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 3 ══ */}
            {step === 3 && (
              <div className="max-w-6xl mx-auto">

                <div className="text-center">

                  <p className="text-sm font-black uppercase tracking-[3px] text-amber-600">
                    KONDISI KESEHATAN
                  </p>

                  <h1 className="text-3xl lg:text-5xl font-black text-amber-950 mt-3">
                    Bagaimana Kondisi Kesehatannya?
                  </h1>

                  <p className="text-base lg:text-lg text-gray-400 mt-4 max-w-3xl mx-auto leading-relaxed">
                    Informasi ini membantu sistem menentukan kebutuhan energi dan
                    feeding otomatis yang lebih akurat.
                  </p>
                </div>

                {/* STERIL */}
                <div className="mt-14">

                  <p className="text-sm font-black uppercase tracking-wider text-gray-500 mb-5">
                    ✂ Status Sterilisasi
                  </p>

                  <div className="grid md:grid-cols-2 grid-cols-1 gap-5">

                    {[
                      {
                        val: true,
                        icon: "🐾",
                        label: "Sudah Steril",
                        sub: "Metabolisme lebih rendah dan mudah naik berat badan.",
                      },
                      {
                        val: false,
                        icon: "🛡",
                        label: "Belum Steril",
                        sub: "Kebutuhan energi lebih tinggi dan aktif bergerak.",
                      },
                    ].map(({ val, icon, label, sub }) => (

                      <button
                        key={String(val)}
                        onClick={() => upd({ isSterilized: val })}
                        className={cn(
                          "rounded-3xl border-2 p-7 transition-all text-left",
                          form.isSterilized === val
                            ? "border-amber-700 bg-amber-50 shadow-lg shadow-amber-100"
                            : "border-gray-200 bg-white hover:border-amber-300"
                        )}
                      >

                        <div className="flex items-start justify-between">

                          <div>

                            <div className="flex items-center gap-3">

                              <span className="text-3xl">
                                {icon}
                              </span>

                              <p
                                className={cn(
                                  "text-2xl font-black",
                                  form.isSterilized === val
                                    ? "text-amber-900"
                                    : "text-gray-700"
                                )}
                              >
                                {label}
                              </p>
                            </div>

                            <p className="text-gray-400 mt-4 leading-relaxed">
                              {sub}
                            </p>
                          </div>

                          {form.isSterilized === val && (
                            <div className="w-9 h-9 rounded-full bg-amber-700 text-white flex items-center justify-center font-black">
                              ✓
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* WARNING */}
                {form.bodyCondition >= 5 && (
                  <div className="mt-8 bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4">

                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xl">
                      ℹ
                    </div>

                    <div>
                      <p className="text-lg font-black text-blue-900">
                        Berat Badan Diatas Ideal
                      </p>

                      <p className="text-blue-700 mt-2 leading-relaxed">
                        Sistem akan otomatis mengurangi feeding sekitar 15%
                        untuk membantu menjaga berat badan ideal dan mencegah risiko FLUTD.
                      </p>
                    </div>
                  </div>
                )}

                {/* AKTIVITAS KUCING */}
                <div className="mt-10">
                  <p className="text-sm font-black uppercase tracking-wider text-gray-500 mb-5">
                    🏃 Tingkat Aktivitas Kucing
                  </p>
                  <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
                    {([
{ val: 'very_low',  icon: '😴', label: 'Sangat Tidak Aktif', sub: 'Hampir tidak bergerak, tidur terus.' },
{ val: 'low',       icon: '🛋️', label: 'Tidak Aktif',        sub: 'Jarang bermain, banyak rebahan.' },
{ val: 'normal',    icon: '🐾', label: 'Normal',              sub: 'Bermain & bergerak rutin setiap hari.' },
{ val: 'high',      icon: '⚡', label: 'Aktif',               sub: 'Sering berlari, bermain, eksplorasi.' },
{ val: 'very_high', icon: '🔥', label: 'Sangat Aktif',        sub: 'Bergerak intens hampir sepanjang hari.' },
                    ] as { val: ActivityLevel; icon: string; label: string; sub: string }[]).map(({ val, icon, label, sub }) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => upd({ activity: val })}
                        className={cn(
                          "rounded-3xl border-2 p-6 transition-all text-left",
                          form.activity === val
                            ? "border-amber-700 bg-amber-50 shadow-lg shadow-amber-100"
                            : "border-gray-200 bg-white hover:border-amber-300"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-3xl">{icon}</span>
                            <p className={cn("text-xl font-black mt-3", form.activity === val ? "text-amber-900" : "text-gray-700")}>{label}</p>
                            <p className="text-gray-400 text-sm mt-2 leading-relaxed">{sub}</p>
                          </div>
                          {form.activity === val && (
                            <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center font-black shrink-0">✓</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Faktor aktivitas (Fa): Sangat Tidak Aktif = 0.8 · Tidak Aktif = 0.9 · Normal = 1.0 · Aktif = 1.1 · Sangat Aktif = 1.3
                  </p>
                </div>

                {/* FOOD ENERGY */}
                <div className="mt-10">

                  <p className="block text-sm font-black uppercase tracking-wider text-gray-500 mb-4">
                    Energi Makanan Kemasan (kcal/kg)
                  </p>

                  <input
                    aria-label="Masukkan energi makanan kucingmu yang ada dikemasan"
                    type="number"
                    value={form.foodEnergy}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      upd({ foodEnergy: Number(e.target.value) })
                    }
                    className="w-full h-20 rounded-3xl border border-gray-200 bg-gray-50 px-6 text-2xl font-black outline-none focus:border-amber-400"
                  />

                  <p className="text-sm text-gray-400 mt-3">
                    Isi sesuai informasi kcal/kg pada kemasan makanan kucing.
                  </p>
                </div>

                {/* AUTO DETECT */}
                <div className="mt-10 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-8 shadow-sm">

                  <div className="flex lg:flex-row flex-col lg:items-center justify-between gap-8">

                    <div>

                      <p className="text-sm font-black uppercase tracking-[3px] text-amber-700">
                        AUTO BODY ANALYSIS
                      </p>

                      <h2 className="text-3xl font-black text-amber-950 mt-3">
                        Deteksi Kondisi Tubuh Otomatis
                      </h2>

                      <p className="text-amber-700 mt-4 max-w-2xl leading-relaxed">
                        Sistem mendeteksi kondisi tubuh berdasarkan berat badan,
                        usia, dan status kesehatan kucing Anda.
                      </p>
                    </div>

                    <div className="text-right">

                      <p className="text-6xl font-black text-amber-900">
                        {form.weight}
                        <span className="text-2xl ml-2">
                          KG
                        </span>
                      </p>

                      <p className="text-2xl font-black text-amber-700 mt-2">
                        {getBodyLabel(form.bodyCondition)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 4 ══ */}
            {step === 4 && (
              <div className="max-w-7xl mx-auto">

                <div className="text-center">

                  <p className="text-sm font-black uppercase tracking-[3px] text-amber-600">
                    HASIL FEEDING
                  </p>

                  <h1 className="text-3xl lg:text-5xl font-black text-amber-950 mt-3">
                    Rencana Kebutuhan Energi Harian Siap!
                  </h1>

                  <p className="text-base lg:text-lg text-gray-400 mt-4 max-w-4xl mx-auto leading-relaxed">
                    Berdasarkan data fisik dan kondisi kesehatan,
                    sistem telah menghitung kebutuhan energi otomatis harian.
                  </p>
                </div>

                <div className="mt-14 grid xl:grid-cols-[420px_1fr] grid-cols-1 gap-10">

                  {/* LEFT */}
                  <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">

                    <div className="flex justify-center">

                      <CircularGauge
                        value={targets.dailyCalorieTarget}
                        max={600}
                        unit="kcal/hari"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-10">

                      <div className="text-center border-r border-gray-100">

                        <p className="text-sm font-black uppercase tracking-wider text-gray-400">
                          Target Porsi
                        </p>

                        <p className="text-5xl font-black text-amber-700 mt-4">
                          {targets.dailyGramTarget}
                        </p>

                        <p className="text-lg text-gray-400 mt-1">
                          gram/hari
                        </p>
                      </div>

                      <div className="text-center">

                        <p className="text-sm font-black uppercase tracking-wider text-gray-400">
                          Status Gizi
                        </p>

                        <p className="text-4xl font-black text-green-500 mt-4">
                          {getBodyLabel(form.bodyCondition)}
                        </p>
                      </div>
                    </div>

                    {/* SCHEDULE */}
                    <div className="mt-12">

                      <div className="flex items-baseline gap-3 mb-5">
                        <p className="text-lg font-black text-gray-800">
                          🕐 Jadwal Feeding
                        </p>
                        <span className="text-sm font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          6x / hari
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                        {schedule.map((item: ScheduleItem) => (

                          <div
                            key={item.time}
                            className="bg-gray-50 border border-gray-100 rounded-2xl p-4"
                          >

                            <div className="text-2xl">
                              {item.icon}
                            </div>

                            <p className="text-base font-black text-gray-800 mt-2">
                              {item.label}
                            </p>

                            <p className="text-xs text-gray-400 mt-0.5">
                              {item.time}
                            </p>

                            <p className="text-2xl font-black text-amber-700 mt-3">
                              {item.amount}g
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="flex flex-col gap-6">

                    {/* DETAIL */}
                    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">

                      <p className="text-2xl font-black text-gray-900 mb-8">
                        📊 Detail Kalkulasi Nutrisi
                      </p>

                      {[
                        {
                          label: `Fm (${ageCategory.label} ${
                            form.isSterilized ? "Steril" : "Normal"
                          })`,
                          val: targets.Fm,
                        },
                        {
                          label: `Fg (${
                            form.gender === "male" ? "Jantan" : "Betina"
                          })`,
                          val: targets.Fg,
                        },
                        {
                          label: `Fo (${getBodyLabel(form.bodyCondition)})`,
                          val: targets.Fo,
                        },
                      ].map(({ label, val }) => (

                        <div
                          key={label}
                          className="flex justify-between items-center py-5 border-b border-gray-100 last:border-0"
                        >

                          <span className="text-lg text-gray-500">
                            {label}
                          </span>

                          <span className="text-2xl font-black text-amber-900">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* HEALTH STATUS */}
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-3xl p-8">

                      <div className="flex items-center gap-4">

                        <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-black">
                          ✓
                        </div>

                        <div>

                          <p className="text-2xl font-black text-orange-900">
                            Kucing dalam kondisi {getBodyLabel(form.bodyCondition)}
                          </p>

                          <p className="text-orange-700 mt-2 leading-relaxed">
                            Feeding otomatis disesuaikan untuk menjaga metabolisme,
                            kesehatan saluran kemih, dan berat badan ideal.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* VALIDATION */}
                    <div className="bg-green-50 border border-green-100 rounded-3xl p-6 flex items-center gap-4">

                      <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-black">
                        ✓
                      </div>

                      <div>

                        <p className="font-black text-green-900">
                          Nutrisi Tervalidasi
                        </p>

                        <p className="text-green-700 mt-1">
                          Perhitungan feeding mengikuti standar nutrisi hewan internasional.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NOTIFIKASI CSV DOWNLOADED — hanya untuk USER */}
                {!isAdmin && csvDownloaded && (
                  <div className="mt-8 bg-blue-50 border border-blue-200 rounded-3xl p-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl shrink-0">
                      📥
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-black text-blue-900">
                        Hasil Kalkulasi Berhasil Diunduh!
                      </p>
                      <p className="text-blue-700 mt-2 leading-relaxed">
                        File CSV berhasil tersimpan di perangkat Anda.{" "}
                        Jika ingin mencoba alat PawfectCare secara langsung,{" "}
                        <span className="font-black">silakan hubungi admin.</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('appMode');
                          window.location.href = '/';
                        }}
                        className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
                      >
                        Kembali ke Halaman Utama
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div> {/* end flex-1 overflow-y-auto */}

          {/* ── FOOTER ── */}
          <div className="px-6 pb-5 pt-4 border-t border-gray-50">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext || loading}
                className={cn(
                  "w-full sm:flex-1 py-4 sm:py-3 lg:py-3.5 rounded-2xl font-black text-base sm:text-sm transition-all",
                  canNext && !loading
                    ? "bg-gradient-to-r from-amber-800 to-amber-600 text-white shadow-lg shadow-amber-100 hover:brightness-95"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                )}
              >
                {loading
                  ? "Processing..."
                  : step === 4 && !isAdmin && csvDownloaded
                  ? "📥 Download Lagi"
                  : step === 4 && !isAdmin
                  ? "📥 Download as CSV"
                  : step === 4
                  ? "💾 Simpan ke Database"
                  : "Lanjutkan →"}
              </button>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="w-full sm:w-auto py-3.5 sm:py-0 sm:px-1 rounded-2xl sm:rounded-none border border-gray-200 sm:border-0 bg-gray-50 sm:bg-transparent text-sm sm:text-xs font-bold text-gray-500 sm:text-gray-400 hover:text-amber-700 hover:bg-gray-100 sm:hover:bg-transparent transition-colors flex items-center justify-center gap-1 shrink-0"
                >
                  ← Kembali
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('appMode');
                    window.location.href = '/';
                  }}
                  className="w-full sm:w-auto py-3.5 sm:py-0 sm:px-1 rounded-2xl sm:rounded-none border border-gray-200 sm:border-0 bg-gray-50 sm:bg-transparent text-sm sm:text-xs font-bold text-gray-500 sm:text-gray-400 hover:text-amber-700 hover:bg-gray-100 sm:hover:bg-transparent transition-colors flex items-center justify-center gap-1 shrink-0"
                >
                  ← Kembali
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-amber-50">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[10px] text-gray-400">
                  {step === 4 ? "Feeder: Online" : "PawfectCare Terhubung: V3-ModelX"}
                </span>
              </div>
              {step === 4 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[10px] text-gray-400">Sync: Connected</span>
                </div>
              )}
            </div>
          </div> {/* end footer */}

        </div> {/* end w-full max-w-6xl */}

      </div> {/* end card utama */}

      {/* ── MODAL KONFIRMASI SIMPAN (SUPER_ADMIN) ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-amber-100">

            {/* ── State: LOADING ── */}
            {loading && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin mx-auto mb-5" />
                <h2 className="text-xl font-black text-amber-900">Menyimpan Data...</h2>
                <p className="text-gray-400 text-sm mt-2">
                  {photoFile ? 'Memproses foto & menyimpan ke database...' : 'Menyimpan ke database...'}
                </p>
              </div>
            )}

            {/* ── State: SUKSES + PHOTO WARNING ── */}
            {!loading && !saveError && photoUploadWarning && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
                <h2 className="text-xl font-black text-green-800">Data Berhasil Disimpan!</h2>
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-left">
                  <p className="text-sm font-black text-orange-800">⚠ Foto tidak berhasil diproses</p>
                  <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                    Foto gagal dikompresi. Data kucing sudah tersimpan. Foto bisa ditambahkan kembali nanti.
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-3">Mengalihkan ke dashboard...</p>
              </div>
            )}

            {/* ── State: ERROR ── */}
            {!loading && saveError && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-3xl">❌</div>
                <h2 className="text-xl font-black text-red-800">Gagal Menyimpan</h2>
                <p className="text-sm text-red-600 mt-2 leading-relaxed">{saveError}</p>
                {photoUploadWarning && (
                  <p className="text-xs text-orange-600 mt-2">
                    (Foto juga gagal diupload karena masalah CORS)
                  </p>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowConfirmModal(false); setSaveError(null); }}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:border-gray-300 transition-all"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={confirmSave}
                    className="flex-1 py-3 rounded-2xl bg-amber-700 text-white font-black hover:bg-amber-800 transition-all"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            )}

            {/* ── State: KONFIRMASI (default) ── */}
            {!loading && !saveError && !photoUploadWarning && (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5 text-3xl">
                  ⚠️
                </div>
                <h2 className="text-2xl font-black text-center text-amber-900">
                  Konfirmasi Simpan Data
                </h2>
                <p className="text-gray-500 text-center mt-3 leading-relaxed">
                  Apakah Anda yakin ingin menyimpan data ini ke database?
                </p>
                <p className="text-red-500 font-bold text-center text-sm mt-2">
                  Data kucing yang lama akan ditimpa dan tidak dapat dikembalikan.
                </p>
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:border-gray-300 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmSave}
                    className="flex-1 py-3.5 rounded-2xl bg-amber-700 text-white font-black hover:bg-amber-800 transition-all"
                  >
                    Ya, Simpan
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}