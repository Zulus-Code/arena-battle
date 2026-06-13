// ─── Explosion System ─────────────────────────────────────────────────────────
// Creates and ticks explosion visuals and damage.

import type { ExplosionData } from '@/domain/entities/Explosion';
import { v4 as uuidv4 } from 'uuid';
import type { Vec3 } from '@/domain/types/CoreTypes';

const EXPLOSION_VISUAL_LIFETIME = 0.8; // seconds

export function createExplosion(
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
    lifetime: EXPLOSION_VISUAL_LIFETIME,
    age: 0,
  };
}

export function tickExplosion(explosion: ExplosionData, dt: number): ExplosionData {
  return { ...explosion, age: explosion.age + dt };
}

export function isExplosionExpired(explosion: ExplosionData): boolean {
  return explosion.age >= explosion.lifetime;
}

export function explosionProgress(explosion: ExplosionData): number {
  return Math.min(1, explosion.age / explosion.lifetime);
}
