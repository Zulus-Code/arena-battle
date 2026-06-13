// ─── Core Domain Types ────────────────────────────────────────────────────────
// Shared value types used throughout the domain layer.
// These are pure data — no dependencies on external libraries.

// ─── Primitives ───────────────────────────────────────────────────────────────

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Vec2 {
  readonly x: number;
  readonly z: number;
}

export interface Rotation {
  readonly y: number; // radians, yaw only for tank
}

// ─── Entity Identity ─────────────────────────────────────────────────────────

export type EntityId = string;

// ─── Damage ──────────────────────────────────────────────────────────────────

export type DamageSource =
  | { readonly kind: 'Projectile'; readonly projectileId: string; readonly ownerId: string }
  | { readonly kind: 'Explosion'; readonly sourceId: string }
  | { readonly kind: 'Ram'; readonly enemyId: string }
  | { readonly kind: 'Environment' };

export type DamageType = 'Kinetic' | 'Explosive' | 'Energy';

// ─── Result Pattern ───────────────────────────────────────────────────────────

export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ─── Faction ─────────────────────────────────────────────────────────────────

export type Faction = 'Player' | 'Enemy' | 'Neutral';

// ─── Entity Status ────────────────────────────────────────────────────────────

export type EntityStatus = 'Alive' | 'Dead' | 'Spawning';
