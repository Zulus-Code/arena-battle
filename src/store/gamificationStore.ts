// ─── Gamification Store ──────────────────────────────────────────────────────
// Zustand store for runtime gamification state: achievements, notifications, unlocks.

import { create } from 'zustand';
import { ACHIEVEMENTS, type AchievementDef } from '@/config/AchievementConfig';
import type { PersistentStats } from '@/services/StatsService';

export interface AchievementNotification {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly earnedAt: number;  // timestamp
}

export interface LevelResult {
  readonly levelIndex: number;
  readonly score: number;
  readonly timeElapsed: number;
  readonly accuracy: number;
  readonly stars: number;
  readonly won: boolean;
  readonly enemiesKilled: number;
  readonly shotsFired: number;
  readonly shotsHit: number;
  readonly damageTaken: number;
  readonly pickupsCollected: number;
  readonly totalPickups: number;
}

export interface GamificationState {
  // Persisted stats (loaded at boot, written back on changes)
  stats: PersistentStats;

  // Runtime notifications queue
  notifications: AchievementNotification[];

  // Last level result (for UpgradeScreen)
  lastLevelResult: LevelResult | null;

  // Actions
  setStats: (stats: PersistentStats) => void;
  addNotification: (achievement: AchievementDef) => void;
  dismissNotification: (id: string) => void;
  setLastLevelResult: (result: LevelResult | null) => void;
  getAchievementDef: (id: string) => AchievementDef | undefined;
  getAllAchievementDefs: () => readonly AchievementDef[];
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  stats: null as unknown as PersistentStats, // set via setStats after load
  notifications: [],
  lastLevelResult: null,

  setStats: (stats) => set({ stats }),

  addNotification: (achievement) => {
    const notification: AchievementNotification = {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      earnedAt: Date.now(),
    };
    set((s) => ({
      notifications: [...s.notifications, notification],
    }));
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      get().dismissNotification(achievement.id);
    }, 5000);
  },

  dismissNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
  },

  setLastLevelResult: (result) => set({ lastLevelResult: result }),

  getAchievementDef: (id) => ACHIEVEMENTS.find((a) => a.id === id),

  getAllAchievementDefs: () => ACHIEVEMENTS,
}));
