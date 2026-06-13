// ─── Explosion Service ────────────────────────────────────────────────────────
// Explosion creation and lifecycle management.

import type { ExplosionData } from '@/domain/entities/Explosion';
import type { Vec3 } from '@/domain/types/CoreTypes';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_EXPLOSION_LIFETIME = 0.5; // seconds

/** Create a new explosion at the given position */
export function createExplosionAt(
  position: Vec3,
  radius: number,
  damage: number,
  sourceId: string,
): ExplosionData {
  return {
    id: uuidv4(),
    position,
    radius,
    damage,
    sourceId,
    lifetime: DEFAULT_EXPLOSION_LIFETIME,
    age: 0,
  };
}

/** Advance the explosion timer by dt seconds */
export function tickExplosionTimer(explosion: ExplosionData, dt: number): ExplosionData {
  return { ...explosion, age: explosion.age + dt };
}

/** Check whether the explosion has finished its visual lifetime */
export function isExplosionFinished(explosion: ExplosionData): boolean {
  return explosion.age >= explosion.lifetime;
}
