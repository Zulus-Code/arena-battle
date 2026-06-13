// ─── Event Bus ────────────────────────────────────────────────────────────────
// Central pub/sub system. All inter-system communication flows through here.
// Singleton by design — there is exactly one event bus per game session.

import type { GameEvent } from './GameEvents';
import { createLogger } from '@/core/Logger';

type EventHandler<T extends GameEvent> = (event: T) => void;
type AnyHandler = (event: GameEvent) => void;

const log = createLogger('EventBus');

class EventBus {
  private handlers: Map<string, Set<AnyHandler>> = new Map();

  /** Subscribe to a specific event type */
  on<T extends GameEvent>(type: T['type'], handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as AnyHandler);

    // Return unsubscribe function
    return () => this.off(type, handler);
  }

  /** Unsubscribe from a specific event type */
  off<T extends GameEvent>(type: T['type'], handler: EventHandler<T>): void {
    this.handlers.get(type)?.delete(handler as AnyHandler);
  }

  /** Emit an event to all subscribers */
  emit<T extends GameEvent>(event: T): void {
    log.debug(`Event: ${event.type}`);
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(event);
    }
  }

  /** Remove all handlers — call on game session end */
  clear(): void {
    this.handlers.clear();
  }
}

// Singleton
export const eventBus = new EventBus();
