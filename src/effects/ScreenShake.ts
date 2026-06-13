// ─── Screen Shake ─────────────────────────────────────────────────────────────
// Tracks shake intensity for camera effects.
// Renderer reads this data and applies offset to camera.

import { randomService } from '@/core/RandomService';

export interface ShakeState {
  readonly intensity: number;
  readonly decay: number;
}

type MutableState = {
  intensity: number;
  decay: number;
};

export class ScreenShakeManager {
  private state: MutableState = { intensity: 0, decay: 4.0 };

  /** Adds to current intensity, capped at 1.0 */
  trigger(intensity: number): void {
    this.state.intensity = Math.min(1.0, this.state.intensity + intensity);
  }

  /** Decays intensity over time */
  tick(dt: number): void {
    this.state.intensity = Math.max(0, this.state.intensity - this.state.decay * dt);
  }

  /** Returns current intensity */
  getIntensity(): number {
    return this.state.intensity;
  }

  /** Returns random offset based on intensity (jitter) */
  getOffset(): { x: number; z: number } {
    const i = this.state.intensity;
    return {
      x: randomService.range(-i, i),
      z: randomService.range(-i, i),
    };
  }

  /** Resets intensity to zero */
  reset(): void {
    this.state.intensity = 0;
  }

  /** Snapshot of current state for rendering */
  getState(): ShakeState {
    return { ...this.state };
  }
}

export const screenShake = new ScreenShakeManager();
