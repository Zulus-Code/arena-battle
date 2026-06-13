// ─── Enemy System ──────────────────────────────────────────────────────────────
// Handles enemy AI update and enemy shooting for the game loop.

import type { EnemyData } from '@/domain/entities/Enemy';
import type { PlayerData } from '@/domain/entities/Player';
import type { ProjectileData } from '@/domain/entities/Projectile';
import type { ObstacleData } from '@/domain/entities/Arena';
import type { TankCollider } from './MovementSystem';
import { updateEnemyAI, shouldEnemyFire, consumeEnemyShot } from './EnemyAISystem';
import { spawnProjectile } from './ProjectileSystem';

export interface EnemyUpdateResult {
  readonly enemies: readonly EnemyData[];
  readonly newProjectiles: readonly ProjectileData[];
}

export function updateEnemies(
  enemies: readonly EnemyData[],
  player: PlayerData,
  dt: number,
  arenaHalf: { readonly x: number; readonly z: number },
  obstacles: readonly ObstacleData[],
): EnemyUpdateResult {
  const updated = [...enemies];
  const newProjectiles: ProjectileData[] = [];

  for (let i = 0; i < updated.length; i++) {
    if (updated[i].status === 'Dead') continue;

    // Build colliders: player + all OTHER living enemies (with current positions)
    const otherTanks: TankCollider[] = [];
    otherTanks.push({ id: player.id, x: player.position.x, z: player.position.z });
    for (let j = 0; j < updated.length; j++) {
      if (j === i || updated[j].status === 'Dead') continue;
      otherTanks.push({ id: updated[j].id, x: updated[j].position.x, z: updated[j].position.z });
    }

    let enemy = updateEnemyAI(updated[i], player, dt, arenaHalf, obstacles, otherTanks);

    if (shouldEnemyFire(enemy, player, obstacles)) {
      const proj = spawnProjectile(enemy, enemy.weapon, 'Enemy');
      newProjectiles.push(proj);
      enemy = consumeEnemyShot(enemy);
    }

    updated[i] = enemy;
  }

  return { enemies: updated, newProjectiles };
}
