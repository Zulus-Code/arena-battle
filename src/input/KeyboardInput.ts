// ─── Keyboard Input ───────────────────────────────────────────────────────────
// Reads keyboard + mouse state and exposes it as InputState.
// Game logic never imports this — only the InputMapper does.

import type { InputState } from './InputState';

export class KeyboardInput {
  private keys: Set<string> = new Set();
  private mouseDown = false;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private readonly onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseDown = true;
  };

  private readonly onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseDown = false;
  };

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.keys.clear();
    this.mouseDown = false;
  }

  isPressed(code: string): boolean {
    return this.keys.has(code);
  }

  getInputState(): InputState {
    return {
      moveForward:    this.isPressed('KeyW') || this.isPressed('ArrowUp'),
      moveBackward:   this.isPressed('KeyS') || this.isPressed('ArrowDown'),
      turnLeft:       this.isPressed('KeyD') || this.isPressed('ArrowLeft'),
      turnRight:      this.isPressed('KeyA') || this.isPressed('ArrowRight'),
      fire:           this.isPressed('Space') || this.mouseDown,
      activateShield: this.isPressed('ShiftLeft') || this.isPressed('ShiftRight'),
      pause:          this.isPressed('Escape'),
    };
  }
}

export const keyboardInput = new KeyboardInput();
