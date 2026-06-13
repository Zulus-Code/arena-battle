// ─── Arena Entity ─────────────────────────────────────────────────────────────
// Describes the physical layout of the battle arena.

import type { Vec3 } from '@/domain/types/CoreTypes';

export interface ObstacleData {
  readonly id: string;
  readonly position: Vec3;
  readonly size: Vec3;
  readonly rotation: number;
  readonly destructible: boolean;
  readonly hp: number;
  readonly maxHp: number;
}

export interface ArenaData {
  readonly width: number;
  readonly depth: number;
  readonly wallThickness: number;
  readonly obstacles: readonly ObstacleData[];
}
