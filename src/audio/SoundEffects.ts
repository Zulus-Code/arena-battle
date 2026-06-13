// ─── Sound Effects ────────────────────────────────────────────────────────────
// Subscribes to game events and plays corresponding sounds.
// Import and call setupSoundEffects() once at game initialization.

import { eventBus } from '@/events/EventBus';
import { audioManager } from './AudioManager';
import { createLogger } from '@/core/Logger';

const log = createLogger('SoundEffects');

type UnsubscribeFn = () => void;

/** Subscribe to game events and play matching sounds. Returns a cleanup function. */
export function setupSoundEffects(): UnsubscribeFn {
  const unsubs: UnsubscribeFn[] = [];

  unsubs.push(eventBus.on('EnemyKilled', () => audioManager.playSound('explosion')));
  unsubs.push(eventBus.on('PlayerDamaged', () => audioManager.playSound('hit')));
  unsubs.push(eventBus.on('PlayerKilled', () => audioManager.playSound('explosion')));
  unsubs.push(eventBus.on('ProjectileHit', () => audioManager.playSound('hit')));
  unsubs.push(eventBus.on('PickupCollected', () => audioManager.playSound('pickup')));
  unsubs.push(eventBus.on('ShieldActivated', () => audioManager.playSound('shield')));
  unsubs.push(eventBus.on('LevelCompleted', () => audioManager.playSound('levelComplete')));
  unsubs.push(eventBus.on('GameOver', () => audioManager.playSound('gameOver')));

  unsubs.push(eventBus.on('ExplosionCreated', () => audioManager.playSound('explosion')));

  log.info('Sound effects initialized');

  return () => {
    for (const unsub of unsubs) {
      unsub();
    }
  };
}

/** Pre-load all game sound assets. Currently logs a warning since audio files don't exist yet. */
export async function preloadGameSounds(): Promise<void[]> {
  log.warn('No audio files exist yet — skipping preload');
  return [];
}
