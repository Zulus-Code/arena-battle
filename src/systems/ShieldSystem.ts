// ─── Shield System ─────────────────────────────────────────────────────────────
// Shield lifecycle management: activation, per-frame ticking, expiry events.

import type { ShieldData } from '@/domain/entities/Shield';
import { activateShield, tickShield, isShielded } from '@/domain/entities/Shield';
import { eventBus } from '@/events/EventBus';

export function tryActivateShield(
  entity: { id: string; shield: ShieldData },
  duration: number,
): { shield: ShieldData; activated: boolean } {
  if (entity.shield.active) {
    return { shield: entity.shield, activated: false };
  }

  const shield = activateShield(entity.shield, duration);
  eventBus.emit({
    type: 'ShieldActivated',
    entityId: entity.id,
    duration,
  });

  return { shield, activated: true };
}

export function tickEntityShield(
  entity: { id: string; shield: ShieldData },
  dt: number,
): { shield: ShieldData } {
  const wasActive = entity.shield.active;
  const shield = tickShield(entity.shield, dt);

  if (wasActive && !shield.active) {
    eventBus.emit({
      type: 'ShieldDeactivated',
      entityId: entity.id,
    });
  }

  return { shield };
}

export function isShieldActive(entity: { shield: ShieldData }): boolean {
  return isShielded(entity.shield);
}
