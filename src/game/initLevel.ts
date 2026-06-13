// ─── Level Initialization ──────────────────────────────────────────────────────
// Builds level data, populates store, wires effects/audio, starts game loop.

import { buildLevelData } from '@/services/LevelService';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useUIStore } from '@/store/uiStore';
import { gameStateMachine } from './GameStateMachine';
import { startGameLoop } from './GameLoop';
import { setupSoundEffects } from '@/audio/SoundEffects';
import { setupEffects } from '@/effects/EffectsManager';
import { resetSmoothing } from '@/systems/MovementSystem';
import { audioManager } from '@/audio/AudioManager';
import { createLogger } from '@/core/Logger';
import type { LevelConfig } from '@/config/LevelConfig';

const log = createLogger('InitLevel');

let cleanupEffects: (() => void) | null = null;
let cleanupSound: (() => void) | null = null;

export function initLevel(config: LevelConfig): void {
  log.info(`Initializing level ${config.index}: ${config.name}`);

  // Clean up previous session
  cleanupEffects?.();
  cleanupSound?.();
  resetSmoothing();
  useGameWorldStore.getState().reset();

  // Build all level entities
  const { arena, player, enemies, pickups, session } = buildLevelData(config);

  // Populate the store
  const store = useGameWorldStore.getState();
  store.setArena(arena);
  store.setPlayer(player);
  store.setEnemies(enemies);
  store.setPickups(pickups);
  store.setSession(session);

  // Wire effects and audio to events
  cleanupEffects = setupEffects();
  cleanupSound = setupSoundEffects();

  // Resume audio context (browser autoplay policy)
  audioManager.resume().catch(() => {});

  // Transition to PLAYING so the game loop processes ticks
  gameStateMachine.transition('PLAYING');
  useUIStore.getState().setGameState('PLAYING');

  // Start the fixed-timestep game loop
  startGameLoop(config);
}
