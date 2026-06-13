// ─── Arena Mesh ───────────────────────────────────────────────────────────────
// Renders the arena floor (with grid), walls, corner pillars, and obstacles.

import { useMemo } from 'react';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { ARENA_CONFIG } from '@/config/ArenaConfig';
import { ColumnMesh } from './ColumnMesh';
import { createFloorTexture } from './proceduralTextures';
import * as THREE from 'three';

export function ArenaMesh() {
  const arena = useGameWorldStore((s) => s.arena);

  // Hooks must run on every render. The arena can be null during boot/menu,
  // then appear when a level starts, so keep this before the early return.
  const floorTex = useMemo(() => createFloorTexture(), []);

  if (!arena) return null;

  const { width, depth, obstacles } = arena;
  const { wallHeight } = ARENA_CONFIG;
  const hw = width / 2;
  const hd = depth / 2;

  return (
    <group>
      {/* Floor with grid */}
      <GridFloor width={width} depth={depth} map={floorTex} />

      {/* Walls */}
      <Wall position={[0, wallHeight / 2, -hd]} size={[width + 2, wallHeight, ARENA_CONFIG.wallThickness]} />
      <Wall position={[0, wallHeight / 2, hd]} size={[width + 2, wallHeight, ARENA_CONFIG.wallThickness]} />
      <Wall position={[-hw, wallHeight / 2, 0]} size={[ARENA_CONFIG.wallThickness, wallHeight, depth + 2]} />
      <Wall position={[hw, wallHeight / 2, 0]} size={[ARENA_CONFIG.wallThickness, wallHeight, depth + 2]} />

      {/* Corner pillars */}
      <CornerPillar corner={[-hw, -hd]} wallHeight={wallHeight} wallThickness={ARENA_CONFIG.wallThickness} />
      <CornerPillar corner={[hw, -hd]} wallHeight={wallHeight} wallThickness={ARENA_CONFIG.wallThickness} />
      <CornerPillar corner={[-hw, hd]} wallHeight={wallHeight} wallThickness={ARENA_CONFIG.wallThickness} />
      <CornerPillar corner={[hw, hd]} wallHeight={wallHeight} wallThickness={ARENA_CONFIG.wallThickness} />

      {/* Obstacles (columns) */}
      {obstacles.map((obs) => (
        <ColumnMesh key={obs.id} data={obs} />
      ))}
    </group>
  );
}

// ─── Corner Pillar ────────────────────────────────────────────────────────────

interface CornerPillarProps {
  readonly corner: [number, number];
  readonly wallHeight: number;
  readonly wallThickness: number;
}

function CornerPillar({ corner, wallHeight, wallThickness }: CornerPillarProps) {
  const pillarSize = wallThickness * 1.4;
  return (
    <mesh
      position={[corner[0], wallHeight / 2, corner[1]]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[pillarSize, wallHeight * 1.15, pillarSize]} />
      <meshStandardMaterial
        color="#3a4a3a"
        roughness={0.6}
        metalness={0.25}
      />
    </mesh>
  );
}

// ─── Wall ─────────────────────────────────────────────────────────────────────

interface WallProps {
  readonly position: [number, number, number];
  readonly size: [number, number, number];
}

function Wall({ position, size }: WallProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={ARENA_CONFIG.wallColor}
        roughness={0.55}
        metalness={0.3}
      />
    </mesh>
  );
}

// ─── Grid Floor ───────────────────────────────────────────────────────────────

interface GridFloorProps {
  readonly width: number;
  readonly depth: number;
  readonly map: THREE.CanvasTexture;
}

function GridFloor({ width, depth, map }: GridFloorProps) {
  const gridSize = 2;
  const maxDim = Math.max(width, depth);
  const gridRepeat = maxDim / 8; // tile size ~8 world units

  const gridHelper = useMemo(() => {
    const g = new THREE.GridHelper(
      maxDim,
      maxDim / gridSize,
      '#555566',
      '#444455',
    );
    g.position.y = 0.002;
    g.material.transparent = true;
    g.material.opacity = 0.25;
    return g;
  }, [maxDim]);

  // Clone floor texture and set repeats
  const tiledMap = useMemo(() => {
    const t = map.clone();
    t.repeat.set(gridRepeat, gridRepeat);
    t.needsUpdate = true;
    return t;
  }, [map, gridRepeat]);

  return (
    <group>
      {/* Solid floor with procedural concrete texture */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          map={tiledMap}
          roughness={0.85}
          metalness={0.05}
          color="#cccccc"
        />
      </mesh>

      {/* Subtle edge trim — darker border around arena */}
      <EdgeTrim width={width} depth={depth} />

      {/* Grid overlay */}
      <primitive object={gridHelper} />
    </group>
  );
}

// ─── Edge Trim ────────────────────────────────────────────────────────────────

interface EdgeTrimProps {
  readonly width: number;
  readonly depth: number;
}

function EdgeTrim({ width, depth }: EdgeTrimProps) {
  const trimWidth = 0.35;
  const hw = width / 2 - trimWidth / 2;
  const hd = depth / 2 - trimWidth / 2;

  const trims: { pos: [number, number, number]; size: [number, number] }[] = [
    { pos: [0, 0, -hd], size: [width, trimWidth] },
    { pos: [0, 0, hd], size: [width, trimWidth] },
    { pos: [-hw, 0, 0], size: [trimWidth, depth] },
    { pos: [hw, 0, 0], size: [trimWidth, depth] },
  ];

  return (
    <>
      {trims.map((trim, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[trim.pos[0], 0.001, trim.pos[1]]}
          receiveShadow
        >
          <planeGeometry args={trim.size} />
          <meshStandardMaterial
            color="#1a2a1a"
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>
      ))}
    </>
  );
}
