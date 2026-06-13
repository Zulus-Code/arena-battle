// ─── Game Loop ────────────────────────────────────────────────────────────────
// Fixed-timestep game loop at 60 Hz. Orchestrates systems — no inline game logic.

import { createLogger } from '@/core/Logger';
import { scheduler } from '@/core/Scheduler';
import { eventBus } from '@/events/EventBus';
import { gameStateMachine } from './GameStateMachine';
import { inputMapper } from '@/input/InputMapper';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useUIStore } from '@/store/uiStore';
import { useDebugStore } from '@/store/debugStore';
import { updateEnemies } from '@/systems/EnemySystem';
import { updatePlayer } from '@/systems/PlayerSystem';
import {
  tickProjectile, isProjectileExpired, isOutOfBounds, processObstacleCollisions,
} from '@/systems/ProjectileSystem';
import { processProjectileHits } from '@/systems/CombatSystem';
import { tickPickups, checkPickupCollisions } from '@/systems/PickupSystem';
import { createExplosion, tickExplosion, isExplosionExpired } from '@/systems/ExplosionSystem';
import { checkVictory } from '@/systems/VictorySystem';
import { tickEffects } from '@/effects/EffectsManager';
import { addScore, incrementKills } from '@/domain/entities/GameSession';
import type { LevelConfig } from '@/config/LevelConfig';

const log = createLogger('GameLoop');

const FIXED_STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;

let accumulator = 0;
let lastTime = 0;
let running = false;
let animFrameId = 0;
let currentLevelConfig: LevelConfig | null = null;

// Track edge triggers
let pauseWasPressed = false;
let shieldWasPressed = false;
let lastAmmo = -1;

// ─── Public API ───────────────────────────────────────────────────────────────

export function startGameLoop(levelConfig: LevelConfig): void {
  if (running) return;
  currentLevelConfig = levelConfig;
  running = true;
  lastTime = performance.now();
  accumulator = 0;
  pauseWasPressed = false;
  shieldWasPressed = false;
  lastAmmo = -1;
  animFrameId = requestAnimationFrame(loop);
  log.info('Game loop started');
}

export function stopGameLoop(): void {
  running = false;
  cancelAnimationFrame(animFrameId);
  scheduler.clear();
  log.info('Game loop stopped');
}

export function resumeGame(): void {
  if (!gameStateMachine.is('PAUSED')) return;
  gameStateMachine.transition('PLAYING');
  useUIStore.getState().setGameState('PLAYING');
  pauseWasPressed = true; // prevent immediate re-pause
  lastTime = performance.now();
  running = true;
  animFrameId = requestAnimationFrame(loop);
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
    useDebugStore.getState().updateMetrics({ updateTime: performance.now() - t0 });
    accumulator -= FIXED_STEP;
    steps++;
  }

  const fps = steps > 0 ? Math.round(1 / dt) : useDebugStore.getState().metrics.fps;
  useDebugStore.getState().updateMetrics({ fps, frameTime: dt * 1000 });

  animFrameId = requestAnimationFrame(loop);
}

// ─── Fixed Update (orchestrator) ─────────────────────────────────────────────

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

  // ── Player update ─────────────────────────────────────────────────────────
  const enemyColliders = world.enemies
    .filter(e => e.status !== 'Dead')
    .map(e => ({ id: e.id, x: e.position.x, z: e.position.z }));

  const { player: updatedPlayer, newProjectiles: playerProjs, session: updatedSession } = updatePlayer(
    world.player, world.session, input, dt, arenaHalf, obstacles, enemyColliders, shieldWasPressed,
  );
  shieldWasPressed = input.activateShield;
  let player = updatedPlayer;
  let session = updatedSession;
  let projectiles = [...world.projectiles, ...playerProjs];

  // ── Enemy update ──────────────────────────────────────────────────────────
  const { enemies: updatedEnemies, newProjectiles: enemyProjs } = updateEnemies(
    world.enemies, player, dt, arenaHalf, obstacles,
  );
  let enemies = updatedEnemies;
  projectiles = [...projectiles, ...enemyProjs];

  // ── Projectile movement ───────────────────────────────────────────────────
  projectiles = projectiles
    .map(p => tickProjectile(p, dt))
    .filter(p => !isProjectileExpired(p) && !isOutOfBounds(p, arenaHalf.x, arenaHalf.z));

  // ── Obstacle hits (checked BEFORE entity combat) ──────────────────────────
  const obstacleHitProjIds = new Set<string>();
  processObstacleCollisions(projectiles, obstacles, obstacleHitProjIds, (hit) => {
    const obs = obstacles.find(o => o.id === hit.obstacleId);
    if (!obs) return;
    const newHp = Math.max(0, obs.hp - hit.damage);
    world.updateObstacle(hit.obstacleId, { hp: newHp });
    eventBus.emit({
      type: 'ObstacleDamaged',
      obstacleId: hit.obstacleId,
      position: projectiles.find(p => p.id === hit.projectileId)?.position ?? obs.position,
      damage: hit.damage,
      remainingHp: newHp,
      maxHp: obs.maxHp,
    });
    if (newHp <= 0) {
      eventBus.emit({ type: 'ObstacleDestroyed', obstacleId: hit.obstacleId, position: obs.position });
    }
  });

  // ── Combat resolution (skips projectiles blocked by obstacles) ────────────
  const { hitProjectileIds, updatedPlayer: combatPlayer, updatedEnemies: combatEnemies, shotsHit } =
    processProjectileHits(projectiles, player, enemies, obstacleHitProjIds);
  player = combatPlayer;
  enemies = combatEnemies;

  // ── Explosions for splash projectiles that hit ────────────────────────────
  let explosions = [...world.explosions];
  for (const proj of projectiles) {
    if (hitProjectileIds.has(proj.id) && proj.splashRadius > 0) {
      const explosion = createExplosion(proj.position, proj.splashRadius, proj.damage * 0.5, proj.ownerId);
      explosions.push(explosion);
      eventBus.emit({
        type: 'ExplosionCreated',
        position: proj.position,
        radius: proj.splashRadius,
        damage: proj.damage * 0.5,
        sourceId: proj.ownerId,
      });
    }
  }
  projectiles = projectiles.filter(p => !hitProjectileIds.has(p.id));

  // ── Explosion ticks ───────────────────────────────────────────────────────
  explosions = explosions.map(e => tickExplosion(e, dt)).filter(e => !isExplosionExpired(e));

  // ── Pickup system ─────────────────────────────────────────────────────────
  const tickedPickups = tickPickups(world.pickups, dt);
  const { updatedPlayer: playerAfterPickup, updatedPickups } = checkPickupCollisions(player, tickedPickups);
  player = playerAfterPickup;

  // ── Effects tick ──────────────────────────────────────────────────────────
  tickEffects(dt);

  // ── Session tick ──────────────────────────────────────────────────────────
  session = { ...session, timeElapsed: session.timeElapsed + dt };
  if (shotsHit > 0) {
    session = { ...session, shotsHit: session.shotsHit + shotsHit };
  }

  // ── Score from kills ──────────────────────────────────────────────────────
  for (const enemy of enemies) {
    const prev = world.enemies.find(e => e.id === enemy.id);
    if (enemy.status === 'Dead' && prev && prev.status !== 'Dead') {
      session = addScore(session, enemy.scoreReward);
      session = incrementKills(session);
      eventBus.emit({ type: 'ScoreChanged', score: session.score, delta: enemy.scoreReward });
    }
  }

  // ── Ammo HUD update ───────────────────────────────────────────────────────
  if (player.weapon.ammo !== lastAmmo) {
    lastAmmo = player.weapon.ammo;
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
  world.setProjectiles(projectiles);
  world.setPickups(updatedPickups);
  world.setExplosions(explosions);
  world.setSession(session);

  // ── Debug metrics ─────────────────────────────────────────────────────────
  useDebugStore.getState().updateMetrics({
    enemyCount: enemies.filter(e => e.status !== 'Dead').length,
    projectileCount: projectiles.length,
    explosionCount: explosions.length,
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
