// ─── Pickup Command ───────────────────────────────────────────────────────────

export interface PickupCommand {
  readonly kind: 'Pickup';
  readonly entityId: string;
  readonly pickupId: string;
}

export function createPickupCommand(entityId: string, pickupId: string): PickupCommand {
  return { kind: 'Pickup', entityId, pickupId };
}
