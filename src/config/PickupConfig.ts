// ─── Pickup Configuration ─────────────────────────────────────────────────────

import type { PickupType } from '@/domain/entities/Pickup';

export interface PickupConfig {
  readonly type: PickupType;
  readonly value: number;
  readonly respawnTime: number;  // seconds
  readonly color: string;
  readonly label: string;
}

export const PICKUP_CONFIGS: Readonly<Record<PickupType, PickupConfig>> = {
  Health: {
    type: 'Health',
    value: 40,
    respawnTime: 20,
    color: '#44ff44',
    label: 'HP',
  },
  Shield: {
    type: 'Shield',
    value: 5,   // seconds
    respawnTime: 30,
    color: '#4488ff',
    label: 'SHIELD',
  },
  Ammo: {
    type: 'Ammo',
    value: 1,   // full reload
    respawnTime: 15,
    color: '#ffdd44',
    label: 'AMMO',
  },
  SpeedBoost: {
    type: 'SpeedBoost',
    value: 8,   // seconds
    respawnTime: 25,
    color: '#ff44ff',
    label: 'SPEED',
  },
  RapidFire: {
    type: 'RapidFire',
    value: 10,  // seconds
    respawnTime: 40,
    color: '#44ffff',
    label: 'RAPID',
  },
} as const;
