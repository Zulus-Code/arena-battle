// ─── Target Service ───────────────────────────────────────────────────────────
// Target selection helpers. All pure functions, no side effects.

import type { PlayerData } from '@/domain/entities/Player';
import type { EnemyData } from '@/domain/entities/Enemy';
import type { Vec3 } from '@/domain/types/CoreTypes';

type PositionedEntity = { readonly position: Vec3; readonly status: string };
type TargetEntity = PlayerData | EnemyData;

/** Find the nearest alive enemy to the player within an optional range */
export function findNearestEnemy(
  player: PlayerData,
  enemies: readonly EnemyData[],
  range?: number,
): EnemyData | null {
  let nearest: EnemyData | null = null;
  let bestDist = range ?? Infinity;

  for (const enemy of enemies) {
    if (enemy.status !== 'Alive') continue;
    const dx = enemy.position.x - player.position.x;
    const dz = enemy.position.z - player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= bestDist) {
      nearest = enemy;
      bestDist = dist;
    }
  }

  return nearest;
}

/** Find the closest alive target within range of an entity */
export function findTargetInRange(
  entity: PositionedEntity,
  targets: readonly TargetEntity[],
  range: number,
): TargetEntity | null {
  let closest: TargetEntity | null = null;
  let bestDist = range;

  for (const target of targets) {
    if (target.status !== 'Alive') continue;
    const dx = target.position.x - entity.position.x;
    const dz = target.position.z - entity.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= bestDist) {
      closest = target;
      bestDist = dist;
    }
  }

  return closest;
}

/** Count how many enemies are still alive */
export function countAliveEnemies(enemies: readonly EnemyData[]): number {
  let count = 0;
  for (const enemy of enemies) {
    if (enemy.status === 'Alive') count++;
  }
  return count;
}
