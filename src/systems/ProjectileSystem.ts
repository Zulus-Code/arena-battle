// ─── Projectile System ────────────────────────────────────────────────────────
// Creates, moves, and expires projectiles.

import type { ProjectileData } from '@/domain/entities/Projectile';
import type { PlayerData } from '@/domain/entities/Player';
import type { EnemyData } from '@/domain/entities/Enemy';
import type { WeaponData } from '@/domain/entities/Weapon';
import type { Faction } from '@/domain/types/CoreTypes';
import { v4 as uuidv4 } from 'uuid';

const PROJECTILE_LIFETIME = 4.0; // seconds

export function spawnProjectile(
  owner: PlayerData | EnemyData,
  weapon: WeaponData,
  faction: Faction,
): ProjectileData {
  const angle = owner.rotation;
  const speed = weapon.projectileSpeed;

  return {
    id: uuidv4(),
    ownerId: owner.id,
    faction,
    position: {
      x: owner.position.x + Math.sin(angle) * 1.2,
      y: owner.position.y,
      z: owner.position.z + Math.cos(angle) * 1.2,
    },
    velocity: {
      x: Math.sin(angle) * speed,
      y: 0,
      z: Math.cos(angle) * speed,
    },
    damage: weapon.damage,
    radius: weapon.projectileRadius,
    splashRadius: weapon.splashRadius,
    lifetime: PROJECTILE_LIFETIME,
    color: weapon.color,
    active: true,
  };
}

export function tickProjectile(proj: ProjectileData, dt: number): ProjectileData {
  return {
    ...proj,
    position: {
      x: proj.position.x + proj.velocity.x * dt,
      y: proj.position.y,
      z: proj.position.z + proj.velocity.z * dt,
    },
    lifetime: proj.lifetime - dt,
    active: proj.lifetime - dt > 0,
  };
}

export function isProjectileExpired(proj: ProjectileData): boolean {
  return !proj.active || proj.lifetime <= 0;
}

export function isOutOfBounds(proj: ProjectileData, halfW: number, halfD: number): boolean {
  return (
    proj.position.x < -halfW ||
    proj.position.x > halfW ||
    proj.position.z < -halfD ||
    proj.position.z > halfD
  );
}

export function checkProjectileHitTarget(
  proj: ProjectileData,
  targetX: number,
  targetZ: number,
  targetRadius: number,
): boolean {
  const dx = proj.position.x - targetX;
  const dz = proj.position.z - targetZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist < proj.radius + targetRadius;
}
