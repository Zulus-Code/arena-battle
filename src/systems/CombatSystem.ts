// ─── Combat System ────────────────────────────────────────────────────────────
// Handles shooting logic, hit detection between projectiles and entities.

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
}

export function processProjectileHits(
  projectiles: readonly ProjectileData[],
  player: PlayerData,
  enemies: readonly EnemyData[],
): CombatHitResult {
  const hitProjectileIds = new Set<string>();
  let updatedPlayer = player;
  const updatedEnemies = [...enemies];

  for (const proj of projectiles) {
    if (!proj.active || hitProjectileIds.has(proj.id)) continue;

    // Enemy projectiles hit player
    if (proj.faction === 'Enemy') {
      const hit = checkProjectileHitTarget(
        proj, player.position.x, player.position.z, TANK_COLLISION_RADIUS,
      );
      if (hit) {
        hitProjectileIds.add(proj.id);
        const shielded = isShielded(player.shield);
        const { finalDamage } = calculateDamage({
          baseDamage: proj.damage,
          damageType: 'Kinetic',
          targetHasShield: shielded,
        });

        if (!shielded) {
          updatedPlayer = {
            ...updatedPlayer,
            health: applyDamage(updatedPlayer.health, finalDamage),
          };
        }

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
            remainingHealth: updatedPlayer.health.current,
          });
        }

        if (isDead(updatedPlayer.health)) {
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
          const shielded = isShielded(enemy.shield);
          const { finalDamage } = calculateDamage({
            baseDamage: proj.damage,
            damageType: 'Kinetic',
            targetHasShield: shielded,
          });

          const newHealth = shielded ? enemy.health : applyDamage(enemy.health, finalDamage);
          const newStatus = isDead(newHealth) ? 'Dead' : enemy.status;
          updatedEnemies[i] = { ...enemy, health: newHealth, status: newStatus };

          eventBus.emit({
            type: 'ProjectileHit',
            projectileId: proj.id,
            targetId: enemy.id,
            position: proj.position,
            damage: finalDamage,
          });

          const wasAlive = (enemy.status as string) !== 'Dead';
          if (isDead(newHealth) && wasAlive) {
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
  };
}
