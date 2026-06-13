// ─── Level Initialization ──────────────────────────────────────────────────────
// Builds level data, populates store, wires effects/audio/achievements, starts game loop.

import { buildLevelData } from '@/services/LevelService';
import { spawnWave } from '@/services/SpawnService';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useUIStore } from '@/store/uiStore';
import { gameStateMachine } from './GameStateMachine';
import { startGameLoop } from './GameLoop';
import { setupSoundEffects } from '@/audio/SoundEffects';
import { setupEffects } from '@/effects/EffectsManager';
import { setupAchievementSystem, resetAchievementContext, setLevelPickupCount, setEnemyCount } from '@/systems/AchievementSystem';
import { resetSmoothing } from '@/systems/MovementSystem';
import { eventBus } from '@/events/EventBus';
import { audioManager } from '@/audio/AudioManager';
import { createLogger } from '@/core/Logger';
import type { LevelConfig } from '@/config/LevelConfig';
import type { ObstacleData } from '@/domain/entities/Arena';

const log = createLogger('InitLevel');

let cleanupEffects: (() => void) | null = null;
let cleanupSound: (() => void) | null = null;
let cleanupAchievements: (() => void) | null = null;

/** Spawn all enemies with wave delays. Sets initial wave immediately, schedules rest. */
function spawnAllWaves(
  config: LevelConfig,
  arenaHalf: { x: number; z: number },
  obstacles: readonly ObstacleData[],
): void {
  const placedPositions: { x: number; z: number }[] = [];

  for (let w = 0; w < config.enemyWaves.length; w++) {
    const wave = config.enemyWaves[w];
    if (w === 0) {
      // First wave — spawn immediately
      const firstWave = spawnWave(wave, arenaHalf, obstacles, placedPositions);
      useGameWorldStore.getState().setEnemies([...firstWave]);
    } else {
      // Subsequent waves — spawn with delay
      const delayMs = (wave.delayBetween || 2) * 1000 * w; // cumulative: 1st wave delay * wave index
      setTimeout(() => {
        const newEnemies = spawnWave(wave, arenaHalf, obstacles, placedPositions);
        const store = useGameWorldStore.getState();
        store.setEnemies([...store.enemies, ...newEnemies]);
        log.info(`Wave ${w + 1} spawned: ${wave.count}x ${wave.type}`);
      }, delayMs);
    }
  }
}

/** Count total enemies across all waves (used for achievement tracking). */
function countTotalEnemies(config: LevelConfig): number {
  return config.enemyWaves.reduce((sum, wave) => sum + wave.count, 0);
}

/** Count total pickups (used for achievement tracking). */
function countTotalPickups(config: LevelConfig): number {
  return config.pickups.length;
}

export function initLevel(config: LevelConfig): void {
  log.info(`Initializing level ${config.index}: ${config.name}`);

  // Clean up previous session
  cleanupEffects?.();
  cleanupSound?.();
  cleanupAchievements?.();
  eventBus.clear();
  resetSmoothing();
  useGameWorldStore.getState().reset();

  // Build level entities (arena, player, pickups, session — but NOT enemies)
  const { arena, player, pickups, session } = buildLevelData(config);

  // Populate the store
  const store = useGameWorldStore.getState();
  store.setArena(arena);
  store.setPlayer(player);
  store.setPickups(pickups);
  store.setSession(session);

  // Wire effects, audio, and achievements to events
  cleanupEffects = setupEffects();
  cleanupSound = setupSoundEffects();
  cleanupAchievements = setupAchievementSystem();

  // Set level context for achievement tracking
  resetAchievementContext();
  setLevelPickupCount(countTotalPickups(config));
  setEnemyCount(countTotalEnemies(config));

  // Resume audio context (browser autoplay policy)
  audioManager.resume().catch(() => {});

  // Transition to PLAYING so the game loop processes ticks
  gameStateMachine.transition('PLAYING');
  useUIStore.getState().setGameState('PLAYING');

  // Start the fixed-timestep game loop
  startGameLoop(config);

  // Spawn enemies in waves (first wave immediately, rest with delays)
  spawnAllWaves(config, { x: config.arenaWidth / 2, z: config.arenaDepth / 2 }, arena.obstacles);
}
