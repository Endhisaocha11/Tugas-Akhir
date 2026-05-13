import React, { useState } from 'react';

import {
  ChevronRight,
  ChevronLeft,
  Heart,
  CheckCircle2,
} from 'lucide-react';

import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

import { db } from '../../lib/firebase';

import { useAuth } from '../../lib/AuthContext';

import { cn } from '../../lib/utils';

// =========================
// CALCULATE FORMULA
// =========================

function calculateTargets({
  weight,
  isSterilized,
  gender,
  bodyCondition,
  kiloCaloriesPerKg = 4000,
}: {
  weight: number;
  isSterilized: boolean;
  gender: string;
  bodyCondition: number;
  kiloCaloriesPerKg?: number;
}) {
  const rer =
    70 * Math.pow(weight, 0.75);

  const Fm = isSterilized
    ? 1.2
    : 1.4;

  const Fg =
    gender === 'male'
      ? 0.95
      : 1;

  const Fo =
    bodyCondition <= 2
      ? 1.1
      : bodyCondition >= 4
      ? 0.85
      : 1;

  const dailyCalorieTarget =
    rer * Fm * Fg * Fo;

  const dailyGramTarget =
    (dailyCalorieTarget /
      kiloCaloriesPerKg) *
    1000;

  return {
    dailyCalorieTarget:
      Math.round(
        dailyCalorieTarget
      ),

    dailyGramTarget:
      Math.round(
        dailyGramTarget
      ),
  };
}

// =========================
// COMPONENT
// =========================

export function OnboardingFlow() {
  const { user } = useAuth();

  const isGuestMode =
    localStorage.getItem(
      'appMode'
    ) === 'guest';

  const [step, setStep] =
    useState(1);

  const [loading, setLoading] =
    useState(false);

  const [done, setDone] =
    useState(false);

  const [form, setForm] =
    useState({
      name: '',
      gender: 'male',
      age: 2,
      weight: 4.5,
      isSterilized: true,
      bodyCondition: 3,
      kiloCaloriesPerKg: 4000,
    });

  // =========================
  // UPDATE FORM
  // =========================

  const upd = (
    patch: Partial<
      typeof form
    >
  ) => {
    setForm((f) => ({
      ...f,
      ...patch,
    }));
  };

  // =========================
  // CALCULATE
  // =========================

  const targets =
    calculateTargets(form);

  const schedule = [
    {
      time: '07:00',
      label: 'Pagi',
      amount: Math.round(
        targets.dailyGramTarget /
          3
      ),
    },

    {
      time: '13:00',
      label: 'Siang',
      amount: Math.round(
        targets.dailyGramTarget /
          3
      ),
    },

    {
      time: '19:00',
      label: 'Malam',
      amount:
        targets.dailyGramTarget -
        2 *
          Math.round(
            targets.dailyGramTarget /
              3
          ),
    },
  ];

  // =========================
  // NEXT
  // =========================

  const handleNext = () => {
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }

    handleComplete();
  };

  // =========================
  // COMPLETE
  // =========================

  const handleComplete =
    async () => {

      /**
       * GUEST MODE
       */

      if (isGuestMode) {

        alert(
          '🔒 Guest Mode\n\nHubungi Super Admin untuk menyimpan feeding plan, sinkronisasi device, dan analytics penuh.'
        );

        localStorage.removeItem(
          'appMode'
        );

        localStorage.removeItem(
          'selectedAdminId'
        );

        localStorage.removeItem(
          'selectedAdminEmail'
        );

        window.location.href =
          '/';

        return;
      }

      if (!user) return;

      setLoading(true);

      try {

        const catId = `cat_${user.uid}_${Date.now()}`;

        const catData = {
          id: catId,

          ownerId: user.uid,

          ...form,

          dailyCalorieTarget:
            targets.dailyCalorieTarget,

          dailyGramTarget:
            targets.dailyGramTarget,

          feedingSchedule:
            schedule,

          createdAt:
            Date.now(),

          updatedAt:
            Date.now(),
        };

        // SAVE CAT

        await setDoc(
          doc(
            db,
            'cats',
            catId
          ),
          catData
        );

        // SAVE USER

        await setDoc(
          doc(
            db,
            'users',
            user.uid
          ),
          {
            uid: user.uid,

            email:
              user.email,

            updatedAt:
              Date.now(),
          },
          { merge: true }
        );

        // GET USER

        await getDoc(
          doc(
            db,
            'users',
            user.uid
          )
        );

        setDone(true);

      } catch (err) {

        console.error(err);

        alert(
          'Gagal menyimpan data'
        );

      } finally {
        setLoading(false);
      }
    };

  // =========================
  // VALIDATION
  // =========================

  const canNext =
    step === 1
      ? form.name
          .trim()
          .length > 0
      : true;

  // =========================
  // DONE
  // =========================

  if (done) {
    return (
      <div className="min-h-screen bg-[#F8F4EC] flex items-center justify-center p-6">

        <div className="bg-white max-w-md w-full rounded-[32px] p-10 shadow-xl text-center">

          <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">

            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>

          <h2 className="text-3xl font-black text-[#1F2937] mb-4">
            Berhasil
            Disimpan
          </h2>

          <p className="text-gray-500 leading-relaxed">
            Profil kucing berhasil
            disimpan ke sistem
            FelineGuard.
          </p>

          <button
            onClick={() => {
              window.location.href =
                '/';
            }}
            className="w-full mt-8 bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-bold"
          >
            Ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // MAIN UI
  // =========================

  return (
    <div className="min-h-screen bg-[#F8F4EC] flex items-center justify-center p-6">

      <div className="w-full max-w-3xl">

        {/* HEADER */}

        <div className="text-center mb-10">

          <div className="inline-flex items-center gap-2 bg-white px-5 py-2 rounded-full shadow border border-amber-100">

            <Heart className="w-4 h-4 text-amber-700" />

            <span className="text-sm font-bold text-amber-700">
              Smart Cat Feeder
            </span>
          </div>

          <h1 className="text-5xl font-black text-amber-900 mt-6">
            Setup Kucingmu
          </h1>

          <p className="text-gray-500 mt-3 text-lg">
            Nutrisi sehat &
            monitoring otomatis
            untuk kucing
            kesayangan 🐾
          </p>
        </div>

        {/* GUEST INFO */}

        {isGuestMode && (
          <div className="mb-8 bg-blue-50 border border-blue-100 rounded-[32px] p-6">

            <h3 className="font-black text-blue-800 text-xl mb-3">
              🔒 Guest Mode
            </h3>

            <p className="text-blue-700 leading-relaxed">
              Kamu sedang mencoba
              fitur feeding
              calculator tanpa
              menyimpan data.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-blue-700 list-disc ml-5">

              <li>
                Menyimpan feeding
                plan terkunci
              </li>

              <li>
                Sinkronisasi device
                tidak tersedia
              </li>

              <li>
                Analytics penuh
                hanya untuk admin
              </li>

              <li>
                Hubungi Super
                Admin untuk akses
                penuh
              </li>
            </ul>
          </div>
        )}

        {/* STEP CONTENT */}

        <div className="bg-white rounded-[32px] p-8 shadow-xl border border-amber-100">

          {/* STEP 1 */}

          {step === 1 && (
            <div className="space-y-6">

              <div>
                <label className="block font-bold text-amber-900 mb-3">
                  Nama Kucing
                </label>

                <input
                  aria-label='Tambahkan Nama Kucingmu'
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    upd({
                      name:
                        e.target
                          .value,
                    })
                  }
                  placeholder="Contoh: Mochi"
                  className="w-full px-5 py-4 rounded-2xl border border-amber-200 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 mb-3">
                  Jenis Kelamin
                </label>

                <div className="grid grid-cols-2 gap-4">

                  <button
                    onClick={() =>
                      upd({
                        gender:
                          'male',
                      })
                    }
                    className={cn(
                      'py-4 rounded-2xl border font-bold',
                      form.gender ===
                        'male'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white border-amber-200'
                    )}
                  >
                    Jantan
                  </button>

                  <button
                    onClick={() =>
                      upd({
                        gender:
                          'female',
                      })
                    }
                    className={cn(
                      'py-4 rounded-2xl border font-bold',
                      form.gender ===
                        'female'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white border-amber-200'
                    )}
                  >
                    Betina
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}

          {step === 2 && (
            <div className="space-y-6">

              <div>
                <label className="block font-bold text-amber-900 mb-3">
                  Berat Kucing
                </label>

                <input
                  aria-label='Tambahkan Berat Kucingmu dalam kilogram'
                  type="number"
                  value={form.weight}
                  onChange={(e) =>
                    upd({
                      weight:
                        Number(
                          e.target
                            .value
                        ),
                    })
                  }
                  className="w-full px-5 py-4 rounded-2xl border border-amber-200 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 mb-3">
                  Umur Kucing
                </label>

                <input
                  aria-label='Tambahkan Umur Kucingmu'
                  type="number"
                  value={form.age}
                  onChange={(e) =>
                    upd({
                      age: Number(
                        e.target
                          .value
                      ),
                    })
                  }
                  className="w-full px-5 py-4 rounded-2xl border border-amber-200 outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3 */}

          {step === 3 && (
            <div className="space-y-6">

              <div>
                <label className="block font-bold text-amber-900 mb-3">
                  Sudah Steril?
                </label>

                <div className="grid grid-cols-2 gap-4">

                  <button
                    onClick={() =>
                      upd({
                        isSterilized:
                          true,
                      })
                    }
                    className={cn(
                      'py-4 rounded-2xl border font-bold',
                      form.isSterilized
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white border-amber-200'
                    )}
                  >
                    Sudah
                  </button>

                  <button
                    onClick={() =>
                      upd({
                        isSterilized:
                          false,
                      })
                    }
                    className={cn(
                      'py-4 rounded-2xl border font-bold',
                      !form.isSterilized
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white border-amber-200'
                    )}
                  >
                    Belum
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}

          {step === 4 && (
            <div className="space-y-6">

              {/* RESULT */}

              <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">

                <h2 className="text-2xl font-black text-amber-900 mb-5">
                  Hasil Feeding
                </h2>

                <div className="space-y-4">

                  <div className="flex justify-between">
                    <span>
                      Kalori Harian
                    </span>

                    <span className="font-black">
                      {
                        targets.dailyCalorieTarget
                      } kcal
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Porsi Harian
                    </span>

                    <span className="font-black">
                      {
                        targets.dailyGramTarget
                      } gram
                    </span>
                  </div>
                </div>
              </div>

              {/* SCHEDULE */}

              <div className="bg-white border border-amber-100 rounded-3xl p-6">

                <h3 className="font-black text-xl text-amber-900 mb-5">
                  Jadwal Feeding
                </h3>

                <div className="space-y-4">

                  {schedule.map(
                    (
                      item,
                      i
                    ) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-amber-50 rounded-2xl p-4"
                      >
                        <div>
                          <div className="font-bold">
                            {
                              item.label
                            }
                          </div>

                          <div className="text-sm text-gray-500">
                            {
                              item.time
                            }
                          </div>
                        </div>

                        <div className="font-black text-amber-700">
                          {
                            item.amount
                          }g
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BUTTON */}

        <div className="mt-10 flex gap-4">

          {step > 1 && (
            <button
              type="button"
              onClick={() =>
                setStep(
                  (
                    s
                  ) =>
                    s - 1
                )
              }
              className="px-6 py-5 rounded-2xl border border-gray-200 flex items-center gap-2 font-bold"
            >
              <ChevronLeft className="w-5 h-5" />
              Kembali
            </button>
          )}

          <button
            type="button"
            disabled={
              (!canNext ||
              loading) &&
              !isGuestMode
            }
            onClick={
              handleNext
            }
            className={cn(
              'flex-1 py-5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all',
              isGuestMode
                ? 'bg-gray-300 text-gray-600'
                : 'bg-amber-700 hover:bg-amber-800 text-white',
              loading &&
                'opacity-50'
            )}
          >
            {loading
              ? 'Menyimpan...'
              : step === 4
              ? isGuestMode
                ? '🔒 Save Locked'
                : 'Simpan & Dashboard'
              : 'Lanjut'}

            {!loading && (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}