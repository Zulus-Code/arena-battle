// ─── Collision Service ────────────────────────────────────────────────────────
// Pure collision detection functions. No side effects.

import type { ProjectileData } from '@/domain/entities/Projectile';
import type { PickupData } from '@/domain/entities/Pickup';
import type { ObstacleData } from '@/domain/entities/Arena';

/** Check if two circles on the XZ plane overlap */
export function checkCircleCollision(
  x1: number, z1: number, r1: number,
  x2: number, z2: number, r2: number,
): boolean {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const distSq = dx * dx + dz * dz;
  const radiiSum = r1 + r2;
  return distSq <= radiiSum * radiiSum;
}

/** Check if a projectile hits a circular entity at (ex, ez) */
export function checkProjectileEntityHit(
  proj: ProjectileData,
  ex: number,
  ez: number,
  entityRadius: number,
): boolean {
  return checkCircleCollision(
    proj.position.x, proj.position.z, proj.radius,
    ex, ez, entityRadius,
  );
}

/** Check if an entity overlaps with a pickup */
export function checkEntityPickupCollision(
  ex: number,
  ez: number,
  entityRadius: number,
  pickup: PickupData,
  pickupRadius: number = 0.5,
): boolean {
  if (!pickup.active) return false;
  return checkCircleCollision(
    ex, ez, entityRadius,
    pickup.position.x, pickup.position.z, pickupRadius,
  );
}

/** Check if a projectile overlaps an axis-aligned obstacle (AABB) */
export function checkProjectileObstacleHit(
  proj: ProjectileData,
  obstacle: ObstacleData,
): boolean {
  const hx = obstacle.size.x / 2;
  const hz = obstacle.size.z / 2;
  const ox = obstacle.position.x;
  const oz = obstacle.position.z;
  const cx = proj.position.x;
  const cz = proj.position.z;
  const r = proj.radius;

  const closestX = Math.max(ox - hx, Math.min(cx, ox + hx));
  const closestZ = Math.max(oz - hz, Math.min(cz, oz + hz));
  const dx = cx - closestX;
  const dz = cz - closestZ;
  return dx * dx + dz * dz < r * r;
}
