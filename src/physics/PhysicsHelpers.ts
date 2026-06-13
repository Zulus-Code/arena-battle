// ─── Pure Physics Helpers ─────────────────────────────────────────────────────
// No dependencies on Three.js or Rapier. Operates on Vec3 from CoreTypes.

import type { Vec3 } from '@/domain/types/CoreTypes';

// ─── 2D Distance (XZ plane) ──────────────────────────────────────────────────

export function distanceSquared2D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function distance2D(a: Vec3, b: Vec3): number {
  return Math.sqrt(distanceSquared2D(a, b));
}

// ─── Circle-Circle Overlap ──────────────────────────────────────────────────

export function circlesOverlap(
  posA: Vec3, radiusA: number,
  posB: Vec3, radiusB: number,
): boolean {
  return distanceSquared2D(posA, posB) < (radiusA + radiusB) ** 2;
}

// ─── AABB Types & Overlap ────────────────────────────────────────────────────

export interface AABB {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX
      && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

// ─── Circle vs AABB ─────────────────────────────────────────────────────────

export function circleRectOverlap(
  pos: Vec3, radius: number,
  rect: AABB,
): boolean {
  const closestX = Math.max(rect.minX, Math.min(pos.x, rect.maxX));
  const closestZ = Math.max(rect.minZ, Math.min(pos.z, rect.maxZ));
  const dx = pos.x - closestX;
  const dz = pos.z - closestZ;
  return dx * dx + dz * dz < radius * radius;
}
