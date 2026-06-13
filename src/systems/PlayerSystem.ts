// ─── Player System ─────────────────────────────────────────────────────────────
// Handles all player-related update logic: movement, weapon, shield, shooting, buffs.

import type { PlayerData } from '@/domain/entities/Player';
import type { ProjectileData } from '@/domain/entities/Projectile';
import type { InputState } from '@/input/InputState';
import type { TankCollider } from './MovementSystem';
import type { ObstacleData } from '@/domain/entities/Arena';
import type { GameSessionData } from '@/domain/entities/GameSession';
import { createMoveCommand } from '@/commands/MoveCommand';
import { createShootCommand } from '@/commands/ShootCommand';
import { createShieldCommand } from '@/commands/ShieldCommand';
import { applyPlayerMovement } from './MovementSystem';
import { spawnProjectile } from './ProjectileSystem';
import { fireWeapon, tickWeapon, canFire } from '@/domain/entities/Weapon';
import { activateShield, tickShield } from '@/domain/entities/Shield';
import { eventBus } from '@/events/EventBus';

export interface PlayerUpdateResult {
  readonly player: PlayerData;
  readonly newProjectiles: readonly ProjectileData[];
  readonly session: GameSessionData;
}

export function updatePlayer(
  player: PlayerData,
  session: GameSessionData,
  input: InputState,
  dt: number,
  arenaHalf: { readonly x: number; readonly z: number },
  obstacles: readonly ObstacleData[],
  enemyColliders: TankCollider[],
  shieldWasPressed: boolean,
): PlayerUpdateResult {
  let p = player;
  let s = session;
  const newProjectiles: ProjectileData[] = [];

  // ── Speed boost ──────────────────────────────────────────────────────────────
  if (p.speedBoostTimer > 0) {
    p = { ...p, speed: p.speed * 1.5 };
  }

  // ── Movement ─────────────────────────────────────────────────────────────────
  const forward = input.moveForward ? 1 : input.moveBackward ? -1 : 0;
  const turn = input.turnRight ? 1 : input.turnLeft ? -1 : 0;
  const moveCmd = createMoveCommand(p.id, forward, turn);
  p = applyPlayerMovement(p, moveCmd, dt, arenaHalf, obstacles, enemyColliders);
  // Restore base speed
  p = { ...p, speed: player.speed };

  // ── Weapon tick ──────────────────────────────────────────────────────────────
  const weaponDt = p.rapidFireTimer > 0 ? dt * 2 : dt;
  p = { ...p, weapon: tickWeapon(p.weapon, weaponDt) };

  // ── Shield tick ──────────────────────────────────────────────────────────────
  p = { ...p, shield: tickShield(p.shield, dt) };

  // ── Shield activation ────────────────────────────────────────────────────────
  if (input.activateShield && !shieldWasPressed && !p.shield.active) {
    createShieldCommand(p.id);
    p = { ...p, shield: activateShield(p.shield, 5) };
    eventBus.emit({ type: 'ShieldActivated', entityId: p.id, duration: 5 });
  }

  // ── Shooting ─────────────────────────────────────────────────────────────────
  if (input.fire) {
    createShootCommand(p.id);
    if (canFire(p.weapon)) {
      const proj = spawnProjectile(p, p.weapon, 'Player');
      newProjectiles.push(proj);
      p = { ...p, weapon: fireWeapon(p.weapon) };
      s = { ...s, shotsFired: s.shotsFired + 1 };
    }
  }

  // ── Timed buffs ──────────────────────────────────────────────────────────────
  if (p.speedBoostTimer > 0 || p.rapidFireTimer > 0) {
    p = {
      ...p,
      speedBoostTimer: Math.max(0, p.speedBoostTimer - dt),
      rapidFireTimer: Math.max(0, p.rapidFireTimer - dt),
    };
  }

  return { player: p, newProjectiles, session: s };
}
