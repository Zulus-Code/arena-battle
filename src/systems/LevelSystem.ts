// ─── Level System ─────────────────────────────────────────────────────────────
// Handles level initialization, enemy wave spawning, arena generation.

import type { LevelConfig } from '@/config/LevelConfig';
import type { ArenaData, ObstacleData } from '@/domain/entities/Arena';
import type { EnemyData } from '@/domain/entities/Enemy';
import type { PickupData } from '@/domain/entities/Pickup';
import type { PlayerData } from '@/domain/entities/Player';
import { ENEMY_CONFIGS } from '@/config/EnemyConfig';
import { WEAPON_CONFIGS } from '@/config/WeaponConfig';
import { PLAYER_CONFIG } from '@/config/PlayerConfig';
import { PICKUP_CONFIGS } from '@/config/PickupConfig';
import { createHealth } from '@/domain/entities/Health';
import { createShield } from '@/domain/entities/Shield';
import { createWeapon } from '@/domain/entities/Weapon';
import { createGameSession } from '@/domain/entities/GameSession';
import type { GameSessionData } from '@/domain/entities/GameSession';
import { ARENA_CONFIG } from '@/config/ArenaConfig';
import { randomService } from '@/core/RandomService';
import { v4 as uuidv4 } from 'uuid';

const PLAYER_ID = 'player-1';

export function buildArena(config: LevelConfig): ArenaData {
  const hw = config.arenaWidth / 2;
  const hd = config.arenaDepth / 2;
  const obstacles: ObstacleData[] = [];

  for (let i = 0; i < config.obstacleCount; i++) {
    const size = randomService.range(ARENA_CONFIG.obstacleMinSize, ARENA_CONFIG.obstacleMaxSize);
    const x = randomService.range(-hw + size + 2, hw - size - 2);
    const z = randomService.range(-hd + size + 2, hd - size - 2);

    // Don't spawn obstacles on player start position
    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;

    obstacles.push({
      id: `obstacle-${i}`,
      position: { x, y: ARENA_CONFIG.obstacleHeight / 2, z },
      size: {
        x: size,
        y: ARENA_CONFIG.obstacleHeight,
        z: randomService.range(ARENA_CONFIG.obstacleMinSize, ARENA_CONFIG.obstacleMaxSize),
      },
      rotation: randomService.range(0, Math.PI),
      destructible: false,
      hp: 0,
      maxHp: 0,
    });
  }

  return {
    width: config.arenaWidth,
    depth: config.arenaDepth,
    wallThickness: ARENA_CONFIG.wallThickness,
    obstacles,
  };
}

export function buildPlayer(): PlayerData {
  const weapon = createWeapon(WEAPON_CONFIGS[Object.keys(WEAPON_CONFIGS)[0]]);
  return {
    id: PLAYER_ID,
    position: PLAYER_CONFIG.startPosition,
    rotation: 0,
    velocity: { x: 0, y: 0, z: 0 },
    health: createHealth(PLAYER_CONFIG.maxHealth),
    shield: createShield(),
    weapon,
    status: 'Alive',
    score: 0,
    speed: PLAYER_CONFIG.speed,
    turnSpeed: PLAYER_CONFIG.turnSpeed,
  };
}

export function buildEnemies(config: LevelConfig, arenaHalf: { x: number; z: number }): EnemyData[] {
  const enemies: EnemyData[] = [];

  for (const wave of config.enemyWaves) {
    const enemyConfig = ENEMY_CONFIGS[wave.type];
    const weaponConfig = WEAPON_CONFIGS[enemyConfig.weaponId];

    for (let i = 0; i < wave.count; i++) {
      // Spawn on edges, away from player
      const angle = randomService.range(0, Math.PI * 2);
      const dist = randomService.range(arenaHalf.x * 0.5, arenaHalf.x * 0.85);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      enemies.push({
        id: uuidv4(),
        type: wave.type,
        faction: 'Enemy',
        position: { x, y: 0.5, z },
        rotation: angle + Math.PI,
        velocity: { x: 0, y: 0, z: 0 },
        health: createHealth(enemyConfig.maxHealth),
        shield: createShield(),
        weapon: createWeapon(weaponConfig),
        status: 'Alive',
        aiState: 'SEARCH',
        aiTimer: 0,
        targetId: PLAYER_ID,
        speed: enemyConfig.speed,
        turnSpeed: enemyConfig.turnSpeed,
        detectionRange: enemyConfig.detectionRange,
        attackRange: enemyConfig.attackRange,
        scoreReward: enemyConfig.scoreReward,
        isBoss: enemyConfig.isBoss,
      });
    }
  }

  return enemies;
}

export function buildPickups(config: LevelConfig): PickupData[] {
  return config.pickups.map((p) => {
    const pickupConfig = PICKUP_CONFIGS[p.type];
    return {
      id: uuidv4(),
      type: p.type,
      position: { x: p.position.x, y: 0.5, z: p.position.z },
      active: true,
      respawnTimer: 0,
      value: pickupConfig.value,
    };
  });
}

export function buildSession(): GameSessionData {
  return createGameSession();
}
