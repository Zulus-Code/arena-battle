// ─── Enemy Configuration ──────────────────────────────────────────────────────
// All enemy stats defined here. Modify balance without touching game logic.

import type { EnemyType } from '@/domain/entities/Enemy';

export interface EnemyConfig {
  readonly type: EnemyType;
  readonly maxHealth: number;
  readonly speed: number;
  readonly turnSpeed: number;
  readonly detectionRange: number;
  readonly attackRange: number;
  readonly scoreReward: number;
  readonly weaponId: string;
  readonly isBoss: boolean;
  readonly color: string;
  readonly scale: number;
}

export const ENEMY_CONFIGS: Readonly<Record<EnemyType, EnemyConfig>> = {
  Scout: {
    type: 'Scout',
    maxHealth: 40,
    speed: 7,
    turnSpeed: 3.0,
    detectionRange: 18,
    attackRange: 10,
    scoreReward: 100,
    weaponId: 'RapidFire',
    isBoss: false,
    color: '#ff4444',
    scale: 0.8,
  },
  Tank: {
    type: 'Tank',
    maxHealth: 120,
    speed: 4,
    turnSpeed: 1.8,
    detectionRange: 15,
    attackRange: 12,
    scoreReward: 250,
    weaponId: 'StandardCannon',
    isBoss: false,
    color: '#cc2222',
    scale: 1.0,
  },
  Boss: {
    type: 'Boss',
    maxHealth: 500,
    speed: 5,
    turnSpeed: 1.2,
    detectionRange: 30,
    attackRange: 20,
    scoreReward: 2000,
    weaponId: 'HeavyCannon',
    isBoss: true,
    color: '#880000',
    scale: 1.8,
  },
} as const;
