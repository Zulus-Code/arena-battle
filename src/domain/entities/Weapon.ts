// ─── Weapon Entity ────────────────────────────────────────────────────────────

export type WeaponId = string;

export interface WeaponData {
  readonly id: WeaponId;
  readonly name: string;
  readonly damage: number;
  readonly projectileSpeed: number;
  readonly fireRate: number;       // shots per second
  readonly maxAmmo: number;
  readonly ammo: number;
  readonly cooldown: number;       // current cooldown remaining
  readonly projectileRadius: number;
  readonly splashRadius: number;   // 0 = no splash
  readonly color: string;
}

export function createWeapon(config: Omit<WeaponData, 'ammo' | 'cooldown'>): WeaponData {
  return {
    ...config,
    ammo: config.maxAmmo,
    cooldown: 0,
  };
}

export function canFire(weapon: WeaponData): boolean {
  return weapon.cooldown <= 0 && weapon.ammo > 0;
}

export function fireWeapon(weapon: WeaponData): WeaponData {
  return {
    ...weapon,
    ammo: weapon.ammo - 1,
    cooldown: 1 / weapon.fireRate,
  };
}

export function reloadAmmo(weapon: WeaponData): WeaponData {
  return { ...weapon, ammo: weapon.maxAmmo };
}

export function tickWeapon(weapon: WeaponData, dt: number): WeaponData {
  if (weapon.cooldown <= 0) return weapon;
  return { ...weapon, cooldown: Math.max(0, weapon.cooldown - dt) };
}
