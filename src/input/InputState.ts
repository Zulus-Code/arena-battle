// ─── Input State ──────────────────────────────────────────────────────────────
// Pure data snapshot of the current input.
// Game logic reads this; it never reads keyboards or mice directly.

export interface InputState {
  readonly moveForward: boolean;
  readonly moveBackward: boolean;
  readonly turnLeft: boolean;
  readonly turnRight: boolean;
  readonly fire: boolean;
  readonly activateShield: boolean;
  readonly pause: boolean;
}

export function createEmptyInputState(): InputState {
  return {
    moveForward: false,
    moveBackward: false,
    turnLeft: false,
    turnRight: false,
    fire: false,
    activateShield: false,
    pause: false,
  };
}
