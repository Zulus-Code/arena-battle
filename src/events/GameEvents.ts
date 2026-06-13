// ─── Game Event Definitions ───────────────────────────────────────────────────
// All game events are defined here as discriminated unions.
// Systems communicate exclusively through these events.

import type { Vec3, DamageSource } from '@/domain/types/CoreTypes';

// ─── Event Types ─────────────────────────────────────────────────────────────

export type GameEvent =
  | EnemyKilledEvent
  | PlayerDamagedEvent
  | PlayerKilledEvent
  | WeaponChangedEvent
  | ProjectileHitEvent
  | PickupCollectedEvent
  | ShieldActivatedEvent
  | ShieldDeactivatedEvent
  | LevelCompletedEvent
  | GameOverEvent
  | BossSpawnedEvent
  | ExplosionCreatedEvent
  | EnemySpawnedEvent
  | EnemyStateChangedEvent
  | ScoreChangedEvent
  | AmmoChangedEvent
  | ObstacleDamagedEvent
  | ObstacleDestroyedEvent;

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface EnemyKilledEvent {
  readonly type: 'EnemyKilled';
  readonly enemyId: string;
  readonly position: Vec3;
  readonly scoreReward: number;
  readonly killedBy: string;
}

export interface PlayerDamagedEvent {
  readonly type: 'PlayerDamaged';
  readonly playerId: string;
  readonly damage: number;
  readonly source: DamageSource;
  readonly position: Vec3;
  readonly remainingHealth: number;
}

export interface PlayerKilledEvent {
  readonly type: 'PlayerKilled';
  readonly playerId: string;
  readonly position: Vec3;
  readonly killedBy: string;
}

export interface WeaponChangedEvent {
  readonly type: 'WeaponChanged';
  readonly playerId: string;
  readonly weaponId: string;
  readonly weaponName: string;
}

export interface ProjectileHitEvent {
  readonly type: 'ProjectileHit';
  readonly projectileId: string;
  readonly targetId: string | null;
  readonly position: Vec3;
  readonly damage: number;
}

export interface PickupCollectedEvent {
  readonly type: 'PickupCollected';
  readonly pickupId: string;
  readonly pickupType: string;
  readonly collectorId: string;
}

export interface ShieldActivatedEvent {
  readonly type: 'ShieldActivated';
  readonly entityId: string;
  readonly duration: number;
}

export interface ShieldDeactivatedEvent {
  readonly type: 'ShieldDeactivated';
  readonly entityId: string;
}

export interface LevelCompletedEvent {
  readonly type: 'LevelCompleted';
  readonly levelIndex: number;
  readonly score: number;
  readonly timeElapsed: number;
}

export interface GameOverEvent {
  readonly type: 'GameOver';
  readonly score: number;
  readonly reason: 'PlayerDead' | 'TimeUp';
}

export interface BossSpawnedEvent {
  readonly type: 'BossSpawned';
  readonly bossId: string;
  readonly position: Vec3;
}

export interface ExplosionCreatedEvent {
  readonly type: 'ExplosionCreated';
  readonly position: Vec3;
  readonly radius: number;
  readonly damage: number;
  readonly sourceId: string;
}

export interface EnemySpawnedEvent {
  readonly type: 'EnemySpawned';
  readonly enemyId: string;
  readonly position: Vec3;
  readonly enemyType: string;
}

export interface EnemyStateChangedEvent {
  readonly type: 'EnemyStateChanged';
  readonly enemyId: string;
  readonly previousState: string;
  readonly newState: string;
}

export interface ScoreChangedEvent {
  readonly type: 'ScoreChanged';
  readonly score: number;
  readonly delta: number;
}

export interface AmmoChangedEvent {
  readonly type: 'AmmoChanged';
  readonly playerId: string;
  readonly ammo: number;
  readonly maxAmmo: number;
}

export interface ObstacleDamagedEvent {
  readonly type: 'ObstacleDamaged';
  readonly obstacleId: string;
  readonly position: Vec3;
  readonly damage: number;
  readonly remainingHp: number;
  readonly maxHp: number;
}

export interface ObstacleDestroyedEvent {
  readonly type: 'ObstacleDestroyed';
  readonly obstacleId: string;
  readonly position: Vec3;
}
