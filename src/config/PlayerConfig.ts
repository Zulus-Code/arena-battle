// ─── Player Configuration ─────────────────────────────────────────────────────

export const PLAYER_CONFIG = {
  maxHealth: 150,
  speed: 10,
  turnSpeed: 3.0,
  startPosition: { x: 0, y: 0.5, z: 0 },
  shieldDuration: 5,    // seconds
} as const;
