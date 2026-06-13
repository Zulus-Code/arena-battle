// ─── Seeded Random Service ────────────────────────────────────────────────────
// Deterministic pseudo-random number generator (mulberry32).
// Enables replay, level reproduction, and debugging.

export class RandomService {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.seed |= 0;
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns an integer in [min, max] */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Picks a random element from an array */
  pick<T>(arr: readonly T[]): T {
    return arr[this.rangeInt(0, arr.length - 1)];
  }

  /** Resets the generator with a new seed */
  reseed(seed: number): void {
    this.seed = seed;
  }

  getSeed(): number {
    return this.seed;
  }
}

export const randomService = new RandomService(42);
