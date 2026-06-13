// ─── Enemy Entity ─────────────────────────────────────────────────────────────

import type { EntityId, Vec3, EntityStatus, Faction } from '@/domain/types/CoreTypes';
import type { HealthData } from './Health';
import type { ShieldData } from './Shield';
import type { WeaponData } from './Weapon';

// ─── AI State Machine ─────────────────────────────────────────────────────────

export type EnemyAIState =
  | 'IDLE'
  | 'SEARCH'
  | 'CHASE'
  | 'ATTACK'
  | 'RETREAT'
  | 'RAM'
  | 'PICKUP'
  | 'DEAD';

// ─── Enemy Types ──────────────────────────────────────────────────────────────

export type EnemyType = 'Scout' | 'Tank' | 'Boss';

// ─── Enemy Entity ─────────────────────────────────────────────────────────────

export interface EnemyData {
  readonly id: EntityId;
  readonly type: EnemyType;
  readonly faction: Faction;
  readonly position: Vec3;
  readonly rotation: number;         // yaw in radians
  readonly velocity: Vec3;
  readonly health: HealthData;
  readonly shield: ShieldData;
  readonly weapon: WeaponData;
  readonly status: EntityStatus;
  readonly aiState: EnemyAIState;
  readonly aiTimer: number;          // time in current state
  readonly targetId: EntityId | null;
  readonly speed: number;
  readonly turnSpeed: number;
  readonly detectionRange: number;
  readonly attackRange: number;
  readonly scoreReward: number;
  readonly isBoss: boolean;
}
