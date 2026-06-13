// ─── Pickup Service ───────────────────────────────────────────────────────────
// Pickup application logic — applies effects when a player collects a pickup.

import type { PlayerData } from '@/domain/entities/Player';
import type { PickupData } from '@/domain/entities/Pickup';
import { heal } from '@/domain/entities/Health';
import { activateShield } from '@/domain/entities/Shield';
import { reloadAmmo } from '@/domain/entities/Weapon';
import { eventBus } from '@/events/EventBus';

/** Apply the effect of a collected pickup to the player */
export function applyPickupEffect(player: PlayerData, pickup: PickupData): PlayerData {
  let updated: PlayerData = { ...player };

  switch (pickup.type) {
    case 'Health':
      updated = { ...updated, health: heal(updated.health, pickup.value) };
      break;

    case 'Shield':
      updated = { ...updated, shield: activateShield(updated.shield, pickup.value) };
      break;

    case 'Ammo':
      updated = { ...updated, weapon: reloadAmmo(updated.weapon) };
      break;

    case 'SpeedBoost':
      updated = { ...updated, speed: player.speed * 1.5 };
      break;

    case 'RapidFire':
      // RapidFire effect is handled via weapon swap; no permanent change here
      break;
  }

  eventBus.emit({
    type: 'PickupCollected',
    pickupId: pickup.id,
    pickupType: pickup.type,
    collectorId: player.id,
  });

  return updated;
}
