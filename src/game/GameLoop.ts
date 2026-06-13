// ─── Game Loop ────────────────────────────────────────────────────────────────
// Fixed-timestep game loop at 60 Hz.
// Decoupled from renderer FPS.

import { createLogger } from '@/core/Logger';
import { scheduler } from '@/core/Scheduler';
import { eventBus } from '@/events/EventBus';
import { gameStateMachine } from './GameStateMachine';
import { inputMapper } from '@/input/InputMapper';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useUIStore } from '@/store/uiStore';
import { useDebugStore } from '@/store/debugStore';
import { createMoveCommand } from '@/commands/MoveCommand';
import { createShootCommand } from '@/commands/ShootCommand';
import { createShieldCommand } from '@/commands/ShieldCommand';
import { applyPlayerMovement } from '@/systems/MovementSystem';
import {
  spawnProjectile,
  tickProjectile,
  isProjectileExpired,
  isOutOfBounds,
} from '@/systems/ProjectileSystem';
import { processProjectileHits } from '@/systems/CombatSystem';
import { checkProjectileObstacleHit } from '@/services/CollisionService';
import { tickPickups, checkPickupCollisions } from '@/systems/PickupSystem';
import { updateEnemyAI, shouldEnemyFire, consumeEnemyShot } from '@/systems/EnemyAISystem';
import { createExplosion, tickExplosion, isExplosionExpired } from '@/systems/ExplosionSystem';
import { checkVictory } from '@/systems/VictorySystem';
import { tickEffects } from '@/effects/EffectsManager';
import { fireWeapon, tickWeapon, canFire } from '@/domain/entities/Weapon';
import { activateShield, tickShield } from '@/domain/entities/Shield';
import { addScore, incrementKills } from '@/domain/entities/GameSession';
import type { LevelConfig } from '@/config/LevelConfig';
import type { TankCollider } from '@/systems/MovementSystem';

const log = createLogger('GameLoop');

const FIXED_STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;

let accumulator = 0;
let lastTime = 0;
let running = false;
let animFrameId = 0;
let currentLevelConfig: LevelConfig | null = null;

// Track pause key edge trigger
let pauseWasPressed = false;
let shieldWasPressed = false;

// ─── Public API ───────────────────────────────────────────────────────────────

export function startGameLoop(levelConfig: LevelConfig): void {
  currentLevelConfig = levelConfig;
  running = true;
  lastTime = performance.now();
  accumulator = 0;
  pauseWasPressed = false;
  shieldWasPressed = false;
  animFrameId = requestAnimationFrame(loop);
  log.info('Game loop started');
}

export function stopGameLoop(): void {
  running = false;
  cancelAnimationFrame(animFrameId);
  scheduler.clear();
  log.info('Game loop stopped');
}

// ─── Main Loop ────────────────────────────────────────────────────────────────

function loop(timestamp: number): void {
  if (!running) return;

  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  accumulator += dt;

  let steps = 0;
  while (accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
    const t0 = performance.now();
    fixedUpdate(FIXED_STEP);
    const updateMs = performance.now() - t0;

    useDebugStore.getState().updateMetrics({ updateTime: updateMs });
    accumulator -= FIXED_STEP;
    steps++;
  }

  // Update FPS metric
  const fps = steps > 0 ? Math.round(1 / dt) : useDebugStore.getState().metrics.fps;
  useDebugStore.getState().updateMetrics({ fps, frameTime: dt * 1000 });

  animFrameId = requestAnimationFrame(loop);
}

// ─── Fixed Update ─────────────────────────────────────────────────────────────

function fixedUpdate(dt: number): void {
  if (!gameStateMachine.is('PLAYING')) return;

  const world = useGameWorldStore.getState();
  if (!world.player || !world.arena || !world.session || !currentLevelConfig) return;

  const input = inputMapper.getInputState();

  // ── Pause handling ────────────────────────────────────────────────────────
  if (input.pause && !pauseWasPressed) {
    gameStateMachine.transition('PAUSED');
    useUIStore.getState().setGameState('PAUSED');
    pauseWasPressed = true;
    return;
  }
  pauseWasPressed = input.pause;

  const arenaHalf = { x: world.arena.width / 2, z: world.arena.depth / 2 };
  const obstacles = world.arena.obstacles;

  // ── Player movement ───────────────────────────────────────────────────────
  const forward = input.moveForward ? 1 : input.moveBackward ? -1 : 0;
  const turn = input.turnRight ? 1 : input.turnLeft ? -1 : 0;
  const moveCmd = createMoveCommand(world.player.id, forward, turn);
  // Pass all living enemies as tank colliders for player
  const enemyColliders: TankCollider[] = world.enemies
    .filter(e => e.status !== 'Dead')
    .map(e => ({ id: e.id, x: e.position.x, z: e.position.z }));
  let player = applyPlayerMovement(world.player, moveCmd, dt, arenaHalf, obstacles, enemyColliders);

  // ── Player weapon tick ────────────────────────────────────────────────────
  player = { ...player, weapon: tickWeapon(player.weapon, dt) };

  // ── Player shield tick ────────────────────────────────────────────────────
  player = { ...player, shield: tickShield(player.shield, dt) };

  // ── Shield activation ─────────────────────────────────────────────────────
  if (input.activateShield && !shieldWasPressed && !player.shield.active) {
    createShieldCommand(player.id);
    player = { ...player, shield: activateShield(player.shield, 5) };
    eventBus.emit({ type: 'ShieldActivated', entityId: player.id, duration: 5 });
  }
  shieldWasPressed = input.activateShield;

  // ── Player shooting ───────────────────────────────────────────────────────
  let newProjectiles = [...world.projectiles];
  if (input.fire) {
    createShootCommand(player.id);
    if (canFire(player.weapon)) {
      const proj = spawnProjectile(player, player.weapon, 'Player');
      newProjectiles.push(proj);
      player = { ...player, weapon: fireWeapon(player.weapon) };
      let s = world.session;
      s = { ...s, shotsFired: s.shotsFired + 1 };
      world.setSession(s);
    }
  }

  // ── Enemy AI update ───────────────────────────────────────────────────────
  let enemies = [...world.enemies];
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].status === 'Dead') continue;

    // Build colliders: player + all OTHER living enemies (with current positions)
    const otherTanks: TankCollider[] = [];
    otherTanks.push({ id: player.id, x: player.position.x, z: player.position.z });
    for (let j = 0; j < enemies.length; j++) {
      if (j === i || enemies[j].status === 'Dead') continue;
      otherTanks.push({ id: enemies[j].id, x: enemies[j].position.x, z: enemies[j].position.z });
    }

    let enemy = updateEnemyAI(enemies[i], player, dt, arenaHalf, obstacles, otherTanks);

    if (shouldEnemyFire(enemy, player)) {
      const proj = spawnProjectile(enemy, enemy.weapon, 'Enemy');
      newProjectiles.push(proj);
      enemy = consumeEnemyShot(enemy);
    }

    enemies[i] = enemy;
  }

  // ── Projectile movement ───────────────────────────────────────────────────
  newProjectiles = newProjectiles
    .map((p) => tickProjectile(p, dt))
    .filter((p) => !isProjectileExpired(p) && !isOutOfBounds(p, arenaHalf.x, arenaHalf.z));

  // ── Combat resolution ─────────────────────────────────────────────────────
  const { hitProjectileIds, updatedPlayer, updatedEnemies } = processProjectileHits(
    newProjectiles,
    player,
    enemies,
  );

  player = updatedPlayer;
  enemies = [...updatedEnemies];

  // ── Obstacle hits ───────────────────────────────────────────────────────
  const obstacleHitProjIds = new Set<string>();
  for (const proj of newProjectiles) {
    if (!proj.active || hitProjectileIds.has(proj.id) || obstacleHitProjIds.has(proj.id)) continue;
    if (proj.faction !== 'Player' && proj.faction !== 'Enemy') continue;
    for (const obs of obstacles) {
      if (!obs.destructible || obs.hp <= 0) continue;
      if (checkProjectileObstacleHit(proj, obs)) {
        obstacleHitProjIds.add(proj.id);
        const newHp = Math.max(0, obs.hp - proj.damage);
        world.updateObstacle(obs.id, { hp: newHp });
        eventBus.emit({
          type: 'ObstacleDamaged',
          obstacleId: obs.id,
          position: proj.position,
          damage: proj.damage,
          remainingHp: newHp,
          maxHp: obs.maxHp,
        });
        if (newHp <= 0) {
          eventBus.emit({
            type: 'ObstacleDestroyed',
            obstacleId: obs.id,
            position: proj.position,
          });
        }
        break;
      }
    }
  }

  // Merge obstacle hit IDs into the main hit set
  for (const id of obstacleHitProjIds) {
    hitProjectileIds.add(id);
  }

  // Create explosions for splash projectiles that hit
  const newExplosions = [...world.explosions];
  for (const proj of newProjectiles) {
    if (hitProjectileIds.has(proj.id) && proj.splashRadius > 0) {
      const explosion = createExplosion(proj.position, proj.splashRadius, proj.damage * 0.5, proj.ownerId);
      newExplosions.push(explosion);
      eventBus.emit({
        type: 'ExplosionCreated',
        position: proj.position,
        radius: proj.splashRadius,
        damage: proj.damage * 0.5,
        sourceId: proj.ownerId,
      });
    }
  }

  // Remove hit projectiles
  const finalProjectiles = newProjectiles.filter((p) => !hitProjectileIds.has(p.id));

  // ── Explosion ticks ───────────────────────────────────────────────────────
  const finalExplosions = newExplosions
    .map((e) => tickExplosion(e, dt))
    .filter((e) => !isExplosionExpired(e));

  // ── Pickup system ─────────────────────────────────────────────────────────
  const tickedPickups = tickPickups(world.pickups, dt);
  const { updatedPlayer: playerAfterPickup, updatedPickups } = checkPickupCollisions(
    player,
    tickedPickups,
  );
  player = playerAfterPickup;

  // ── Effects tick ─────────────────────────────────────────────────────────
  tickEffects(dt);

  // ── Session tick ──────────────────────────────────────────────────────────
  let session = { ...world.session, timeElapsed: world.session.timeElapsed + dt };

  // ── Score from kills ──────────────────────────────────────────────────────
  for (const enemy of enemies) {
    const prev = world.enemies.find((e) => e.id === enemy.id);
    if (enemy.status === 'Dead' && prev && prev.status !== 'Dead') {
      session = addScore(session, enemy.scoreReward);
      session = incrementKills(session);
      eventBus.emit({ type: 'ScoreChanged', score: session.score, delta: enemy.scoreReward });
    }
  }

  // ── Ammo HUD update ───────────────────────────────────────────────────────
  if (player.weapon.ammo !== world.player.weapon.ammo) {
    eventBus.emit({
      type: 'AmmoChanged',
      playerId: player.id,
      ammo: player.weapon.ammo,
      maxAmmo: player.weapon.maxAmmo,
    });
  }

  // ── Write state ───────────────────────────────────────────────────────────
  world.setPlayer(player);
  world.setEnemies(enemies);
  world.setProjectiles(finalProjectiles);
  world.setPickups(updatedPickups);
  world.setExplosions(finalExplosions);
  world.setSession(session);

  // ── Debug metrics ─────────────────────────────────────────────────────────
  useDebugStore.getState().updateMetrics({
    enemyCount: enemies.filter((e) => e.status !== 'Dead').length,
    projectileCount: finalProjectiles.length,
    explosionCount: finalExplosions.length,
  });

  // ── Victory check ─────────────────────────────────────────────────────────
  const outcome = checkVictory(
    player,
    enemies,
    session,
    currentLevelConfig.victoryCondition,
    currentLevelConfig.timeLimit,
  );

  if (outcome === 'Win') {
    gameStateMachine.transition('LEVEL_COMPLETE');
    useUIStore.getState().setGameState('LEVEL_COMPLETE');
    stopGameLoop();
  } else if (outcome === 'Lose') {
    gameStateMachine.transition('GAME_OVER');
    useUIStore.getState().setGameState('GAME_OVER');
    stopGameLoop();
  }
}

// ─── Pause Resume ─────────────────────────────────────────────────────────────

export function resumeGame(): void {
  if (!gameStateMachine.is('PAUSED')) return;
  gameStateMachine.transition('PLAYING');
  useUIStore.getState().setGameState('PLAYING');
  pauseWasPressed = true; // prevent immediate re-pause
  lastTime = performance.now();
  running = true;
  animFrameId = requestAnimationFrame(loop);
}
