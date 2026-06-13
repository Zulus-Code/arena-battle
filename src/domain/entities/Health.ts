// ─── Health Entity ────────────────────────────────────────────────────────────

export interface HealthData {
  readonly current: number;
  readonly max: number;
}

export function createHealth(max: number): HealthData {
  return { current: max, max };
}

export function applyDamage(health: HealthData, amount: number): HealthData {
  const next = Math.max(0, health.current - amount);
  return { current: next, max: health.max };
}

export function heal(health: HealthData, amount: number): HealthData {
  const next = Math.min(health.max, health.current + amount);
  return { current: next, max: health.max };
}

export function isDead(health: HealthData): boolean {
  return health.current <= 0;
}

export function isFullHealth(health: HealthData): boolean {
  return health.current >= health.max;
}

export function healthPercent(health: HealthData): number {
  return health.current / health.max;
}
