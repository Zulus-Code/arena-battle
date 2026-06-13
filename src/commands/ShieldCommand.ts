// ─── Shield Command ───────────────────────────────────────────────────────────

export interface ShieldCommand {
  readonly kind: 'Shield';
  readonly entityId: string;
}

export function createShieldCommand(entityId: string): ShieldCommand {
  return { kind: 'Shield', entityId };
}
