export const ARENA = { half: 22, wallHeight: 3, wallThickness: 1.5 } as const

export type PlayerVehicleKind = 'buggy' | 'tank'

export interface PlayerVehicleStats {
  speed: number
  hp: number
  turnSpeed: number
  radius: number
}

export const PLAYER_VEHICLES: Record<PlayerVehicleKind, PlayerVehicleStats> = {
  buggy: { speed: 15, hp: 100, turnSpeed: 2.8, radius: 1.1 },
  tank: { speed: 10.5, hp: 160, turnSpeed: 2.0, radius: 1.45 },
}

export const PLAYER = {
  speed: 15,
  hp: 100,
  radius: 1.1,
  turnSpeed: 2.8,
  fireDelay: 0.16,
  bulletSpeed: 55,
  damage: 12,
} as const

export type EnemyKind = 'scout' | 'tank' | 'boss'

export interface EnemyStats {
  hp: number
  speed: number
  radius: number
  color: number
  fireDelay: number
  bulletSpeed: number
  damage: number
  score: number
  range: number
}

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  scout: { hp: 30, speed: 8, radius: 0.9, color: 0xc9634a, fireDelay: 1.3, bulletSpeed: 26, damage: 8, score: 100, range: 30 },
  tank: { hp: 90, speed: 4.5, radius: 1.4, color: 0xc79546, fireDelay: 2.0, bulletSpeed: 22, damage: 18, score: 250, range: 26 },
  boss: { hp: 420, speed: 3.4, radius: 2.2, color: 0x8f6fae, fireDelay: 0.9, bulletSpeed: 28, damage: 14, score: 2000, range: 34 },
}

export const WAVE = { baseCount: 4, growth: 2, spawnGap: 1.1, interWave: 3 } as const

export const BULLET = { radius: 0.3, life: 2.2, max: 240 } as const
