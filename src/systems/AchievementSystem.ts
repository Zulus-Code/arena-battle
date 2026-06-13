// ─── Achievement System ───────────────────────────────────────────────────────
// Subscribes to game events, tracks session context, evaluates achievements
// on level completion / game over. Emits notifications via gamification store.

import { eventBus } from '@/events/EventBus';
import { ACHIEVEMENTS } from '@/config/AchievementConfig';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';
import { useGamificationStore } from '@/store/gamificationStore';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { StatsService } from '@/services/StatsService';
import { computeStars } from '@/domain/rules/StarRating';
import { accuracy } from '@/domain/entities/GameSession';
import { createLogger } from '@/core/Logger';
import type { LevelResult } from '@/store/gamificationStore';

const log = createLogger('AchievementSystem');

// ─── Session-level tracker ────────────────────────────────────────────────────
// Reset on each level start.

interface SessionContext {
  playerDamaged: boolean;
  playerHpLost: boolean;
  totalEnemiesKilled: number;
  totalTanksKilled: number;
  bossesKilled: number;
  totalDamageTaken: number;
  totalDamageDealt: number;
  totalPickupsCollected: number;
  totalPickupsOnLevel: number;
  highestDamageFromSingleHit: number;
  splashKillsInOneExplosion: number;
  allEnemiesKilled: boolean;
  totalEnemiesOnLevel: number;
}

let ctx: SessionContext = createSessionContext();

function createSessionContext(): SessionContext {
  return {
    playerDamaged: false,
    playerHpLost: false,
    totalEnemiesKilled: 0,
    totalTanksKilled: 0,
    bossesKilled: 0,
    totalDamageTaken: 0,
    totalDamageDealt: 0,
    totalPickupsCollected: 0,
    totalPickupsOnLevel: 0,
    highestDamageFromSingleHit: 0,
    splashKillsInOneExplosion: 0,
    allEnemiesKilled: false,
    totalEnemiesOnLevel: 0,
  };
}

export function resetAchievementContext(): void {
  ctx = createSessionContext();
}

export function setLevelPickupCount(count: number): void {
  ctx.totalPickupsOnLevel = count;
}

export function setEnemyCount(count: number): void {
  ctx.totalEnemiesOnLevel = count;
}

// ─── Achievement conditions ──────────────────────────────────────────────────

type ConditionFn = (ctx: SessionContext, levelResult: LevelResult, stats: ReturnType<typeof StatsService.load>) => boolean;

const CONDITIONS: Record<string, ConditionFn> = {
  first_kill: (_ctx, _lr, _stats) => true, // checked at first kill event

  massacre: (ctx, _lr, _stats) =>
    ctx.allEnemiesKilled && ctx.totalEnemiesOnLevel > 0,

  tank_hunter: (_ctx, _lr, stats) =>
    stats.totalKills >= 10,

  boss_slayer: (ctx, _lr, _stats) =>
    ctx.bossesKilled > 0,

  splash_double: (ctx, _lr, _stats) =>
    ctx.splashKillsInOneExplosion >= 2,

  sharp_shooter: (_ctx, lr, _stats) =>
    lr.shotsFired > 0 && lr.accuracy >= 0.80,

  dead_eye: (_ctx, lr, _stats) =>
    lr.shotsFired > 0 && lr.accuracy >= 0.95,

  clean_hands: (ctx, _lr, _stats) =>
    !ctx.playerDamaged,

  indestructible: (ctx, _lr, _stats) =>
    !ctx.playerHpLost,

  gold_rush: (_ctx, lr, _stats) =>
    lr.stars >= 3,

  perfectionist: (_ctx, _lr, stats) =>
    Object.keys(stats.levelStars).length >= 3 &&
    Object.values(stats.levelStars).every((s) => s >= 3),

  pack_rat: (ctx, _lr, _stats) =>
    ctx.totalPickupsOnLevel > 0 && ctx.totalPickupsCollected >= ctx.totalPickupsOnLevel,

  dedicated: (_ctx, _lr, stats) =>
    stats.totalLevelsCompleted >= 5,

  veteran: (_ctx, _lr, stats) =>
    stats.totalLevelsCompleted >= 10,

  tour_of_duty: (_ctx, _lr, stats) =>
    stats.totalLevelsCompleted >= 3,
};

// ─── Event handlers ──────────────────────────────────────────────────────────

function onEnemyKilled(): void {
  ctx.totalEnemiesKilled++;
  // Immediate check for first kill
  if (ctx.totalEnemiesKilled === 1) {
    checkAndEarn('first_kill');
  }
}

function onPlayerDamaged(amount: number): void {
  ctx.playerDamaged = true;
  ctx.playerHpLost = true;
  ctx.totalDamageTaken += amount;
  if (amount > ctx.highestDamageFromSingleHit) {
    ctx.highestDamageFromSingleHit = amount;
  }
}

function onPickupCollected(): void {
  ctx.totalPickupsCollected++;
}

// ─── Check & earn ────────────────────────────────────────────────────────────

function checkAndEarn(achievementId: string): void {
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!def) return;

  const newlyEarned = StatsService.earnAchievement(achievementId);
  if (newlyEarned) {
    log.info(`Achievement earned: ${def.title}`);
    useGamificationStore.getState().addNotification(def);
  }
}

// ─── Evaluate all achievements on level end ───────────────────────────────────

export function evaluateAchievements(levelResult: LevelResult): void {
  const stats = StatsService.load();

  // Determine if all enemies were killed
  ctx.allEnemiesKilled = ctx.totalEnemiesKilled >= ctx.totalEnemiesOnLevel;

  for (const achievement of ACHIEVEMENTS) {
    // Skip if already earned
    if (stats.achievements[achievement.id] > 0) continue;

    const condition = CONDITIONS[achievement.id];
    if (!condition) continue;

    if (condition(ctx, levelResult, stats)) {
      checkAndEarn(achievement.id);
    }
  }
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────

type UnsubscribeFn = () => void;

export function setupAchievementSystem(): UnsubscribeFn {
  const unsubs: UnsubscribeFn[] = [];

  resetAchievementContext();

  unsubs.push(eventBus.on('EnemyKilled', (event) => {
    if (event.type === 'EnemyKilled') {
      onEnemyKilled();
    }
  }));

  unsubs.push(eventBus.on('PlayerDamaged', (event) => {
    if (event.type === 'PlayerDamaged') {
      onPlayerDamaged(event.damage);
    }
  }));

  unsubs.push(eventBus.on('PickupCollected', () => {
    onPickupCollected();
  }));

  // ── On level complete: merge stats, evaluate achievements ──────────────
  unsubs.push(eventBus.on('LevelCompleted', (event) => {
    if (event.type !== 'LevelCompleted') return;

    const session = useGameWorldStore.getState().session;
    if (!session) return;

    const config = LEVEL_CONFIGS[event.levelIndex];
    if (!config) return;

    const acc = accuracy(session);
    const stars = config.starThresholds
      ? computeStars(config.starThresholds, event.score, event.timeElapsed, acc)
      : 0;

    // Merge level result into persistent stats
    StatsService.mergeLevelResult(event.levelIndex, event.score, event.timeElapsed, acc, stars);

    // Merge session totals
    StatsService.mergeSessionTotals({
      score: event.score,
      timeElapsed: event.timeElapsed,
      enemiesKilled: session.enemiesKilled,
      shotsFired: session.shotsFired,
      shotsHit: session.shotsHit,
      damageDealt: ctx.totalDamageDealt,
      damageTaken: ctx.totalDamageTaken,
      pickupsCollected: ctx.totalPickupsCollected,
      won: true,
    });

    // Build LevelResult for the store (used by UI screens)
    const levelResult: LevelResult = {
      levelIndex: event.levelIndex,
      score: event.score,
      timeElapsed: event.timeElapsed,
      accuracy: acc,
      stars,
      won: true,
      enemiesKilled: session.enemiesKilled,
      shotsFired: session.shotsFired,
      shotsHit: session.shotsHit,
      damageTaken: ctx.totalDamageTaken,
      pickupsCollected: ctx.totalPickupsCollected,
      totalPickups: ctx.totalPickupsOnLevel,
    };

    // Evaluate achievements
    evaluateAchievements(levelResult);

    // Store result for UI consumption
    useGamificationStore.getState().setLastLevelResult(levelResult);
  }));

  // ── On game over: merge session totals ─────────────────────────────────
  unsubs.push(eventBus.on('GameOver', (event) => {
    if (event.type !== 'GameOver') return;

    const session = useGameWorldStore.getState().session;
    if (!session) return;

    StatsService.mergeSessionTotals({
      score: event.score,
      timeElapsed: session.timeElapsed,
      enemiesKilled: session.enemiesKilled,
      shotsFired: session.shotsFired,
      shotsHit: session.shotsHit,
      damageDealt: ctx.totalDamageDealt,
      damageTaken: ctx.totalDamageTaken,
      pickupsCollected: ctx.totalPickupsCollected,
      won: false,
    });
  }));

  log.info('Achievement system initialized');
  return () => {
    for (const unsub of unsubs) unsub();
  };
}
