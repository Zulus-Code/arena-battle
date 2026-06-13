// ─── Game State Machine ───────────────────────────────────────────────────────
// Explicit state transitions. No boolean flag soup.

import { createLogger } from '@/core/Logger';

const log = createLogger('GameStateMachine');

// ─── States ───────────────────────────────────────────────────────────────────

export type GameState =
  | 'BOOT'
  | 'MENU'
  | 'STARTING_LEVEL'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_COMPLETE'
  | 'GAME_OVER'
  | 'VICTORY';

// ─── Transition Table ─────────────────────────────────────────────────────────
// Defines which transitions are legal.

const VALID_TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  BOOT: ['MENU'],
  MENU: ['STARTING_LEVEL'],
  STARTING_LEVEL: ['PLAYING', 'MENU'],
  PLAYING: ['PAUSED', 'LEVEL_COMPLETE', 'GAME_OVER'],
  PAUSED: ['PLAYING', 'MENU'],
  LEVEL_COMPLETE: ['STARTING_LEVEL', 'VICTORY', 'MENU'],
  GAME_OVER: ['MENU'],
  VICTORY: ['MENU'],
};

// ─── State Machine ────────────────────────────────────────────────────────────

type StateChangeListener = (prev: GameState, next: GameState) => void;

export class GameStateMachine {
  private current: GameState = 'BOOT';
  private listeners: Set<StateChangeListener> = new Set();

  getState(): GameState {
    return this.current;
  }

  is(state: GameState): boolean {
    return this.current === state;
  }

  transition(next: GameState): boolean {
    const allowed = VALID_TRANSITIONS[this.current];
    if (!allowed.includes(next)) {
      log.warn(`Invalid transition: ${this.current} → ${next}`);
      return false;
    }

    const prev = this.current;
    this.current = next;
    log.info(`State: ${prev} → ${next}`);

    for (const listener of this.listeners) {
      listener(prev, next);
    }

    return true;
  }

  onChange(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    this.current = 'BOOT';
  }
}

export const gameStateMachine = new GameStateMachine();
