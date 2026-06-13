// ─── Damage Service ──────────────────────────────────────────────────────────
// Wraps DamageRules with event emission. All damage application goes through here.

import type { PlayerData } from '@/domain/entities/Player';
import type { EnemyData } from '@/domain/entities/Enemy';
import type { ProjectileData } from '@/domain/entities/Projectile';
import type { ExplosionData } from '@/domain/entities/Explosion';
import type { DamageSource } from '@/domain/types/CoreTypes';
import { calculateDamage, type DamageContext } from '@/domain/rules/DamageRules';
import { applyDamage, isDead } from '@/domain/entities/Health';
import { isShielded } from '@/domain/entities/Shield';
import { eventBus } from '@/events/EventBus';

type DamageTarget = PlayerData | EnemyData;

function isPlayer(target: DamageTarget): target is PlayerData {
  return 'score' in target;
}

function applyDamageAndEmit(
  target: DamageTarget,
  baseDamage: number,
  damageType: DamageContext['damageType'],
  source: DamageSource,
  killedBy: string,
  distanceFromExplosion?: number,
  explosionRadius?: number,
): { target: DamageTarget; killed: boolean } {
  const ctx: DamageContext = {
    baseDamage,
    damageType,
    targetHasShield: isShielded(target.shield),
    distanceFromExplosion,
    explosionRadius,
  };
  const { finalDamage } = calculateDamage(ctx);
  const newHealth = applyDamage(target.health, finalDamage);
  const newTarget = { ...target, health: newHealth } as DamageTarget;
  const killed = isDead(newHealth);
  if (isPlayer(newTarget)) {
    eventBus.emit({ type: 'PlayerDamaged', playerId: newTarget.id, damage: finalDamage, source, position: newTarget.position, remainingHealth: newHealth.current });
  } else if (killed) {
    eventBus.emit({ type: 'EnemyKilled', enemyId: newTarget.id, position: newTarget.position, scoreReward: newTarget.scoreReward, killedBy });
  }
  return { target: newTarget, killed };
}

export function applyProjectileDamage(
  target: DamageTarget,
  projectile: ProjectileData,
): { target: DamageTarget; killed: boolean } {
  const source: DamageSource = { kind: 'Projectile', projectileId: projectile.id, ownerId: projectile.ownerId };
  const result = applyDamageAndEmit(target, projectile.damage, 'Kinetic', source, projectile.ownerId);
  eventBus.emit({ type: 'ProjectileHit', projectileId: projectile.id, targetId: target.id, position: target.position, damage: projectile.damage });
  return result;
}

export function applyExplosionDamage(
  target: DamageTarget,
  explosion: ExplosionData,
  distFromCenter: number,
): { target: DamageTarget; killed: boolean } {
  const source: DamageSource = { kind: 'Explosion', sourceId: explosion.sourceId };
  return applyDamageAndEmit(target, explosion.damage, 'Explosive', source, explosion.sourceId, distFromCenter, explosion.radius);
}
