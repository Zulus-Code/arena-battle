// ─── Damage Rules ─────────────────────────────────────────────────────────────
// Pure functions describing how damage is calculated.
// No side effects. No external dependencies.

import type { DamageType } from '@/domain/types/CoreTypes';

export interface DamageContext {
  readonly baseDamage: number;
  readonly damageType: DamageType;
  readonly targetHasShield: boolean;
  readonly distanceFromExplosion?: number;
  readonly explosionRadius?: number;
}

export interface DamageResult {
  readonly finalDamage: number;
  readonly absorbed: boolean;
}

const SHIELD_ABSORPTION = 1.0; // shield absorbs 100% of damage

/** Calculate final damage after applying rules */
export function calculateDamage(ctx: DamageContext): DamageResult {
  if (ctx.targetHasShield) {
    return { finalDamage: 0, absorbed: true };
  }

  let damage = ctx.baseDamage;

  // Splash falloff
  if (ctx.distanceFromExplosion !== undefined && ctx.explosionRadius) {
    const falloff = 1 - ctx.distanceFromExplosion / ctx.explosionRadius;
    damage *= Math.max(0, falloff);
  }

  // Energy weapons do 20% more damage
  if (ctx.damageType === 'Energy') {
    damage *= 1.2;
  }

  return {
    finalDamage: Math.round(damage * (1 - SHIELD_ABSORPTION * 0)),
    absorbed: false,
  };
}

/** Clamp damage to valid range */
export function clampDamage(damage: number): number {
  return Math.max(0, Math.min(9999, damage));
}
