// ─── Damage System ─────────────────────────────────────────────────────────────
// Centralized damage processing — routes through shields, applies health
// changes, and emits appropriate events for all damage sources.

import type { PlayerData } from '@/domain/entities/Player';
import type { EnemyData } from '@/domain/entities/Enemy';
import type { DamageSource } from '@/domain/types/CoreTypes';
import { calculateDamage } from '@/domain/rules/DamageRules';
import { applyDamage, isDead } from '@/domain/entities/Health';
import { isShielded } from '@/domain/entities/Shield';
import { eventBus } from '@/events/EventBus';

function isPlayerEntity(t: PlayerData | EnemyData): t is PlayerData {
  return !('faction' in t);
}

function getKilledBy(source: DamageSource): string {
  switch (source.kind) {
    case 'Projectile':  return source.ownerId;
    case 'Explosion':   return source.sourceId;
    case 'Ram':         return source.enemyId;
    case 'Environment': return 'environment';
  }
}

export function processDamage(
  target: PlayerData | EnemyData,
  damage: number,
  source: DamageSource,
): { target: PlayerData | EnemyData; killed: boolean } {
  const shielded = isShielded(target.shield);
  const { finalDamage } = calculateDamage({
    baseDamage: damage, damageType: 'Kinetic', targetHasShield: shielded,
  });

  let updatedTarget = target;
  const killed = !shielded && isDead(applyDamage(target.health, finalDamage));

  if (!shielded) {
    updatedTarget = { ...updatedTarget, health: applyDamage(updatedTarget.health, finalDamage) };
  }

  if (source.kind === 'Projectile') {
    eventBus.emit({
      type: 'ProjectileHit', projectileId: source.projectileId,
      targetId: updatedTarget.id, position: updatedTarget.position,
      damage: finalDamage,
    });
  }

  if (shielded) return { target: updatedTarget, killed: false };

  const killedBy = getKilledBy(source);

  if (isPlayerEntity(updatedTarget)) {
    eventBus.emit({
      type: 'PlayerDamaged', playerId: updatedTarget.id, damage: finalDamage,
      source, position: updatedTarget.position,
      remainingHealth: updatedTarget.health.current,
    });
    if (killed) {
      eventBus.emit({
        type: 'PlayerKilled', playerId: updatedTarget.id,
        position: updatedTarget.position, killedBy,
      });
    }
  } else if (killed) {
    eventBus.emit({
      type: 'EnemyKilled', enemyId: updatedTarget.id,
      position: updatedTarget.position,
      scoreReward: (updatedTarget as EnemyData).scoreReward, killedBy,
    });
  }

  return { target: updatedTarget, killed };
}
