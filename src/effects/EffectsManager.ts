// ─── Effects Manager ──────────────────────────────────────────────────────────
// Subscribes to game events and triggers visual effects.
// Call setupEffects() once at game initialization.

import { eventBus } from '@/events/EventBus';
import type {
  ExplosionCreatedEvent,
  EnemyKilledEvent,
  PlayerDamagedEvent,
  PlayerKilledEvent,
} from '@/events/GameEvents';
import { screenShake } from './ScreenShake';
import { particleSystem } from './ParticleSystem';

/** Subscribe to game events and wire up visual effects. Returns cleanup fn. */
export function setupEffects(): () => void {
  const unsubs: (() => void)[] = [];

  unsubs.push(
    eventBus.on('ExplosionCreated', (e: ExplosionCreatedEvent) => {
      screenShake.trigger(0.3);
      particleSystem.burst(e.position, 20, '#ff6600');
    }),
  );

  unsubs.push(
    eventBus.on('EnemyKilled', (e: EnemyKilledEvent) => {
      screenShake.trigger(0.15);
      particleSystem.burst(e.position, 10, '#ff4444');
    }),
  );

  unsubs.push(
    eventBus.on('PlayerDamaged', (e: PlayerDamagedEvent) => {
      screenShake.trigger(0.1);
      particleSystem.burst(e.position, 5, '#ffaa00', 3, 0.2, 0.5);
    }),
  );

  unsubs.push(
    eventBus.on('PlayerKilled', (e: PlayerKilledEvent) => {
      screenShake.trigger(0.5);
      particleSystem.burst(e.position, 30, '#ff0000', 8, 0.5, 1.5);
    }),
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

/** Tick all effect systems. Call once per frame. */
export function tickEffects(dt: number): void {
  screenShake.tick(dt);
  particleSystem.tick(dt);
}
