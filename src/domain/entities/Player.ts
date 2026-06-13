// ─── Player Entity ────────────────────────────────────────────────────────────

import type { EntityId, Vec3, EntityStatus } from '@/domain/types/CoreTypes';
import type { HealthData } from './Health';
import type { ShieldData } from './Shield';
import type { WeaponData } from './Weapon';

export interface PlayerData {
  readonly id: EntityId;
  readonly position: Vec3;
  readonly rotation: number;         // yaw in radians
  readonly velocity: Vec3;
  readonly health: HealthData;
  readonly shield: ShieldData;
  readonly weapon: WeaponData;
  readonly status: EntityStatus;
  readonly score: number;
  readonly speed: number;
  readonly turnSpeed: number;
}
