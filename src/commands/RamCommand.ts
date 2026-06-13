// ─── Ram Command ───────────────────────────────────────────────────────────────

export interface RamCommand {
  readonly kind: 'Ram';
  readonly entityId: string;
  readonly targetId: string;
}

export function createRamCommand(entityId: string, targetId: string): RamCommand {
  return { kind: 'Ram', entityId, targetId };
}
