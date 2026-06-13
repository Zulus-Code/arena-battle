// ─── Enemy AI System ──────────────────────────────────────────────────────────
// State-machine driven AI. Each state has its own behavior function.
// No large if-else chains — dispatch by state name.

import type { EnemyData, EnemyAIState } from '@/domain/entities/Enemy';
import type { PlayerData } from '@/domain/entities/Player';
import type { ObstacleData } from '@/domain/entities/Arena';
import type { TankCollider } from './MovementSystem';
import { applyEnemyMovement, circleOverlapsAABB } from './MovementSystem';
import { canFire, fireWeapon, tickWeapon, reloadAmmo } from '@/domain/entities/Weapon';

// Module-level state updated each tick
const CTX = { arenaHalf: { x: 20, z: 20 }, obstacles: [] as readonly ObstacleData[], tankColliders: [] as readonly TankCollider[] };

// ─── State Behaviors ──────────────────────────────────────────────────────────

function behaveIdle(enemy: EnemyData, player: PlayerData, dt: number): EnemyData {
  const dist = distToPlayer(enemy, player);
  if (dist < enemy.detectionRange) return transitionTo(enemy, 'CHASE');
  return applyEnemyMovement(enemy, 0, 0.3, dt, CTX.arenaHalf, CTX.obstacles);
}

function behaveChase(enemy: EnemyData, player: PlayerData, dt: number): EnemyData {
  const dist = distToPlayer(enemy, player);
  if (dist < enemy.attackRange) return transitionTo(enemy, 'ATTACK');
  if (dist > enemy.detectionRange * 1.5) return transitionTo(enemy, 'IDLE');
  if (enemy.health.current / enemy.health.max < 0.25) return transitionTo(enemy, 'RETREAT');
  const turn = steerToward(enemy, player.position.x, player.position.z);
  return applyEnemyMovement(enemy, 1, turn, dt, CTX.arenaHalf, CTX.obstacles);
}

function behaveAttack(enemy: EnemyData, player: PlayerData, dt: number): EnemyData {
  const dist = distToPlayer(enemy, player);
  if (dist > enemy.attackRange * 1.3) return transitionTo(enemy, 'CHASE');
  const turn = steerToward(enemy, player.position.x, player.position.z);
  return applyEnemyMovement(enemy, 0.2, turn, dt, CTX.arenaHalf, CTX.obstacles);
}

function behaveRetreat(enemy: EnemyData, player: PlayerData, dt: number): EnemyData {
  if (enemy.health.current / enemy.health.max > 0.5) return transitionTo(enemy, 'CHASE');
  const turn = steerToward(enemy, player.position.x, player.position.z);
  return applyEnemyMovement(enemy, 1, -turn, dt, CTX.arenaHalf, CTX.obstacles);
}

function behaveSearch(enemy: EnemyData, player: PlayerData, dt: number): EnemyData {
  const dist = distToPlayer(enemy, player);
  if (dist < enemy.detectionRange) return transitionTo(enemy, 'CHASE');
  const timerBased = Math.sin(enemy.aiTimer * 1.5) * 0.8;
  return applyEnemyMovement(enemy, 0.7, timerBased, dt, CTX.arenaHalf, CTX.obstacles);
}

// ─── State Dispatch Table ─────────────────────────────────────────────────────

type StateBehavior = (enemy: EnemyData, player: PlayerData, dt: number) => EnemyData;

const STATE_BEHAVIORS: Readonly<Record<EnemyAIState, StateBehavior>> = {
  IDLE:    behaveIdle,
  SEARCH:  behaveSearch,
  CHASE:   behaveChase,
  ATTACK:  behaveAttack,
  RETREAT: behaveRetreat,
  RAM:     behaveChase,
  PICKUP:  behaveChase,
  DEAD:    (e) => e,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function updateEnemyAI(
  enemy: EnemyData,
  player: PlayerData,
  dt: number,
  arenaHalf: { x: number; z: number },
  obstacles: readonly ObstacleData[],
  tankColliders: readonly TankCollider[] = [],
): EnemyData {
  if (enemy.status === 'Dead') return enemy;

  CTX.arenaHalf = arenaHalf;
  CTX.obstacles = obstacles;
  CTX.tankColliders = tankColliders;

  const behavior = STATE_BEHAVIORS[enemy.aiState];
  let updated = behavior(enemy, player, dt);

  // Auto-reload when out of ammo and weapon is cooled down
  if (updated.weapon.ammo <= 0 && updated.weapon.cooldown <= 0) {
    updated = { ...updated, weapon: reloadAmmo(updated.weapon) };
  }

  updated = { ...updated, weapon: tickWeapon(updated.weapon, dt) };
  updated = { ...updated, aiTimer: updated.aiTimer + dt };

  return updated;
}

export function shouldEnemyFire(
  enemy: EnemyData,
  player: PlayerData,
  obstacles: readonly ObstacleData[],
): boolean {
  if (enemy.status === 'Dead') return false;
  if (enemy.aiState !== 'ATTACK') return false;
  if (!canFire(enemy.weapon)) return false;
  const dist = distToPlayer(enemy, player);
  if (dist > enemy.attackRange) return false;
  const aimAngle = Math.atan2(player.position.x - enemy.position.x, player.position.z - enemy.position.z);
  const diff = Math.abs(normalizeAngle(aimAngle - enemy.rotation));
  if (diff >= 0.4) return false;

  // Line-of-sight check
  if (!hasLineOfSight(enemy.position.x, enemy.position.z, player.position.x, player.position.z, obstacles)) {
    return false;
  }

  return true;
}

/** Check if there's a direct line of sight between two positions (no obstacles in the way). */
function hasLineOfSight(
  fromX: number, fromZ: number,
  toX: number, toZ: number,
  obstacles: readonly ObstacleData[],
): boolean {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.1) return true;

  // Sample along the line
  const steps = Math.max(3, Math.ceil(dist / 1.5));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = fromX + dx * t;
    const pz = fromZ + dz * t;
    for (const obs of obstacles) {
      if (obs.hp <= 0) continue;
      if (circleOverlapsAABB(px, pz, 0.3, obs)) return false;
    }
  }
  return true;
}

export function consumeEnemyShot(enemy: EnemyData): EnemyData {
  return { ...enemy, weapon: fireWeapon(enemy.weapon) };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distToPlayer(enemy: EnemyData, player: PlayerData): number {
  const dx = player.position.x - enemy.position.x;
  const dz = player.position.z - enemy.position.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function steerToward(enemy: EnemyData, tx: number, tz: number): number {
  const desiredAngle = Math.atan2(tx - enemy.position.x, tz - enemy.position.z);
  const diff = normalizeAngle(desiredAngle - enemy.rotation);
  return Math.sign(diff) * Math.min(1, Math.abs(diff) * 2);
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function transitionTo(enemy: EnemyData, state: EnemyAIState): EnemyData {
  if (enemy.aiState === state) return enemy;
  return { ...enemy, aiState: state, aiTimer: 0 };
}
