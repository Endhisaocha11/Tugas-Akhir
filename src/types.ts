/**
 * FelineGuard IoT Types
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  USER = 'USER'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt: number;
}

// ── Smart Adjustment ──────────────────────────────────────────────────────────

export interface DailyAdjustmentSlot {
  time: string;
  originalAmount: number;
  adjustedAmount: number;
}

export interface DailyAdjustment {
  date: string; // YYYY-MM-DD
  manualTotal: number; // total grams manually fed when adjustment was triggered
  slots: DailyAdjustmentSlot[];
}

// ── Cat Profile ───────────────────────────────────────────────────────────────

export interface CatProfile {
  id: string;
  ownerId: string;
  name: string;
  photoUrl?: string;
  gender: 'male' | 'female';
  age: number;
  weight: number;
  isSterilized: boolean;
  bodyCondition: 1 | 2 | 3 | 4 | 5; // 1: Thin, 3: Ideal, 5: Obese
  kiloCaloriesPerKg: number;
  dailyCalorieTarget: number;
  dailyGramTarget: number;
  feedingSchedule: FeedingScheduleSlot[];
  smartFeedEnabled?: boolean;
  // Timestamp kapan profil terakhir disimpan — dipakai untuk reset todayTotal ke 0 saat profil baru
  profileUpdatedAt?: number;
  // Daily limit enforcement — ESP32 reads dailyLimitReachedDate; if it equals today, auto-dispense is blocked
  dailyLimitReachedDate?: string;  // YYYY-MM-DD
  // Set when admin resets the limit by changing profile data (prevents auto re-set for the rest of today)
  dailyLimitResetDate?: string;    // YYYY-MM-DD
  // Smart adjustment for remaining slots today
  dailyAdjustments?: DailyAdjustment;
  activity?: string;
}

export interface FeedingScheduleSlot {
  time: string; // HH:mm
  amount: number; // grams
  label?: string;
  active?: boolean; // default true
}

// ── Feeding Log ───────────────────────────────────────────────────────────────

export type FoodStatus = 'available' | 'decreasing' | 'empty';

export interface FeedingLog {
  id: string;
  catId: string;
  deviceId?: string; // which feeder dispensed, e.g. "{ownerId}_device" or "{ownerId}_device2"
  timestamp: number;
  amountRequested: number;
  amountDispensed: number;
  weightBefore?: number; // bowl weight before dispense (grams)
  weightAfter?: number;  // bowl weight right after dispense (grams)
  amountEaten?: number;  // estimated amount eaten between feedings
  foodStatus?: FoodStatus;
  status: 'success' | 'failed' | 'warning';
  notes?: string; // 'manual' | 'auto' | 'scheduled'
}

// ── Device Status ─────────────────────────────────────────────────────────────

export interface DeviceStatus {
  id: string;
  ownerId?: string;
  deviceNumber?: 1 | 2; // ESP1 or ESP2
  name?: string; // "Feeder ESP 1" or "Feeder ESP 2"
  isOnline: boolean;
  lastPulse: number;
  foodStockLevel: number; // percentage 0-100
  currentWeightOnScale: number; // grams currently in bowl
  lastWeightBeforeDispense?: number; // grams before last dispense, for eaten detection
  servoStatus: 'idle' | 'active' | 'jammed';
  calibrationFactor: number;
}

// ── Cat Profile Snapshot (history) ───────────────────────────────────────────

export interface CatProfileSnapshot {
  id: string;
  catId: string;
  ownerId: string;
  savedAt: number;    // unix ms — when this profile became active
  endedAt?: number;   // unix ms — when it was replaced (undefined = still active)
  name: string;
  gender: 'male' | 'female';
  age: number;
  weight: number;
  isSterilized: boolean;
  bodyCondition: number;
  dailyGramTarget: number;
  dailyCalorieTarget: number;
  kiloCaloriesPerKg: number;
  activity?: string;
  feedingSchedule?: FeedingScheduleSlot[];
}

// ── Cat Usage Session ─────────────────────────────────────────────────────────

export interface CatUsageSession {
  id: string;
  catId: string;
  deviceId: string;
  startTime: number;
  endTime?: number;
  feedingCount: number;
  totalAmountDispensed: number;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export interface DashboardStats {
  todayTotalFeeding: number;
  remainingFeeding: number;
  progressPercentage: number;
}
