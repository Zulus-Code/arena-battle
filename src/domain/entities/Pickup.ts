// ─── Pickup Entity ────────────────────────────────────────────────────────────

import type { EntityId, Vec3 } from '@/domain/types/CoreTypes';

export type PickupType = 'Health' | 'Shield' | 'Ammo' | 'SpeedBoost' | 'RapidFire';

export interface PickupData {
  readonly id: EntityId;
  readonly type: PickupType;
  readonly position: Vec3;
  readonly active: boolean;
  readonly respawnTimer: number;     // seconds until respawn (0 = active)
  readonly value: number;            // amount healed / shield duration / etc.
}
