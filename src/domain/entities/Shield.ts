// ─── Shield Entity ────────────────────────────────────────────────────────────

export interface ShieldData {
  readonly active: boolean;
  readonly duration: number;
  readonly remaining: number;
}

export function createShield(): ShieldData {
  return { active: false, duration: 0, remaining: 0 };
}

export function activateShield(_shield: ShieldData, duration: number): ShieldData {
  return { active: true, duration, remaining: duration };
}

export function tickShield(shield: ShieldData, dt: number): ShieldData {
  if (!shield.active) return shield;
  const remaining = Math.max(0, shield.remaining - dt);
  return { ...shield, remaining, active: remaining > 0 };
}

export function isShielded(shield: ShieldData): boolean {
  return shield.active && shield.remaining > 0;
}
