// ─── Spawn Service ────────────────────────────────────────────────────────────
// Entity spawning logic for enemies and pickups.

import type { EnemyData } from '@/domain/entities/Enemy';
import type { PickupData } from '@/domain/entities/Pickup';
import type { LevelConfig, EnemySpawnConfig } from '@/config/LevelConfig';
import type { ObstacleData } from '@/domain/entities/Arena';
import type { Vec3 } from '@/domain/types/CoreTypes';
import { createHealth } from '@/domain/entities/Health';
import { createShield } from '@/domain/entities/Shield';
import { createWeapon } from '@/domain/entities/Weapon';
import { ENEMY_CONFIGS } from '@/config/EnemyConfig';
import { WEAPON_CONFIGS } from '@/config/WeaponConfig';
import { PICKUP_CONFIGS } from '@/config/PickupConfig';
import { randomService } from '@/core/RandomService';
import { v4 as uuidv4 } from 'uuid';

/** Try up to N random positions inside arena (with wall margin) that don't overlap obstacles */
const MAX_SPAWN_ATTEMPTS = 20;
const SPAWN_MARGIN = 3;

function findValidPosition(
  arenaHalf: { x: number; z: number },
  obstacles: readonly ObstacleData[],
  radius: number,
  excludePositions: readonly { x: number; z: number }[] = [],
): { x: number; z: number } {
  for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt++) {
    const x = randomService.range(-arenaHalf.x + SPAWN_MARGIN, arenaHalf.x - SPAWN_MARGIN);
    const z = randomService.range(-arenaHalf.z + SPAWN_MARGIN, arenaHalf.z - SPAWN_MARGIN);
    const inBounds = Math.abs(x) < arenaHalf.x - radius && Math.abs(z) < arenaHalf.z - radius;
    if (!inBounds) continue;
    if (overlapsAnyObstacle(x, z, radius, obstacles)) continue;

    // Check against already-placed enemies (radius * 2 for tank-tank margin)
    let tooClose = false;
    for (const ep of excludePositions) {
      const dx = x - ep.x;
      const dz = z - ep.z;
      if (dx * dx + dz * dz < (radius * 2) * (radius * 2)) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    return { x, z };
  }
  return { x: 0, z: 0 }; // fallback — center
}

/** Generate enemy entities from ONE wave config. */
export function spawnWave(
  wave: EnemySpawnConfig,
  arenaHalf: { readonly x: number; readonly z: number },
  obstacles: readonly ObstacleData[],
  placedPositions: { x: number; z: number }[],
): readonly EnemyData[] {
  const enemies: EnemyData[] = [];
  for (let i = 0; i < wave.count; i++) {
    const enemyCfg = ENEMY_CONFIGS[wave.type];
    const { x, z } = findValidPosition(
      { x: arenaHalf.x, z: arenaHalf.z },
      obstacles,
      1,
      placedPositions,
    );
    const pos: Vec3 = { x, y: 0.5, z };
    placedPositions.push({ x, z });
    const weaponCfg = WEAPON_CONFIGS[enemyCfg.weaponId];

    enemies.push({
      id: uuidv4(),
      type: wave.type,
      faction: 'Enemy',
      position: pos,
      rotation: randomService.range(0, Math.PI * 2),
      velocity: { x: 0, y: 0, z: 0 },
      health: createHealth(enemyCfg.maxHealth),
      shield: createShield(),
      weapon: createWeapon(weaponCfg),
      status: 'Alive',
      aiState: 'IDLE',
      aiTimer: 0,
      targetId: null,
      speed: enemyCfg.speed,
      turnSpeed: enemyCfg.turnSpeed,
      detectionRange: enemyCfg.detectionRange,
      attackRange: enemyCfg.attackRange,
      scoreReward: enemyCfg.scoreReward,
      isBoss: enemyCfg.isBoss,
    });
  }
  return enemies;
}

/** Generate enemy entities from ALL wave configs at once (no delay). */
export function spawnEnemies(
  config: LevelConfig,
  arenaHalf: { readonly x: number; readonly z: number },
  _playerId: string,
  obstacles: readonly ObstacleData[],
): readonly EnemyData[] {
  const enemies: EnemyData[] = [];
  const placedPositions: { x: number; z: number }[] = [];

  for (const wave of config.enemyWaves) {
    enemies.push(...spawnWave(wave, arenaHalf, obstacles, placedPositions));
  }

  return enemies;
}

/** Count how many enemies are still alive */
export function countAlive(enemies: readonly EnemyData[]): number {
  return enemies.filter((e) => e.status !== 'Dead').length;
}

/** Check if a circle at (cx,cz) with given radius overlaps an AABB obstacle */
function circleOverlapsObstacle(cx: number, cz: number, radius: number, obs: ObstacleData): boolean {
  const hx = obs.size.x / 2;
  const hz = obs.size.z / 2;
  const ox = obs.position.x;
  const oz = obs.position.z;
  const closestX = Math.max(ox - hx, Math.min(cx, ox + hx));
  const closestZ = Math.max(oz - hz, Math.min(cz, oz + hz));
  const dx = cx - closestX;
  const dz = cz - closestZ;
  return dx * dx + dz * dz < radius * radius;
}

/** Check if a circle overlaps any obstacle */
function overlapsAnyObstacle(cx: number, cz: number, radius: number, obstacles: readonly ObstacleData[]): boolean {
  for (const obs of obstacles) {
    if (circleOverlapsObstacle(cx, cz, radius, obs)) return true;
  }
  return false;
}

/** Try to place a position near (desiredX, desiredZ) that doesn't overlap obstacles or walls */
function findNearbyValidPosition(
  desiredX: number, desiredZ: number, radius: number,
  obstacles: readonly ObstacleData[],
  arenaHalf: { x: number; z: number },
): { x: number; z: number } {
  // If desired position is valid, use it
  const inBounds = Math.abs(desiredX) < arenaHalf.x - radius && Math.abs(desiredZ) < arenaHalf.z - radius;
  if (inBounds && !overlapsAnyObstacle(desiredX, desiredZ, radius, obstacles)) {
    return { x: desiredX, z: desiredZ };
  }

  // Try offsets in concentric rings
  const offsets: [number, number][] = [
    [0, 2], [0, -2], [2, 0], [-2, 0],
    [2, 2], [-2, 2], [2, -2], [-2, -2],
    [0, 4], [0, -4], [4, 0], [-4, 0],
    [4, 4], [-4, 4], [4, -4], [-4, -4],
  ];

  for (const [dx, dz] of offsets) {
    const nx = desiredX + dx;
    const nz = desiredZ + dz;
    if (Math.abs(nx) > arenaHalf.x - radius || Math.abs(nz) > arenaHalf.z - radius) continue;
    if (!overlapsAnyObstacle(nx, nz, radius, obstacles)) {
      return { x: nx, z: nz };
    }
  }

  return { x: 0, z: 0 }; // fallback — center
}

/** Generate pickup entities from level config. Each pickup has a fixed position. */
export function spawnPickups(
  config: LevelConfig,
  obstacles: readonly ObstacleData[],
  arenaHalf: { x: number; z: number },
): readonly PickupData[] {
  const pickups: PickupData[] = [];

  for (const spawn of config.pickups) {
    const pickupCfg = PICKUP_CONFIGS[spawn.type];
    const { x, z } = findNearbyValidPosition(spawn.position.x, spawn.position.z, 1, obstacles, arenaHalf);

    pickups.push({
      id: uuidv4(),
      type: spawn.type,
      position: { x, y: 0.5, z },
      active: true,
      respawnTimer: 0,
      value: pickupCfg.value,
    });
  }

  return pickups;
}
