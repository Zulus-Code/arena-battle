// ─── Pickup System ────────────────────────────────────────────────────────────
// Handles pickup collection and respawning.

import type { PlayerData } from '@/domain/entities/Player';
import type { PickupData } from '@/domain/entities/Pickup';
import { heal } from '@/domain/entities/Health';
import { activateShield } from '@/domain/entities/Shield';
import { reloadAmmo } from '@/domain/entities/Weapon';
import { eventBus } from '@/events/EventBus';
import { PICKUP_CONFIGS } from '@/config/PickupConfig';

const PICKUP_RADIUS = 1.5;
const TANK_RADIUS = 0.8;

export function checkPickupCollisions(
  player: PlayerData,
  pickups: readonly PickupData[],
): { updatedPlayer: PlayerData; updatedPickups: readonly PickupData[] } {
  let updatedPlayer = player;
  const updatedPickups = pickups.map((pickup) => {
    if (!pickup.active) return pickup;

    const dx = player.position.x - pickup.position.x;
    const dz = player.position.z - pickup.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < PICKUP_RADIUS + TANK_RADIUS) {
      updatedPlayer = applyPickup(updatedPlayer, pickup);

      eventBus.emit({
        type: 'PickupCollected',
        pickupId: pickup.id,
        pickupType: pickup.type,
        collectorId: player.id,
      });

      const config = PICKUP_CONFIGS[pickup.type];
      return { ...pickup, active: false, respawnTimer: config.respawnTime };
    }

    return pickup;
  });

  return { updatedPlayer, updatedPickups };
}

function applyPickup(player: PlayerData, pickup: PickupData): PlayerData {
  switch (pickup.type) {
    case 'Health':
      return { ...player, health: heal(player.health, pickup.value) };

    case 'Shield':
      return {
        ...player,
        shield: activateShield(player.shield, pickup.value),
      };

    case 'Ammo':
      return { ...player, weapon: reloadAmmo(player.weapon) };

    case 'SpeedBoost':
      // Temporary speed boost — tracked via a timed value
      return { ...player, speed: player.speed * 1.5 };

    case 'RapidFire':
      return player; // Handled separately via event
  }
}

export function tickPickups(pickups: readonly PickupData[], dt: number): readonly PickupData[] {
  return pickups.map((pickup) => {
    if (pickup.active) return pickup;
    const newTimer = pickup.respawnTimer - dt;
    if (newTimer <= 0) {
      return { ...pickup, active: true, respawnTimer: 0 };
    }
    return { ...pickup, respawnTimer: newTimer };
  });
}
