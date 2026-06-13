// ─── Enemy System ──────────────────────────────────────────────────────────────
// Enemy lifecycle: spawning, death marking, cleanup, counting.

import type { EnemyData, EnemyType } from '@/domain/entities/Enemy';
import type { Vec3 } from '@/domain/types/CoreTypes';
import type { LevelConfig } from '@/config/LevelConfig';
import { ENEMY_CONFIGS } from '@/config/EnemyConfig';
import { WEAPON_CONFIGS } from '@/config/WeaponConfig';
import { createHealth } from '@/domain/entities/Health';
import { createShield } from '@/domain/entities/Shield';
import { createWeapon } from '@/domain/entities/Weapon';
import { eventBus } from '@/events/EventBus';
import { v4 as uuidv4 } from 'uuid';

export function spawnEnemy(type: EnemyType, position: Vec3, _config: LevelConfig): EnemyData {
  const enemyConfig = ENEMY_CONFIGS[type];
  const weaponConfig = WEAPON_CONFIGS[enemyConfig.weaponId];
  const id = uuidv4();

  const enemy: EnemyData = {
    id, type, faction: 'Enemy',
    position: { x: position.x, y: 0.5, z: position.z },
    rotation: 0, velocity: { x: 0, y: 0, z: 0 },
    health: createHealth(enemyConfig.maxHealth),
    shield: createShield(),
    weapon: createWeapon(weaponConfig),
    status: 'Alive', aiState: 'SEARCH', aiTimer: 0, targetId: null,
    speed: enemyConfig.speed,
    turnSpeed: enemyConfig.turnSpeed,
    detectionRange: enemyConfig.detectionRange,
    attackRange: enemyConfig.attackRange,
    scoreReward: enemyConfig.scoreReward,
    isBoss: enemyConfig.isBoss,
  };

  eventBus.emit({ type: 'EnemySpawned', enemyId: id, position: enemy.position, enemyType: type });
  return enemy;
}

export function markEnemyDead(enemy: EnemyData): EnemyData {
  if (enemy.status === 'Dead') return enemy;

  const updated: EnemyData = {
    ...enemy,
    status: 'Dead',
    aiState: 'DEAD',
  };

  eventBus.emit({
    type: 'EnemyKilled',
    enemyId: enemy.id,
    position: enemy.position,
    scoreReward: enemy.scoreReward,
    killedBy: '',
  });

  return updated;
}

export function removeDeadEnemies(enemies: readonly EnemyData[]): EnemyData[] {
  return enemies.filter((e) => e.status !== 'Dead');
}

export function countAlive(enemies: readonly EnemyData[]): number {
  return enemies.filter((e) => e.status !== 'Dead').length;
}
