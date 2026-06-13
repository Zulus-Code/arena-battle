// ─── Input Mapper ─────────────────────────────────────────────────────────────
// Translates raw device input into abstract InputState.
// Supports multiple input sources (keyboard, gamepad, AI, replay).

import type { InputState } from './InputState';
import { keyboardInput } from './KeyboardInput';

export interface InputProvider {
  getInputState(): InputState;
}

export class InputMapper {
  private provider: InputProvider = keyboardInput;

  setProvider(provider: InputProvider): void {
    this.provider = provider;
  }

  getInputState(): InputState {
    return this.provider.getInputState();
  }
}

export const inputMapper = new InputMapper();
