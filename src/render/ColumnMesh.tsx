// ─── Column Mesh ───────────────────────────────────────────────────────────────
// Renders obstacles as round architectural columns with base, capital,
// and fluting. Supports destruction via damage color + cracks.
// Uses procedural stone texture for the shaft.

import { useMemo } from 'react';
import type { ObstacleData } from '@/domain/entities/Arena';
import { createColumnStoneTexture } from './proceduralTextures';

interface ColumnMeshProps {
  readonly data: ObstacleData;
}

interface CrackDef {
  readonly pos: [number, number, number];
  readonly rot: [number, number, number];
  readonly size: [number, number, number];
}

function getDamageColor(hp: number, maxHp: number): string {
  if (maxHp <= 0) return '#b8a88a';
  const ratio = hp / maxHp;
  if (ratio > 0.6) return '#b8a88a';
  if (ratio > 0.3) return '#8a7a6a';
  return '#5a4a3a';
}

function getCrackCount(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  const ratio = hp / maxHp;
  if (ratio > 0.6) return 0;
  if (ratio > 0.3) return 1;
  return 2;
}

function generateCracks(count: number, sx: number, sz: number, sy: number): CrackDef[] {
  const cracks: CrackDef[] = [];
  // Use a small seed variation per column to make cracks look organic
  const seed = Math.floor(sx * 100 + sz * 100 + sy * 100) % 1000;
  const pseudoRandom = ((n: number) => {
    const x = Math.sin(n * 127.1 + seed) * 43758.5453;
    return x - Math.floor(x);
  });

  for (let i = 0; i < count; i++) {
    const px = (pseudoRandom(i * 3) - 0.5) * sx * 0.5;
    const py = (pseudoRandom(i * 3 + 1) - 0.5) * sy * 0.6;
    const pz = (pseudoRandom(i * 3 + 2) - 0.5) * sz * 0.5;
    const angle = pseudoRandom(i) * 1.2 + 0.3;

    cracks.push({
      pos: [px, py, pz],
      rot: [0, 0, angle],
      size: [0.04, 0.02, pseudoRandom(i + 10) * 0.3 + 0.15],
    });
  }
  return cracks;
}

export function ColumnMesh({ data }: ColumnMeshProps) {
  const { size, position, rotation, hp, maxHp } = data;

  if (hp <= 0) return null;
  const sx = size.x;
  const sz = size.z;
  const sy = size.y;

  const color = getDamageColor(hp, maxHp);
  const crackCount = getCrackCount(hp, maxHp);

  // Column radius — average of x and z for a round shaft
  const radius = Math.min(sx, sz) * 0.35;
  const shaftHeight = sy * 0.72;
  const shaftY = sy * 0.04;

  // Procedural stone texture (shared, cached)
  const stoneTex = useMemo(() => createColumnStoneTexture(), []);

  // Fluting grooves — vertical indent strips around the shaft
  const flutePositions = useMemo<number[]>(() => {
    const count = 8;
    return Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2);
  }, []);

  const baseSize: [number, number, number] = [sx + 0.3, 0.15, sz + 0.3];
  const baseY = -sy * 0.5 + 0.075;
  const capSize: [number, number, number] = [sx + 0.25, 0.2, sz + 0.25];
  const capY = sy * 0.5 - 0.1;

  const cracks = useMemo<CrackDef[]>(
    () => generateCracks(crackCount, sx, sz, sy),
    [crackCount, sx, sz, sy],
  );

  return (
    <group position={[position.x, position.y, position.z]} rotation={[0, rotation, 0]}>
      {/* ── Base pedestal ── */}
      <mesh position={[0, baseY, 0]} castShadow receiveShadow>
        <boxGeometry args={baseSize} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>

      {/* ── Capital (top) ── */}
      <mesh position={[0, capY, 0]} castShadow receiveShadow>
        <boxGeometry args={capSize} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* ── Shaft (round cylinder with stone texture) ── */}
      <mesh position={[0, shaftY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.02, shaftHeight, 20]} />
        <meshStandardMaterial
          map={stoneTex}
          color={color}
          roughness={0.78}
          metalness={0.05}
        />
      </mesh>

      {/* ── Fluting (subtle vertical grooves) ── */}
      {flutePositions.map((angle, i) => {
        const fx = Math.cos(angle) * (radius - 0.015);
        const fz = Math.sin(angle) * (radius - 0.015);
        return (
          <mesh
            key={`flute-${i}`}
            position={[fx, shaftY, fz]}
            rotation={[0, -angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.03, shaftHeight * 0.85, 0.04]} />
            <meshStandardMaterial color="#9a8a7a" roughness={0.85} />
          </mesh>
        );
      })}

      {/* ── Cracks ── */}
      {cracks.map((crack, i) => (
        <mesh key={`crack-${i}`} position={crack.pos} rotation={crack.rot}>
          <boxGeometry args={crack.size} />
          <meshStandardMaterial color="#3a2a1a" roughness={1} transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
}
