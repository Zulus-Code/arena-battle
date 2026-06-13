// ─── Shoot Command ────────────────────────────────────────────────────────────

export interface ShootCommand {
  readonly kind: 'Shoot';
  readonly entityId: string;
}

export function createShootCommand(entityId: string): ShootCommand {
  return { kind: 'Shoot', entityId };
}
