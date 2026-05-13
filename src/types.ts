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

export interface CatProfile {
  id: string;
  ownerId: string;
  name: string;
  photoUrl?: string;
  gender: 'male' | 'female';
  age: number; // in months or years? let's say years decimal
  weight: number; // kg
  isSterilized: boolean;
  bodyCondition: 1 | 2 | 3 | 4 | 5; // 1: Thin, 3: Ideal, 5: Obese
  kiloCaloriesPerKg: number; // Kalori pakan (kcal/kg)
  
  // Calculated values
  dailyCalorieTarget: number;
  dailyGramTarget: number;
  feedingSchedule: FeedingScheduleSlot[];
}

export interface FeedingScheduleSlot {
  time: string; // HH:mm
  amount: number; // grams
  label?: string;
}

export interface FeedingLog {
  id: string;
  catId: string;
  timestamp: number;
  amountRequested: number;
  amountDispensed: number;
  status: 'success' | 'failed' | 'warning';
  notes?: string;
}

export interface DeviceStatus {
  id: string;
  isOnline: boolean;
  lastPulse: number;
  foodStockLevel: number; // percentage
  currentWeightOnScale: number; // grams
  servoStatus: 'idle' | 'active' | 'jammed';
  calibrationFactor: number;
}

export interface DashboardStats {
  todayTotalFeeding: number;
  remainingFeeding: number;
  progressPercentage: number;
}
