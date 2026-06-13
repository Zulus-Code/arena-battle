// ─── Movement System ──────────────────────────────────────────────────────────
// Updates entity positions with obstacle collision + slide along walls.
// No rendering. No physics engine dependency.

import type { PlayerData } from '@/domain/entities/Player';
import type { EnemyData } from '@/domain/entities/Enemy';
import type { ObstacleData } from '@/domain/entities/Arena';
import type { MoveCommand } from '@/commands/MoveCommand';

export interface TankCollider {
  readonly id: string;
  readonly x: number;
  readonly z: number;
}

const TANK_RADIUS = 0.8;

// ─── Input smoothing (acceleration/deceleration) ─────────────────────────────
// Prevents instant speed/rotation changes for smoother movement.

const FORWARD_ACCEL = 10;   // 0→1 in ~0.1s
const FORWARD_DECEL = 14;   // 1→0 in ~0.07s (brake faster than accelerate)
const TURN_ACCEL = 8;       // 0→1 in ~0.125s

interface SmoothState {
  forwardSpeed: number;
  turnSpeed: number;
}

const smoothStates = new Map<string, SmoothState>();

function getSmoothState(id: string): SmoothState {
  let s = smoothStates.get(id);
  if (!s) {
    s = { forwardSpeed: 0, turnSpeed: 0 };
    smoothStates.set(id, s);
  }
  return s;
}

function smoothTowards(current: number, target: number, accel: number, decel: number, dt: number): number {
  if (Math.abs(current - target) < 0.001) return target;
  const step = (Math.abs(target) > Math.abs(current) ? accel : decel) * dt;
  if (Math.abs(target - current) < step) return target;
  return current + Math.sign(target - current) * step;
}

/** Clear all smoothing state (call on level restart) */
export function resetSmoothing(): void {
  smoothStates.clear();
}

// ─── Public ───────────────────────────────────────────────────────────────────

export function applyPlayerMovement(
  player: PlayerData,
  cmd: MoveCommand,
  dt: number,
  arenaHalf: { x: number; z: number },
  obstacles: readonly ObstacleData[],
  tankColliders: readonly TankCollider[] = [],
): PlayerData {
  const s = getSmoothState(player.id);

  // Smooth forward speed
  s.forwardSpeed = smoothTowards(s.forwardSpeed, cmd.forward, FORWARD_ACCEL, FORWARD_DECEL, dt);

  // Smooth turn rate
  s.turnSpeed = smoothTowards(s.turnSpeed, cmd.turn, TURN_ACCEL, TURN_ACCEL, dt);

  const newRotation = player.rotation + s.turnSpeed * player.turnSpeed * dt;
  const dx = Math.sin(newRotation) * s.forwardSpeed * player.speed * dt;
  const dz = Math.cos(newRotation) * s.forwardSpeed * player.speed * dt;

  const { x: nx, z: nz } = slideMove(player.position.x, player.position.z, dx, dz, TANK_RADIUS, obstacles, arenaHalf, tankColliders, player.id);

  return {
    ...player,
    rotation: newRotation,
    position: { x: nx, y: player.position.y, z: nz },
    velocity: { x: dx / dt, y: 0, z: dz / dt },
  };
}

export function applyEnemyMovement(
  enemy: EnemyData,
  forward: number,
  turn: number,
  dt: number,
  arenaHalf: { x: number; z: number },
  obstacles: readonly ObstacleData[],
  tankColliders: readonly TankCollider[] = [],
): EnemyData {
  const s = getSmoothState(enemy.id);

  // Smooth forward speed (enemies use different accel for responsiveness)
  s.forwardSpeed = smoothTowards(s.forwardSpeed, forward, FORWARD_ACCEL * 1.5, FORWARD_DECEL * 1.5, dt);
  s.turnSpeed = smoothTowards(s.turnSpeed, turn, TURN_ACCEL * 2, TURN_ACCEL * 2, dt);

  const newRotation = enemy.rotation + s.turnSpeed * enemy.turnSpeed * dt;
  const dx = Math.sin(newRotation) * s.forwardSpeed * enemy.speed * dt;
  const dz = Math.cos(newRotation) * s.forwardSpeed * enemy.speed * dt;

  const { x: nx, z: nz } = slideMove(enemy.position.x, enemy.position.z, dx, dz, TANK_RADIUS, obstacles, arenaHalf, tankColliders, enemy.id);

  return {
    ...enemy,
    rotation: newRotation,
    position: { x: nx, y: enemy.position.y, z: nz },
    velocity: { x: dx / dt, y: 0, z: dz / dt },
  };
}

// ─── Slide movement with obstacle collision ───────────────────────────────────

const MIN_TANK_DIST = (TANK_RADIUS + TANK_RADIUS); // 1.6

function slideMove(
  px: number,
  pz: number,
  dx: number,
  dz: number,
  radius: number,
  obstacles: readonly ObstacleData[],
  arenaHalf: { x: number; z: number },
  tankColliders: readonly TankCollider[] = [],
  selfId?: string,
): { x: number; z: number } {
  // Helper to check if a position is valid
  const valid = (nx: number, nz: number) =>
    !collidesWithAny(nx, nz, radius, obstacles, arenaHalf, tankColliders, selfId, px, pz);

  // 1. Try full move
  if (valid(px + dx, pz + dz)) {
    return { x: px + dx, z: pz + dz };
  }

  // 2. Try moving only on X axis
  if (valid(px + dx, pz)) {
    return { x: px + dx, z: pz };
  }

  // 3. Try moving only on Z axis
  if (valid(px, pz + dz)) {
    return { x: px, z: pz + dz };
  }

  // 4. Try diagonal slides (for better flow around tanks)
  const diagonalChecks: [number, number][] = [
    [dx, 0.5 * dz],
    [0.5 * dx, dz],
    [dx, -0.5 * dz],
    [-0.5 * dx, dz],
  ];
  for (const [sdx, sdz] of diagonalChecks) {
    if (valid(px + sdx, pz + sdz)) {
      return { x: px + sdx, z: pz + sdz };
    }
  }

  // 5. If currently overlapping any tank, allow small push-apart
  const pushApart = tryPushApart(px, pz, radius, tankColliders, selfId, obstacles, arenaHalf);
  if (pushApart) return pushApart;

  // 6. Can't move at all
  return { x: px, z: pz };
}

/** Try to push out of overlapping tanks by moving directly away from nearest one */
function tryPushApart(
  px: number, pz: number, radius: number,
  tankColliders: readonly TankCollider[], selfId: string | undefined,
  obstacles: readonly ObstacleData[], arenaHalf: { x: number; z: number },
): { x: number; z: number } | null {
  const minDistSq = MIN_TANK_DIST * MIN_TANK_DIST;
  for (const tc of tankColliders) {
    if (tc.id === selfId) continue;
    const dx = px - tc.x;
    const dz = pz - tc.z;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDistSq) continue;

    const dist = Math.sqrt(distSq);
    if (dist < 0.001) return null; // exactly on same spot — can't resolve
    const pushDist = MIN_TANK_DIST - dist + 0.05; // push just enough + tiny margin
    const nx = px + (dx / dist) * pushDist;
    const nz = pz + (dz / dist) * pushDist;

    // Verify pushed position doesn't hit obstacles, walls, or other tanks
    if (!collidesWithAny(nx, nz, radius, obstacles, arenaHalf, tankColliders, selfId, px, pz)) {
      return { x: nx, z: nz };
    }
    return null; // push failed — better to stay put
  }
  return null;
}

// ─── AABB-vs-circle collision check ───────────────────────────────────────────

function collidesWithAny(
  x: number,
  z: number,
  radius: number,
  obstacles: readonly ObstacleData[],
  arenaHalf: { x: number; z: number },
  tankColliders: readonly TankCollider[] = [],
  selfId?: string,
  currentX?: number,
  currentZ?: number,
): boolean {
  // Arena bounds check
  if (x < -arenaHalf.x + radius || x > arenaHalf.x - radius ||
      z < -arenaHalf.z + radius || z > arenaHalf.z - radius) {
    return true;
  }

  // Obstacle overlap check (skip destroyed)
  for (const obs of obstacles) {
    if (obs.hp <= 0) continue;
    if (circleOverlapsAABB(x, z, radius, obs)) return true;
  }

  // Tank-tank collision check (overlap-aware)
  const minDistSq = (radius + TANK_RADIUS) * (radius + TANK_RADIUS);
  for (const tc of tankColliders) {
    if (tc.id === selfId) continue;
    const newDx = x - tc.x;
    const newDz = z - tc.z;
    const newDistSq = newDx * newDx + newDz * newDz;

    // Not overlapping → no collision
    if (newDistSq >= minDistSq) continue;

    // Already overlapping at current position?
    if (currentX !== undefined && currentZ !== undefined) {
      const currDx = currentX - tc.x;
      const currDz = currentZ - tc.z;
      const currDistSq = currDx * currDx + currDz * currDz;

      // If currently overlapping and new position is same-or-further → allow (push apart)
      if (currDistSq < minDistSq && newDistSq >= currDistSq) continue;
    }

    return true;
  }

  return false;
}

export function circleOverlapsAABB(
  cx: number,
  cz: number,
  radius: number,
  obs: ObstacleData,
): boolean {
  const hx = obs.size.x / 2;
  const hz = obs.size.z / 2;
  const ox = obs.position.x;
  const oz = obs.position.z;

  // Closest point on AABB to circle center
  const closestX = Math.max(ox - hx, Math.min(cx, ox + hx));
  const closestZ = Math.max(oz - hz, Math.min(cz, oz + hz));

  const distX = cx - closestX;
  const distZ = cz - closestZ;

  return distX * distX + distZ * distZ < radius * radius;
}
