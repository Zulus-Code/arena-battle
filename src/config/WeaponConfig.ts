// ─── Weapon Configuration ─────────────────────────────────────────────────────
// All weapon stats are defined here. Change balance here — not in code.

import type { WeaponData } from '@/domain/entities/Weapon';

type WeaponConfig = Omit<WeaponData, 'ammo' | 'cooldown'>;

export const WEAPON_CONFIGS: Readonly<Record<string, WeaponConfig>> = {
  StandardCannon: {
    id: 'StandardCannon',
    name: 'Standard Cannon',
    damage: 25,
    projectileSpeed: 16,
    fireRate: 2.0,
    maxAmmo: 30,
    projectileRadius: 0.3,
    splashRadius: 0,
    color: '#ffdd44',
  },
  HeavyCannon: {
    id: 'HeavyCannon',
    name: 'Heavy Cannon',
    damage: 60,
    projectileSpeed: 10,
    fireRate: 0.8,
    maxAmmo: 12,
    projectileRadius: 0.4,
    splashRadius: 2.0,
    color: '#ff6600',
  },
  RapidFire: {
    id: 'RapidFire',
    name: 'Rapid Fire',
    damage: 6,
    projectileSpeed: 18,
    fireRate: 3,
    maxAmmo: 80,
    projectileRadius: 0.15,
    splashRadius: 0,
    color: '#44ffaa',
  },
} as const;

export const DEFAULT_PLAYER_WEAPON = WEAPON_CONFIGS.StandardCannon;
