// ─── Weapon Service ───────────────────────────────────────────────────────────
// Weapon lifecycle management: creation, firing, reloading.

import type { WeaponData } from '@/domain/entities/Weapon';
import { createWeapon, canFire, fireWeapon, reloadAmmo } from '@/domain/entities/Weapon';
import { WEAPON_CONFIGS, DEFAULT_PLAYER_WEAPON } from '@/config/WeaponConfig';

/** Create a weapon from a named config or the default player weapon */
export function createDefaultWeapon(weaponId?: string): WeaponData {
  const config = weaponId && weaponId in WEAPON_CONFIGS
    ? WEAPON_CONFIGS[weaponId]
    : DEFAULT_PLAYER_WEAPON;
  return createWeapon(config);
}

/** Check cooldown/ammo and fire if possible. Returns updated weapon + canFire flag. */
export function fireWeaponWithCheck(weapon: WeaponData): { weapon: WeaponData; canFire: boolean } {
  if (!canFire(weapon)) {
    return { weapon, canFire: false };
  }
  return { weapon: fireWeapon(weapon), canFire: true };
}

/** Fully replenish weapon ammo */
export function replenishAmmo(weapon: WeaponData): WeaponData {
  return reloadAmmo(weapon);
}
