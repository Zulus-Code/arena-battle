// ─── Rotate Command ────────────────────────────────────────────────────────────

export interface RotateCommand {
  readonly kind: 'Rotate';
  readonly entityId: string;
  readonly angle: number; // radians
}

export function createRotateCommand(entityId: string, angle: number): RotateCommand {
  return { kind: 'Rotate', entityId, angle };
}
