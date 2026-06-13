// ─── Collision Group Bitmasks ─────────────────────────────────────────────────
// Each group occupies a distinct bit so groups can be combined via bitwise OR.
// These map directly to Rapier's collision group API when integrated.

export const PLAYER            = 0b00000001;
export const ENEMY             = 0b00000010;
export const PROJECTILE_PLAYER = 0b00000100;
export const PROJECTILE_ENEMY  = 0b00001000;
export const WALL              = 0b00010000;
export const OBSTACLE          = 0b00100000;
export const PICKUP            = 0b01000000;
