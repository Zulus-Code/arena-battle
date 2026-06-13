// ─── Combat System ────────────────────────────────────────────────────────────
// Handles shooting logic, hit detection between projectiles and entities.

import type { HealthData } from '@/domain/entities/Health';
import type { ShieldData } from '@/domain/entities/Shield';
import type { PlayerData } from '@/domain/entities/Player';
import type { EnemyData } from '@/domain/entities/Enemy';
import type { ProjectileData } from '@/domain/entities/Projectile';
import { calculateDamage } from '@/domain/rules/DamageRules';
import { applyDamage, isDead } from '@/domain/entities/Health';
import { isShielded } from '@/domain/entities/Shield';
import { checkProjectileHitTarget } from './ProjectileSystem';
import { eventBus } from '@/events/EventBus';

const TANK_COLLISION_RADIUS = 1.0;

export interface CombatHitResult {
  readonly hitProjectileIds: Set<string>;
  readonly updatedPlayer: PlayerData;
  readonly updatedEnemies: readonly EnemyData[];
  readonly shotsHit: number;  // number of player shots that hit enemies this frame
}

/** Unified damage application: shield-check → calculateDamage → applyDamage.
 *  Returns the new health (unchanged if shielded) and actual damage dealt. */
interface DamageResult { newHealth: HealthData; finalDamage: number; shielded: boolean }
function applyCombatDamage(health: HealthData, shield: ShieldData, baseDamage: number): DamageResult {
  const shielded = isShielded(shield);
  const { finalDamage } = calculateDamage({
    baseDamage,
    damageType: 'Kinetic',
    targetHasShield: shielded,
  });
  const newHealth = shielded ? health : applyDamage(health, finalDamage);
  return { newHealth, finalDamage, shielded };
}

export function processProjectileHits(
  projectiles: readonly ProjectileData[],
  player: PlayerData,
  enemies: readonly EnemyData[],
  blockedProjectileIds?: ReadonlySet<string>,
): CombatHitResult {
  const hitProjectileIds = new Set<string>();
  let updatedPlayer = player;
  let shotsHit = 0;
  const updatedEnemies = [...enemies];

  for (const proj of projectiles) {
    if (!proj.active || hitProjectileIds.has(proj.id)) continue;
    if (blockedProjectileIds?.has(proj.id)) {
      hitProjectileIds.add(proj.id);
      continue;
    }

    // Enemy projectiles hit player
    if (proj.faction === 'Enemy') {
      const hit = checkProjectileHitTarget(
        proj, player.position.x, player.position.z, TANK_COLLISION_RADIUS,
      );
      if (hit) {
        hitProjectileIds.add(proj.id);
        const { newHealth, finalDamage, shielded } = applyCombatDamage(player.health, player.shield, proj.damage);

        updatedPlayer = { ...updatedPlayer, health: newHealth };

        eventBus.emit({
          type: 'ProjectileHit',
          projectileId: proj.id,
          targetId: player.id,
          position: proj.position,
          damage: finalDamage,
        });

        if (!shielded) {
          eventBus.emit({
            type: 'PlayerDamaged',
            playerId: player.id,
            damage: finalDamage,
            source: { kind: 'Projectile', projectileId: proj.id, ownerId: proj.ownerId },
            position: proj.position,
            remainingHealth: newHealth.current,
          });
        }

        if (isDead(newHealth)) {
          updatedPlayer = { ...updatedPlayer, status: 'Dead' };
          eventBus.emit({
            type: 'PlayerKilled',
            playerId: player.id,
            position: player.position,
            killedBy: proj.ownerId,
          });
        }
      }
    }

    // Player projectiles hit enemies
    if (proj.faction === 'Player') {
      for (let i = 0; i < updatedEnemies.length; i++) {
        const enemy = updatedEnemies[i];
        if (enemy.status === 'Dead') continue;

        const hit = checkProjectileHitTarget(
          proj, enemy.position.x, enemy.position.z, TANK_COLLISION_RADIUS,
        );
        if (hit) {
          hitProjectileIds.add(proj.id);
          shotsHit++;
          const { newHealth, finalDamage } = applyCombatDamage(enemy.health, enemy.shield, proj.damage);
          const newStatus = isDead(newHealth) ? 'Dead' : enemy.status;
          updatedEnemies[i] = { ...enemy, health: newHealth, status: newStatus };

          eventBus.emit({
            type: 'ProjectileHit',
            projectileId: proj.id,
            targetId: enemy.id,
            position: proj.position,
            damage: finalDamage,
          });

          if (isDead(newHealth)) {
            eventBus.emit({
              type: 'EnemyKilled',
              enemyId: enemy.id,
              position: enemy.position,
              scoreReward: enemy.scoreReward,
              killedBy: proj.ownerId,
            });
          }

          break; // one projectile hits one enemy
        }
      }
    }
  }

  return {
    hitProjectileIds,
    updatedPlayer,
    updatedEnemies,
    shotsHit,
  };
}
