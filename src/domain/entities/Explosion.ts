// ─── Explosion Entity ─────────────────────────────────────────────────────────

import type { EntityId, Vec3 } from '@/domain/types/CoreTypes';

export interface ExplosionData {
  readonly id: EntityId;
  readonly position: Vec3;
  readonly radius: number;
  readonly damage: number;
  readonly sourceId: EntityId;
  readonly lifetime: number;         // visual lifetime in seconds
  readonly age: number;              // current age in seconds
}
