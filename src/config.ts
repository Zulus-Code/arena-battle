export const ARENA = { half: 22, wallHeight: 3, wallThickness: 1.5 } as const

export type PlayerVehicleKind = 'buggy' | 'tank' | 'heavy'

export interface PlayerVehicleStats {
  speed: number
  hp: number
  turnSpeed: number
  radius: number
  damage: number
  fireDelay: number
  bulletSpeed: number
  bulletRadius: number
}

export const PLAYER_VEHICLES: Record<PlayerVehicleKind, PlayerVehicleStats> = {
  buggy: { hp: 90, speed: 15, turnSpeed: 2.8, radius: 1.1, damage: 9, fireDelay: 0.14, bulletSpeed: 60, bulletRadius: 0.22 },
  tank: { hp: 160, speed: 10.5, turnSpeed: 2.0, radius: 1.45, damage: 16, fireDelay: 0.22, bulletSpeed: 45, bulletRadius: 0.32 },
  heavy: { hp: 240, speed: 7.0, turnSpeed: 1.5, radius: 1.9, damage: 26, fireDelay: 0.35, bulletSpeed: 32, bulletRadius: 0.45 },
}

export type EnemyKind = 'scout' | 'tank' | 'boss'

export interface EnemyStats {
  hp: number
  speed: number
  radius: number
  color: number
  fireDelay: number
  bulletSpeed: number
  bulletRadius: number
  damage: number
  score: number
  detectRange: number
  fireRange: number
  approachRange: number
  reaction: number
}

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  scout: {
    hp: 30,
    speed: 8,
    radius: 0.9,
    color: 0xc9634a,
    fireDelay: 1.3,
    bulletSpeed: 26,
    bulletRadius: 0.3,
    damage: 8,
    score: 100,
    detectRange: 16,
    fireRange: 12,
    approachRange: 9,
    reaction: 0.45,
  },
  tank: {
    hp: 90,
    speed: 4.5,
    radius: 1.4,
    color: 0xc79546,
    fireDelay: 2.0,
    bulletSpeed: 22,
    bulletRadius: 0.3,
    damage: 18,
    score: 250,
    detectRange: 18,
    fireRange: 14,
    approachRange: 11,
    reaction: 0.7,
  },
  boss: {
    hp: 420,
    speed: 3.4,
    radius: 2.2,
    color: 0x8f6fae,
    fireDelay: 0.9,
    bulletSpeed: 28,
    bulletRadius: 0.3,
    damage: 14,
    score: 2000,
    detectRange: 22,
    fireRange: 17,
    approachRange: 13,
    reaction: 0.8,
  },
}

export const WAVE = { baseCount: 4, growth: 2, spawnGap: 1.1, interWave: 3 } as const

export const BULLET = { life: 2.2, max: 240 } as const
