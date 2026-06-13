// ─── Stats Service ────────────────────────────────────────────────────────────
// Persistent player statistics using localStorage.
// Central source of truth for all cross-session gamification data.

const STORAGE_KEY = 'tank_arena_stats';

export interface PersistentStats {
  // Lifetime totals
  totalKills: number;
  totalDeaths: number;
  totalScore: number;
  totalPlayTime: number;      // seconds
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalShotsFired: number;
  totalShotsHit: number;
  totalLevelsCompleted: number;
  totalPickupsCollected: number;
  totalGamesPlayed: number;

  // Per-level records
  levelStars: Record<number, number>;          // levelIndex → 0-3
  levelBestScore: Record<number, number>;
  levelBestTime: Record<number, number>;
  levelBestAccuracy: Record<number, number>;

  // Progression
  unlockedLevels: number[];                    // indices of unlocked levels
  upgrades: Record<string, number>;            // upgradeId → level

  // Achievements
  achievements: Record<string, number>;        // achievementId → earned timestamp (0 = not earned)
  lastSession: number;                         // unix timestamp
}

function defaultStats(): PersistentStats {
  return {
    totalKills: 0,
    totalDeaths: 0,
    totalScore: 0,
    totalPlayTime: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalShotsFired: 0,
    totalShotsHit: 0,
    totalLevelsCompleted: 0,
    totalPickupsCollected: 0,
    totalGamesPlayed: 0,
    levelStars: {},
    levelBestScore: {},
    levelBestTime: {},
    levelBestAccuracy: {},
    unlockedLevels: [0],
    upgrades: {},
    achievements: {},
    lastSession: 0,
  };
}

let cachedStats: PersistentStats | null = null;

export const StatsService = {
  /** Load stats from localStorage (cached after first call). */
  load(): PersistentStats {
    if (cachedStats) return cachedStats;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistentStats>;
        cachedStats = { ...defaultStats(), ...parsed };
        return cachedStats;
      }
    } catch {
      // corrupted storage — reset
    }
    cachedStats = defaultStats();
    return cachedStats;
  },

  /** Save current stats to localStorage. */
  save(stats: PersistentStats): void {
    cachedStats = stats;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // storage full or unavailable — silently fail
    }
  },

  /** Reset all stats to default. */
  reset(): PersistentStats {
    const stats = defaultStats();
    cachedStats = stats;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch { /* noop */ }
    return stats;
  },

  /** Merge a completed level's results into persistent stats. */
  mergeLevelResult(
    levelIndex: number,
    score: number,
    timeElapsed: number,
    accuracy: number,
    stars: number,
  ): PersistentStats {
    const stats = this.load();

    // Update per-level records
    if ((stats.levelBestScore[levelIndex] ?? 0) < score) {
      stats.levelBestScore[levelIndex] = score;
    }
    if ((stats.levelBestTime[levelIndex] ?? Infinity) > timeElapsed) {
      stats.levelBestTime[levelIndex] = timeElapsed;
    }
    if ((stats.levelBestAccuracy[levelIndex] ?? 0) < accuracy) {
      stats.levelBestAccuracy[levelIndex] = accuracy;
    }
    if ((stats.levelStars[levelIndex] ?? 0) < stars) {
      stats.levelStars[levelIndex] = stars;
    }

    // Unlock next level
    const nextLevel = levelIndex + 1;
    if (!stats.unlockedLevels.includes(nextLevel)) {
      stats.unlockedLevels.push(nextLevel);
    }

    this.save(stats);
    return stats;
  },

  /** Merge session-level stats into lifetime totals. */
  mergeSessionTotals(session: {
    score: number;
    timeElapsed: number;
    enemiesKilled: number;
    shotsFired: number;
    shotsHit: number;
    damageDealt?: number;
    damageTaken?: number;
    pickupsCollected?: number;
    won: boolean;
  }): PersistentStats {
    const stats = this.load();

    stats.totalScore += session.score;
    stats.totalPlayTime += session.timeElapsed;
    stats.totalKills += session.enemiesKilled;
    stats.totalShotsFired += session.shotsFired;
    stats.totalShotsHit += session.shotsHit;
    stats.totalDamageDealt += session.damageDealt ?? 0;
    stats.totalDamageTaken += session.damageTaken ?? 0;
    stats.totalPickupsCollected += session.pickupsCollected ?? 0;
    stats.totalGamesPlayed += 1;
    if (session.won) stats.totalLevelsCompleted += 1;

    this.save(stats);
    return stats;
  },

  /** Mark an achievement as earned (returns true if newly earned). */
  earnAchievement(id: string): boolean {
    const stats = this.load();
    if (stats.achievements[id]) return false; // already earned
    stats.achievements[id] = Date.now();
    this.save(stats);
    return true;
  },

  /** Check if a level is unlocked. */
  isLevelUnlocked(index: number): boolean {
    if (index === 0) return true;
    const stats = this.load();
    return stats.unlockedLevels.includes(index);
  },

    /** Get total number of earned achievements. */
  earnedCount(): number {
    const stats = this.load();
    return Object.values(stats.achievements).filter((t) => t > 0).length;
  },

  /** Get current level of an upgrade. */
  getUpgradeLevel(id: string): number {
    const stats = this.load();
    return stats.upgrades[id] ?? 0;
  },

  /** Deduct score (used by UpgradeScreen after confirming purchase). */
  deductScore(amount: number): boolean {
    const stats = this.load();
    if (stats.totalScore < amount) return false;
    stats.totalScore -= amount;
    this.save(stats);
    return true;
  },

  /** Set upgrade level. */
  setUpgradeLevel(id: string, level: number): void {
    const stats = this.load();
    stats.upgrades[id] = level;
    this.save(stats);
  },
};
