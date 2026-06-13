// ─── Level Configuration ──────────────────────────────────────────────────────
// Define levels declaratively. No code changes needed to add new levels.

import type { EnemyType } from '@/domain/entities/Enemy';
import type { PickupType } from '@/domain/entities/Pickup';
import type { VictoryCondition } from '@/domain/rules/VictoryRules';
import type { StarThresholds } from '@/domain/rules/StarRating';

export interface EnemySpawnConfig {
  readonly type: EnemyType;
  readonly count: number;
  readonly delayBetween: number;     // seconds between spawns
}

export interface PickupSpawnConfig {
  readonly type: PickupType;
  readonly position: { x: number; z: number };
}

export interface LevelConfig {
  readonly index: number;
  readonly name: string;
  readonly arenaWidth: number;
  readonly arenaDepth: number;
  readonly obstacleCount: number;
  readonly enemyWaves: readonly EnemySpawnConfig[];
  readonly pickups: readonly PickupSpawnConfig[];
  readonly victoryCondition: VictoryCondition;
  readonly timeLimit: number;        // seconds (0 = unlimited)
  readonly skyColor: string;
  readonly ambientIntensity: number;
  readonly starThresholds: StarThresholds;
}

export const LEVEL_CONFIGS: readonly LevelConfig[] = [
  {
    index: 0,
    name: 'Учебный полигон',
    arenaWidth: 40,
    arenaDepth: 40,
    obstacleCount: 8,
    enemyWaves: [
      { type: 'Scout', count: 3, delayBetween: 1.5 },
    ],
    pickups: [
      { type: 'Health', position: { x: -8, z: -8 } },
      { type: 'Ammo', position: { x: 8, z: 8 } },
      { type: 'Shield', position: { x: -8, z: 8 } },
    ],
    victoryCondition: 'EliminateAll',
    timeLimit: 0,
    skyColor: '#1a2a4a',
    ambientIntensity: 0.4,
    starThresholds: {
      bronze: { minScore: 500, maxTime: 60, minAccuracy: 0.35 },
      silver: { minScore: 1000, maxTime: 45, minAccuracy: 0.55 },
      gold: { minScore: 2000, maxTime: 30, minAccuracy: 0.75 },
    },
  },
  {
    index: 1,
    name: 'Стальной каньон',
    arenaWidth: 50,
    arenaDepth: 50,
    obstacleCount: 15,
    enemyWaves: [
      { type: 'Scout', count: 3, delayBetween: 1.0 },
      { type: 'Tank', count: 2, delayBetween: 2.0 },
    ],
    pickups: [
      { type: 'Health', position: { x: -10, z: 0 } },
      { type: 'Ammo', position: { x: 10, z: 0 } },
      { type: 'Shield', position: { x: 0, z: 10 } },
      { type: 'SpeedBoost', position: { x: 0, z: -10 } },
    ],
    victoryCondition: 'EliminateAll',
    timeLimit: 0,
    skyColor: '#0d1b2a',
    ambientIntensity: 0.3,
    starThresholds: {
      bronze: { minScore: 1500, maxTime: 90, minAccuracy: 0.30 },
      silver: { minScore: 3000, maxTime: 60, minAccuracy: 0.50 },
      gold: { minScore: 5000, maxTime: 40, minAccuracy: 0.70 },
    },
  },
  {
    index: 2,
    name: 'Босс-арена',
    arenaWidth: 60,
    arenaDepth: 60,
    obstacleCount: 20,
    enemyWaves: [
      { type: 'Scout', count: 4, delayBetween: 0.8 },
      { type: 'Tank', count: 3, delayBetween: 1.5 },
      { type: 'Boss', count: 1, delayBetween: 3.0 },
    ],
    pickups: [
      { type: 'Health', position: { x: -12, z: 0 } },
      { type: 'Health', position: { x: 12, z: 0 } },
      { type: 'Ammo', position: { x: 0, z: -12 } },
      { type: 'Shield', position: { x: 0, z: 12 } },
      { type: 'RapidFire', position: { x: -8, z: 8 } },
    ],
    victoryCondition: 'KillBoss',
    timeLimit: 0,
    skyColor: '#1a0a0a',
    ambientIntensity: 0.25,
    starThresholds: {
      bronze: { minScore: 3000, maxTime: 120, minAccuracy: 0.30 },
      silver: { minScore: 6000, maxTime: 80, minAccuracy: 0.50 },
      gold: { minScore: 10000, maxTime: 50, minAccuracy: 0.70 },
    },
  },
] as const;
