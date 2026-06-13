// ─── Projectile Entity ────────────────────────────────────────────────────────

import type { EntityId, Vec3, Faction } from '@/domain/types/CoreTypes';

export interface ProjectileData {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly faction: Faction;
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly damage: number;
  readonly radius: number;
  readonly splashRadius: number;
  readonly lifetime: number;         // remaining seconds
  readonly color: string;
  readonly active: boolean;
}
