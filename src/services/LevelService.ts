// ─── Level Service ─────────────────────────────────────────────────────────────
// Level lifecycle management — orchestrates full level builds.

import type { LevelConfig } from '@/config/LevelConfig';
import type { ArenaData, ObstacleData } from '@/domain/entities/Arena';
import type { PlayerData } from '@/domain/entities/Player';
import type { PickupData } from '@/domain/entities/Pickup';
import type { GameSessionData } from '@/domain/entities/GameSession';
import { createHealth } from '@/domain/entities/Health';
import { createShield } from '@/domain/entities/Shield';
import { createWeapon } from '@/domain/entities/Weapon';
import { createGameSession } from '@/domain/entities/GameSession';
import { PLAYER_CONFIG } from '@/config/PlayerConfig';
import { ARENA_CONFIG } from '@/config/ArenaConfig';
import { DEFAULT_PLAYER_WEAPON } from '@/config/WeaponConfig';
import { UPGRADES } from '@/config/UpgradeConfig';
import { StatsService } from '@/services/StatsService';
import { randomService } from '@/core/RandomService';
import { spawnPickups } from './SpawnService';
import { v4 as uuidv4 } from 'uuid';

function createDefaultPlayer(): PlayerData {
  // Apply permanent upgrades from StatsService
  const stats = StatsService.load();

  const hpLevel = stats.upgrades.max_hp ?? 0;
  const speedLevel = stats.upgrades.speed ?? 0;
  const damageLevel = stats.upgrades.damage ?? 0;
  const ammoLevel = stats.upgrades.max_ammo ?? 0;

  // Apply upgrade formulas
  const maxHealth = UPGRADES[0].apply(PLAYER_CONFIG.maxHealth, hpLevel);
  const speed = UPGRADES[1].apply(PLAYER_CONFIG.speed, speedLevel);
  const weaponDamage = UPGRADES[2].apply(DEFAULT_PLAYER_WEAPON.damage, damageLevel);
  const maxAmmo = UPGRADES[3].apply(DEFAULT_PLAYER_WEAPON.maxAmmo, ammoLevel);

  return {
    id: uuidv4(),
    position: { ...PLAYER_CONFIG.startPosition },
    rotation: 0,
    velocity: { x: 0, y: 0, z: 0 },
    health: createHealth(maxHealth),
    shield: createShield(),
    weapon: createWeapon({
      ...DEFAULT_PLAYER_WEAPON,
      damage: weaponDamage,
      maxAmmo,
    }),
    status: 'Alive',
    score: 0,
    speed,
    turnSpeed: PLAYER_CONFIG.turnSpeed,
    speedBoostTimer: 0,
    rapidFireTimer: 0,
  };
}

/** Generate arena data with randomized obstacles */
export function buildArena(config: LevelConfig): ArenaData {
  const obstacles: ObstacleData[] = [];
  const margin = ARENA_CONFIG.obstacleMaxSize;
  const halfW = config.arenaWidth / 2 - margin;
  const halfD = config.arenaDepth / 2 - margin;

  for (let i = 0; i < config.obstacleCount; i++) {
    obstacles.push({
      id: uuidv4(),
      position: {
        x: randomService.range(-halfW, halfW),
        y: ARENA_CONFIG.obstacleHeight / 2,
        z: randomService.range(-halfD, halfD),
      },
      size: {
        x: randomService.range(ARENA_CONFIG.obstacleMinSize, ARENA_CONFIG.obstacleMaxSize),
        y: ARENA_CONFIG.obstacleHeight,
        z: randomService.range(ARENA_CONFIG.obstacleMinSize, ARENA_CONFIG.obstacleMaxSize),
      },
      rotation: randomService.range(0, Math.PI * 2),
      destructible: true,
      hp: 100,
      maxHp: 100,
    });
  }

  return {
    width: config.arenaWidth,
    depth: config.arenaDepth,
    wallThickness: ARENA_CONFIG.wallThickness,
    obstacles,
  };
}

/** Build all entities and state for a level (enemies are spawned separately in initLevel with delays) */
export function buildLevelData(config: LevelConfig): {
  readonly arena: ArenaData;
  readonly player: PlayerData;
  readonly pickups: readonly PickupData[];
  readonly session: GameSessionData;
} {
  const arena = buildArena(config);
  const player = createDefaultPlayer();
  const pickups = spawnPickups(config, arena.obstacles, { x: config.arenaWidth / 2, z: config.arenaDepth / 2 });
  const session: GameSessionData = { ...createGameSession(), level: config.index + 1 };

  return { arena, player, pickups, session };
}
