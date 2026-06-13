// ─── Move Command ─────────────────────────────────────────────────────────────

export interface MoveCommand {
  readonly kind: 'Move';
  readonly entityId: string;
  readonly forward: number;     // -1, 0, 1
  readonly turn: number;        // -1, 0, 1
}

export function createMoveCommand(
  entityId: string,
  forward: number,
  turn: number,
): MoveCommand {
  return { kind: 'Move', entityId, forward, turn };
}
