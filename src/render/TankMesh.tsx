// ─── Tank Mesh ────────────────────────────────────────────────────────────────
// Detailed combat buggy/jeep with roof-mounted gun. Procedural textures,
// panel details, exhaust, suspension, and PBR materials.

import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PlayerData } from '@/domain/entities/Player';
import type { EnemyData } from '@/domain/entities/Enemy';
import { createBodyRoughnessMap, createMetallicFlakeTexture } from './proceduralTextures';
import * as THREE from 'three';

type TankData = PlayerData | EnemyData;

interface TankMeshProps {
  readonly data: TankData;
  readonly faction: 'Player' | 'Enemy';
}

const COLORS = {
  // Both factions share a unified khaki/olive drab military scheme.
  // Only headlight/emissive color differs for quick IFF at a glance.
  Player: {
    underbody: '#4a4030',
    body:      '#8b7d5e',
    cabin:     '#5c5239',
    gun:       '#7a6f54',
    wheel:     '#1a1a1a',
    headlight: '#ffffcc',
    glass:     '#2a2a20',
    exhaust:   '#3a3a3a',
    trim:      '#3d3528',
    seat:      '#1a1a1a',
    ammo:      '#d4a844',  // brass/gold casings
  },
  Enemy: {
    underbody: '#4a4030',
    body:      '#8b7d5e',
    cabin:     '#5c5239',
    gun:       '#7a6f54',
    wheel:     '#1a1a1a',
    headlight: '#ffcc66',
    glass:     '#2a2a20',
    exhaust:   '#3a3a3a',
    trim:      '#3d3528',
    seat:      '#1a1a1a',
    ammo:      '#b87333',  // copper/rust casings
  },
} as const;

type FactionColors = (typeof COLORS)['Player'] | (typeof COLORS)['Enemy'];

// ─── Shared Textures ──────────────────────────────────────────────────────────
// Created once per faction pair, shared across all tanks.

function useBodyTextures() {
  return useMemo(() => ({
    roughnessMap: createBodyRoughnessMap(),
    metalnessMap: createMetallicFlakeTexture(),
  }), []);
}

function Bolt({ position, color = '#7d8390' }: {
  readonly position: [number, number, number];
  readonly color?: string;
}) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.022, 0.022, 0.012, 6]} />
      <meshStandardMaterial color={color} roughness={0.32} metalness={0.88} />
    </mesh>
  );
}

function ArmorRivets({ c }: { readonly c: FactionColors }) {
  const hoodBolts: [number, number, number][] = [
    [-0.43, 0.305, 0.84], [0.43, 0.305, 0.84],
    [-0.43, 0.285, 0.55], [0.43, 0.285, 0.55],
    [-0.52, 0.265, -0.24], [0.52, 0.265, -0.24],
    [-0.52, 0.265, 0.24], [0.52, 0.265, 0.24],
  ];

  return (
    <>
      {hoodBolts.map((pos, index) => <Bolt key={index} position={pos} color={c.trim} />)}
      {[-0.66, 0.66].map(x => (
        <group key={x}>
          {[-0.55, -0.2, 0.15, 0.5].map(z => (
            <mesh key={z} position={[x, 0.18, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.012, 6]} />
              <meshStandardMaterial color={c.trim} roughness={0.35} metalness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

// ─── Body ─────────────────────────────────────────────────────────────────────

function CarBody({
  faction,
  roughnessMap,
  metalnessMap,
}: {
  readonly faction: 'Player' | 'Enemy';
  readonly roughnessMap: THREE.CanvasTexture;
  readonly metalnessMap: THREE.CanvasTexture;
}) {
  const c = COLORS[faction];
  return (
    <>
      {/* ── Underbody chassis plate ── */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.06, 2.4]} />
        <meshStandardMaterial
          color={c.underbody}
          roughness={0.75}
          metalness={0.25}
        />
      </mesh>

      {/* ── Main body tub ── */}
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.16, 1.8]} />
        <meshStandardMaterial
          color={c.body}
          roughness={0.45}
          metalness={0.55}
          roughnessMap={roughnessMap}
          metalnessMap={metalnessMap}
        />
      </mesh>

      {/* ── Sloped armored nose panels ── */}
      <mesh position={[0, 0.28, 0.98]} rotation={[-0.22, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.05, 0.36]} />
        <meshStandardMaterial
          color={c.body}
          roughness={0.42}
          metalness={0.62}
          roughnessMap={roughnessMap}
          metalnessMap={metalnessMap}
        />
      </mesh>

      <mesh position={[-0.58, 0.24, 0.48]} rotation={[0, 0, -0.18]} castShadow>
        <boxGeometry args={[0.08, 0.18, 0.82]} />
        <meshStandardMaterial color={c.body} roughness={0.5} metalness={0.55} />
      </mesh>
      <mesh position={[0.58, 0.24, 0.48]} rotation={[0, 0, 0.18]} castShadow>
        <boxGeometry args={[0.08, 0.18, 0.82]} />
        <meshStandardMaterial color={c.body} roughness={0.5} metalness={0.55} />
      </mesh>

      {/* ── Front hood (slightly raised) ── */}
      <mesh position={[0, 0.27, 0.75]} castShadow>
        <boxGeometry args={[1.1, 0.05, 0.5]} />
        <meshStandardMaterial
          color={c.body}
          roughness={0.4}
          metalness={0.6}
          roughnessMap={roughnessMap}
          metalnessMap={metalnessMap}
        />
      </mesh>

      {/* ── Hood scoop / intake ── */}
      <mesh position={[0, 0.31, 0.58]} castShadow>
        <boxGeometry args={[0.35, 0.025, 0.2]} />
        <meshStandardMaterial
          color={c.trim}
          roughness={0.5}
          metalness={0.7}
        />
      </mesh>

      {/* ── Dark intake opening gives the hood real depth ── */}
      <mesh position={[0, 0.326, 0.675]} castShadow>
        <boxGeometry args={[0.28, 0.012, 0.04]} />
        <meshStandardMaterial color="#06080c" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* ── Rear deck ── */}
      <mesh position={[0, 0.27, -0.7]} castShadow>
        <boxGeometry args={[1.1, 0.05, 0.45]} />
        <meshStandardMaterial
          color={c.body}
          roughness={0.4}
          metalness={0.6}
          roughnessMap={roughnessMap}
          metalnessMap={metalnessMap}
        />
      </mesh>

      {/* ── Rear strapped cargo/fuel cells ── */}
      <mesh position={[-0.36, 0.37, -0.72]} rotation={[0, 0, 0.08]} castShadow>
        <boxGeometry args={[0.22, 0.22, 0.12]} />
        <meshStandardMaterial color="#4c3320" roughness={0.82} metalness={0.15} />
      </mesh>
      <mesh position={[0.36, 0.37, -0.72]} rotation={[0, 0, -0.08]} castShadow>
        <boxGeometry args={[0.22, 0.22, 0.12]} />
        <meshStandardMaterial color="#29351f" roughness={0.78} metalness={0.18} />
      </mesh>
      {[-0.36, 0.36].map(x => (
        <mesh key={x} position={[x, 0.485, -0.72]} castShadow>
          <boxGeometry args={[0.24, 0.018, 0.14]} />
          <meshStandardMaterial color={c.trim} roughness={0.5} metalness={0.65} />
        </mesh>
      ))}

      {/* ── Left fender ── */}
      <mesh position={[-0.69, 0.13, 0]} castShadow>
        <boxGeometry args={[0.18, 0.08, 1.5]} />
        <meshStandardMaterial
          color={c.body}
          roughness={0.45}
          metalness={0.55}
          roughnessMap={roughnessMap}
          metalnessMap={metalnessMap}
        />
      </mesh>

      {/* ── Right fender ── */}
      <mesh position={[0.69, 0.13, 0]} castShadow>
        <boxGeometry args={[0.18, 0.08, 1.5]} />
        <meshStandardMaterial
          color={c.body}
          roughness={0.45}
          metalness={0.55}
          roughnessMap={roughnessMap}
          metalnessMap={metalnessMap}
        />
      </mesh>

      {/* ── Side skirt panels (below fenders) ── */}
      <mesh position={[-0.61, 0.09, 0.15]} castShadow>
        <boxGeometry args={[0.04, 0.06, 1.0]} />
        <meshStandardMaterial color={c.trim} roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0.61, 0.09, 0.15]} castShadow>
        <boxGeometry args={[0.04, 0.06, 1.0]} />
        <meshStandardMaterial color={c.trim} roughness={0.5} metalness={0.7} />
      </mesh>

      {/* ── Mud/dust buildup on rocker panels ── */}
      <mesh position={[-0.705, 0.125, 0.0]} castShadow>
        <boxGeometry args={[0.018, 0.055, 1.2]} />
        <meshStandardMaterial color="#5a4028" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh position={[0.705, 0.125, 0.0]} castShadow>
        <boxGeometry args={[0.018, 0.055, 1.2]} />
        <meshStandardMaterial color="#5a4028" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* ── Front bumper / bull bar ── */}
      <mesh position={[0, 0.23, 1.01]} castShadow>
        <boxGeometry args={[1.15, 0.06, 0.06]} />
        <meshStandardMaterial color={c.trim} roughness={0.4} metalness={0.8} />
      </mesh>

      <mesh position={[-0.42, 0.33, 1.08]} rotation={[0.42, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.45, 6]} />
        <meshStandardMaterial color={c.trim} roughness={0.38} metalness={0.82} />
      </mesh>
      <mesh position={[0.42, 0.33, 1.08]} rotation={[0.42, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.45, 6]} />
        <meshStandardMaterial color={c.trim} roughness={0.38} metalness={0.82} />
      </mesh>

      {/* ── Rear bumper ── */}
      <mesh position={[0, 0.23, -0.94]} castShadow>
        <boxGeometry args={[1.15, 0.06, 0.06]} />
        <meshStandardMaterial color={c.trim} roughness={0.4} metalness={0.8} />
      </mesh>

      {/* ── Skid plate (front underbody) ── */}
      <mesh position={[0, 0.06, 0.85]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[1.0, 0.02, 0.3]} />
        <meshStandardMaterial color={c.underbody} roughness={0.6} metalness={0.7} />
      </mesh>

      {/* ── Panel seam lines (decorative thin strips) ── */}
      <mesh position={[0, 0.26, -0.15]} castShadow>
        <boxGeometry args={[1.15, 0.01, 0.015]} />
        <meshStandardMaterial color={c.trim} roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.26, 0.3]} castShadow>
        <boxGeometry args={[1.15, 0.01, 0.015]} />
        <meshStandardMaterial color={c.trim} roughness={0.8} metalness={0.1} />
      </mesh>

      <ArmorRivets c={c} />

      {/* ── Fuel cap (left side) ── */}
      <mesh position={[-0.62, 0.22, -0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.02, 8]} />
        <meshStandardMaterial color={c.trim} roughness={0.3} metalness={0.85} />
      </mesh>
    </>
  );
}

// ─── Cabin ────────────────────────────────────────────────────────────────────

function Cabin({ faction }: { readonly faction: 'Player' | 'Enemy' }) {
  const c = COLORS[faction];
  return (
    <>
      {/* ── Open cockpit tub ── */}
      <mesh position={[0, 0.34, 0.02]} castShadow>
        <boxGeometry args={[0.82, 0.1, 0.48]} />
        <meshStandardMaterial color={c.cabin} roughness={0.58} metalness={0.38} />
      </mesh>

      <mesh position={[0, 0.43, -0.04]} castShadow>
        <boxGeometry args={[0.58, 0.08, 0.3]} />
        <meshStandardMaterial color={c.seat} roughness={0.75} metalness={0.05} />
      </mesh>

      {/* ── Twin bucket seats and dashboard ── */}
      <mesh position={[-0.18, 0.49, -0.04]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.12, 0.04]} />
        <meshStandardMaterial color="#121212" roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[0.18, 0.49, -0.04]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.12, 0.04]} />
        <meshStandardMaterial color="#121212" roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.43, 0.22]} castShadow>
        <boxGeometry args={[0.42, 0.045, 0.08]} />
        <meshStandardMaterial color={c.trim} roughness={0.55} metalness={0.65} />
      </mesh>

      <mesh position={[0, 0.49, 0.19]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.13, 0.01, 6, 16]} />
        <meshStandardMaterial color={c.trim} roughness={0.45} metalness={0.75} />
      </mesh>

      {/* ── Windshield (dark glass) ── */}
      <mesh position={[0, 0.42, 0.28]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 0.16, 0.025]} />
        <meshStandardMaterial
          color={c.glass}
          roughness={0.15}
          metalness={0.2}
        />
      </mesh>

      {/* ── Windshield frame ── */}
      <mesh position={[0, 0.515, 0.29]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.76, 0.025, 0.035]} />
        <meshStandardMaterial color={c.trim} roughness={0.45} metalness={0.82} />
      </mesh>
      <mesh position={[-0.39, 0.43, 0.29]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.025, 0.18, 0.035]} />
        <meshStandardMaterial color={c.trim} roughness={0.45} metalness={0.82} />
      </mesh>
      <mesh position={[0.39, 0.43, 0.29]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.025, 0.18, 0.035]} />
        <meshStandardMaterial color={c.trim} roughness={0.45} metalness={0.82} />
      </mesh>

      {/* ── Rear cabin wall ── */}
      <mesh position={[0, 0.40, -0.18]} castShadow>
        <boxGeometry args={[0.75, 0.18, 0.03]} />
        <meshStandardMaterial color={c.cabin} roughness={0.55} metalness={0.35} />
      </mesh>

      {/* ── Exposed roll cage ── */}
      <RollCageBar position={[-0.36, 0.54, 0.04]} rotation={[0.25, 0, 0]} length={0.42} />
      <RollCageBar position={[0.36, 0.54, 0.04]} rotation={[0.25, 0, 0]} length={0.42} />
      <RollCageBar position={[-0.36, 0.55, -0.2]} rotation={[-0.2, 0, 0]} length={0.4} />
      <RollCageBar position={[0.36, 0.55, -0.2]} rotation={[-0.2, 0, 0]} length={0.4} />
      <RollCageBar position={[0, 0.68, 0.08]} rotation={[0, 0, Math.PI / 2]} length={0.8} />
      <RollCageBar position={[0, 0.66, -0.24]} rotation={[0, 0, Math.PI / 2]} length={0.72} />
      <RollCageBar position={[-0.36, 0.66, -0.08]} rotation={[Math.PI / 2, 0, 0]} length={0.34} />
      <RollCageBar position={[0.36, 0.66, -0.08]} rotation={[Math.PI / 2, 0, 0]} length={0.34} />

      {/* ── Antenna ── */}
      <mesh position={[-0.15, 0.60, -0.15]} castShadow>
        <cylinderGeometry args={[0.012, 0.016, 0.22, 6]} />
        <meshStandardMaterial color={c.underbody} roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Antenna tip */}
      <mesh position={[-0.15, 0.715, -0.15]}>
        <sphereGeometry args={[0.018, 6, 6]} />
        <meshStandardMaterial color={c.headlight} roughness={0.3} emissive={c.headlight} emissiveIntensity={0.3} />
      </mesh>
    </>
  );
}

function RollCageBar({
  position,
  rotation = [0, 0, 0],
  length = 0.16,
}: {
  readonly position: [number, number, number];
  readonly rotation?: [number, number, number];
  readonly length?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[0.02, 0.02, length, 6]} />
      <meshStandardMaterial color="#222233" roughness={0.4} metalness={0.75} />
    </mesh>
  );
}

// ─── Wheels ───────────────────────────────────────────────────────────────────

function Wheels({ faction }: { readonly faction: 'Player' | 'Enemy' }) {
  const c = COLORS[faction];
  const positions: [number, number, number][] = [
    [-0.78, 0.08, 0.82],
    [ 0.78, 0.08, 0.82],
    [-0.78, 0.08, -0.82],
    [ 0.78, 0.08, -0.82],
  ];

  return (
    <>
      {positions.map((pos, i) => (
        <group key={i}>
          {/* Double wishbone suspension */}
          <mesh
            position={[pos[0] * 0.88, 0.14, pos[2] + 0.02]}
            rotation={[0, 0, pos[0] > 0 ? -0.3 : 0.3]}
          >
            <boxGeometry args={[0.04, 0.04, 0.25]} />
            <meshStandardMaterial
              color={c.underbody}
              roughness={0.55}
              metalness={0.7}
            />
          </mesh>
          <mesh
            position={[pos[0] * 0.88, 0.04, pos[2] - 0.02]}
            rotation={[0, 0, pos[0] > 0 ? 0.28 : -0.28]}
          >
            <boxGeometry args={[0.035, 0.035, 0.24]} />
            <meshStandardMaterial color={c.underbody} roughness={0.55} metalness={0.7} />
          </mesh>

          <mesh position={[pos[0] * 0.72, 0.12, pos[2]]} rotation={[0, 0, pos[0] > 0 ? -0.08 : 0.08]}>
            <cylinderGeometry args={[0.018, 0.018, 0.32, 6]} />
            <meshStandardMaterial color="#778899" roughness={0.25} metalness={0.9} />
          </mesh>

          <CoilSpring position={[pos[0] * 0.73, 0.12, pos[2]]} rightSide={pos[0] > 0} />

          {/* Wheel tire */}
          <mesh position={pos} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.19, 0.19, 0.14, 18]} />
            <meshStandardMaterial
              color={c.wheel}
              roughness={0.85}
              metalness={0.05}
            />
          </mesh>

          {[-0.11, -0.055, 0, 0.055, 0.11].map(offset => (
            <mesh
              key={offset}
              position={[pos[0] + (pos[0] > 0 ? 0.074 : -0.074), pos[1] + offset, pos[2]]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <boxGeometry args={[0.028, 0.018, 0.16]} />
              <meshStandardMaterial color="#080808" roughness={0.9} metalness={0.02} />
            </mesh>
          ))}

          {/* Hubcap / rim (outer face) */}
          <mesh position={[pos[0] + (pos[0] > 0 ? 0.06 : -0.06), pos[1], pos[2]]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.018, 12]} />
            <meshStandardMaterial
              color="#444455"
              roughness={0.3}
              metalness={0.85}
            />
          </mesh>

          {/* Brake rotor visible behind rim */}
          <mesh position={[pos[0] + (pos[0] > 0 ? 0.048 : -0.048), pos[1], pos[2]]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.01, 16]} />
            <meshStandardMaterial color="#9a9a9a" roughness={0.28} metalness={0.88} />
          </mesh>

          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map(angle => (
            <mesh
              key={angle}
              position={[pos[0] + (pos[0] > 0 ? 0.082 : -0.082), pos[1] + Math.cos(angle) * 0.052, pos[2] + Math.sin(angle) * 0.052]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.009, 0.009, 0.012, 6]} />
              <meshStandardMaterial color="#c8ccd0" roughness={0.22} metalness={0.92} />
            </mesh>
          ))}

          {/* Hubcap center bolt */}
          <mesh position={[pos[0] + (pos[0] > 0 ? 0.072 : -0.072), pos[1], pos[2]]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 8]} />
            <meshStandardMaterial
              color="#888899"
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function CoilSpring({ position, rightSide }: {
  readonly position: [number, number, number];
  readonly rightSide: boolean;
}) {
  return (
    <mesh position={position} rotation={[0.08, 0, rightSide ? -0.08 : 0.08]} castShadow>
      <torusGeometry args={[0.052, 0.006, 5, 18]} />
      <meshStandardMaterial color="#b8c1cc" roughness={0.2} metalness={0.9} />
    </mesh>
  );
}

// ─── Exhaust ──────────────────────────────────────────────────────────────────

function ExhaustPipes({ faction }: { readonly faction: 'Player' | 'Enemy' }) {
  const c = COLORS[faction];
  return (
    <>
      {/* Left pipe */}
      <mesh position={[-0.35, 0.07, -1.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.2, 8]} />
        <meshStandardMaterial color={c.exhaust} roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh position={[-0.35, 0.13, -1.15]} castShadow>
        <boxGeometry args={[0.16, 0.06, 0.18]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.62} metalness={0.75} />
      </mesh>
      {/* Left tip */}
      <mesh position={[-0.35, 0.07, -1.33]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.028, 0.04, 8]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Right pipe */}
      <mesh position={[0.35, 0.07, -1.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.2, 8]} />
        <meshStandardMaterial color={c.exhaust} roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh position={[0.35, 0.13, -1.15]} castShadow>
        <boxGeometry args={[0.16, 0.06, 0.18]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.62} metalness={0.75} />
      </mesh>
      {/* Right tip */}
      <mesh position={[0.35, 0.07, -1.33]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.028, 0.04, 8]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.9} />
      </mesh>
    </>
  );
}

// ─── Roof Gun ─────────────────────────────────────────────────────────────────

function RoofGun({ faction, recoilRotation }: {
  readonly faction: 'Player' | 'Enemy';
  readonly recoilRotation: number;
}) {
  const c = COLORS[faction];
  if (faction === 'Enemy') {
    return <RocketLauncher c={c} recoilRotation={recoilRotation} />;
  }

  return (
    <group position={[0, 0.73, 0.05]}>
      {/* Gun mount base */}
      <mesh castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.05, 8]} />
        <meshStandardMaterial color={c.gun} roughness={0.35} metalness={0.7} />
      </mesh>

      {/* Mount ring */}
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 12]} />
        <meshStandardMaterial color={c.trim} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Barrel assembly with recoil */}
      <group rotation={[recoilRotation, 0, 0]}>
        {/* Barrel base / breech */}
        <mesh position={[0, 0.02, -0.05]} castShadow>
          <boxGeometry args={[0.12, 0.08, 0.14]} />
          <meshStandardMaterial color={c.gun} roughness={0.3} metalness={0.75} />
        </mesh>

        {/* Side ammo box */}
        <mesh position={[-0.13, 0, -0.02]} castShadow>
          <boxGeometry args={[0.12, 0.09, 0.16]} />
          <meshStandardMaterial color={c.ammo} roughness={0.42} metalness={0.68} />
        </mesh>
        {/* Ammo belt feed */}
        <mesh position={[-0.1, 0.015, 0.08]} rotation={[0.05, 0.4, 0.1]} castShadow>
          <boxGeometry args={[0.06, 0.012, 0.12]} />
          <meshStandardMaterial color={c.ammo} roughness={0.5} metalness={0.6} />
        </mesh>

        {/* Barrel tube */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.2]} castShadow>
          <cylinderGeometry args={[0.024, 0.032, 0.52, 8]} />
          <meshStandardMaterial color={c.gun} roughness={0.25} metalness={0.8} />
        </mesh>

        {/* Coaxial second barrel */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0.045, -0.005, 0.19]} castShadow>
          <cylinderGeometry args={[0.016, 0.02, 0.48, 8]} />
          <meshStandardMaterial color={c.gun} roughness={0.25} metalness={0.8} />
        </mesh>

        {/* Muzzle brake */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.43]}>
          <cylinderGeometry args={[0.06, 0.07, 0.05, 6]} />
          <meshStandardMaterial color={c.trim} roughness={0.25} metalness={0.85} />
        </mesh>

        {/* Barrel heat shield rings */}
        {[0.06, 0.15, 0.24].map(z => (
          <mesh key={z} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]}>
            <torusGeometry args={[0.043, 0.006, 6, 10]} />
            <meshStandardMaterial color={c.trim} roughness={0.3} metalness={0.8} />
          </mesh>
        ))}

        <mesh position={[0.12, -0.055, 0.05]} rotation={[0.2, 0, 0.35]} castShadow>
          <boxGeometry args={[0.04, 0.025, 0.28]} />
          <meshStandardMaterial color={c.trim} roughness={0.36} metalness={0.82} />
        </mesh>
      </group>
    </group>
  );
}

function RocketLauncher({
  c,
  recoilRotation,
}: {
  readonly c: (typeof COLORS)['Player'] | (typeof COLORS)['Enemy'];
  readonly recoilRotation: number;
}) {
  const tubePositions: [number, number][] = [
    [-0.085, 0.04],
    [0.085, 0.04],
    [-0.085, -0.055],
    [0.085, -0.055],
  ];

  return (
    <group position={[0, 0.73, 0.05]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.05, 8]} />
        <meshStandardMaterial color={c.gun} roughness={0.35} metalness={0.7} />
      </mesh>
      <group rotation={[recoilRotation * 0.45, 0, 0]}>
        <mesh position={[0, 0.02, 0.08]} castShadow>
          <boxGeometry args={[0.34, 0.18, 0.18]} />
          <meshStandardMaterial color={c.gun} roughness={0.34} metalness={0.76} />
        </mesh>
        {tubePositions.map(([x, y]) => (
          <group key={`${x}-${y}`}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[x, y + 0.02, 0.24]} castShadow>
              <cylinderGeometry args={[0.038, 0.044, 0.42, 10]} />
              <meshStandardMaterial color={c.trim} roughness={0.28} metalness={0.86} />
            </mesh>
            {/* Rocket warhead tip */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[x, y + 0.02, 0.47]}>
              <cylinderGeometry args={[0.036, 0.024, 0.04, 10]} />
              <meshStandardMaterial color={c.ammo} roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh rotation={[0, 0, 0]} position={[x, y + 0.02, 0.49]}>
              <sphereGeometry args={[0.024, 6, 6]} />
              <meshStandardMaterial color={c.ammo} roughness={0.25} metalness={0.7} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.105, 0.08]} castShadow>
          <boxGeometry args={[0.38, 0.025, 0.2]} />
          <meshStandardMaterial color={c.trim} roughness={0.38} metalness={0.84} />
        </mesh>
        {/* Rocket ammo box */}
        <mesh position={[-0.22, 0, 0.02]} castShadow>
          <boxGeometry args={[0.12, 0.16, 0.18]} />
          <meshStandardMaterial color={c.ammo} roughness={0.4} metalness={0.65} />
        </mesh>
        <mesh position={[-0.22, -0.09, 0.08]} castShadow>
          <boxGeometry args={[0.14, 0.02, 0.22]} />
          <meshStandardMaterial color={c.trim} roughness={0.42} metalness={0.78} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Headlights ───────────────────────────────────────────────────────────────

function Headlights({ faction }: { readonly faction: 'Player' | 'Enemy' }) {
  const c = COLORS[faction];
  return (
    <>
      {/* Roof/bumper auxiliary light bar */}
      <mesh position={[0, 0.38, 1.1]} castShadow>
        <boxGeometry args={[0.62, 0.035, 0.05]} />
        <meshStandardMaterial color={c.trim} roughness={0.42} metalness={0.84} />
      </mesh>
      {[-0.24, 0, 0.24].map(x => (
        <mesh key={x} position={[x, 0.41, 1.12]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color={c.headlight} emissive={c.headlight} emissiveIntensity={0.45} roughness={0.12} />
        </mesh>
      ))}

      {/* Left headlight housing */}
      <mesh position={[-0.38, 0.32, 1.16]} castShadow>
        <boxGeometry args={[0.1, 0.07, 0.05]} />
        <meshStandardMaterial color={c.trim} roughness={0.3} metalness={0.75} />
      </mesh>
      {/* Left headlight lens */}
      <mesh position={[-0.38, 0.32, 1.2]}>
        <boxGeometry args={[0.07, 0.05, 0.01]} />
        <meshStandardMaterial
          color={c.headlight}
          emissive={c.headlight}
          emissiveIntensity={0.8}
          roughness={0.1}
        />
      </mesh>

      {/* Right headlight housing */}
      <mesh position={[0.38, 0.32, 1.16]} castShadow>
        <boxGeometry args={[0.1, 0.07, 0.05]} />
        <meshStandardMaterial color={c.trim} roughness={0.3} metalness={0.75} />
      </mesh>
      {/* Right headlight lens */}
      <mesh position={[0.38, 0.32, 1.2]}>
        <boxGeometry args={[0.07, 0.05, 0.01]} />
        <meshStandardMaterial
          color={c.headlight}
          emissive={c.headlight}
          emissiveIntensity={0.8}
          roughness={0.1}
        />
      </mesh>

      {/* Tail lights */}
      <mesh position={[-0.38, 0.28, -1.15]} castShadow>
        <boxGeometry args={[0.06, 0.05, 0.04]} />
        <meshStandardMaterial color="#cc0000" emissive="#cc0000" emissiveIntensity={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0.38, 0.28, -1.15]} castShadow>
        <boxGeometry args={[0.06, 0.05, 0.04]} />
        <meshStandardMaterial color="#cc0000" emissive="#cc0000" emissiveIntensity={0.5} roughness={0.2} />
      </mesh>
    </>
  );
}

// ─── Shield ───────────────────────────────────────────────────────────────────

function ShieldEffect({ active }: { readonly active: boolean }) {
  if (!active) return null;
  return (
    <mesh>
      <sphereGeometry args={[1.4, 20, 20]} />
      <meshStandardMaterial
        color="#4488ff"
        transparent
        opacity={0.18}
        metalness={0.6}
        roughness={0.15}
        side={2}
      />
    </mesh>
  );
}

// ─── Health Bar ───────────────────────────────────────────────────────────────

function HealthBar({ percentage }: { readonly percentage: number }) {
  const pct = Math.max(0, Math.min(1, percentage));
  const color = pct > 0.6 ? '#44cc44' : pct > 0.3 ? '#cccc44' : '#cc4444';
  const totalWidth = 1.4;
  return (
    <group position={[0, 1.0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalWidth + 0.1, 0.14]} />
        <meshBasicMaterial color="#111111" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-(totalWidth * (1 - pct)) / 2, 0, 0.01]}>
        <planeGeometry args={[totalWidth * pct, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TankMesh({ data, faction }: TankMeshProps) {
  const healthPct = data.health.max > 0 ? data.health.current / data.health.max : 0;
  const recoilRef = React.useRef(0);
  const prevCooldownRef = React.useRef(data.weapon.cooldown);

  const bodyTextures = useBodyTextures();

  useFrame((_state, delta) => {
    const cd = data.weapon.cooldown;
    if (prevCooldownRef.current < 0.01 && cd > 0.01) {
      recoilRef.current = 0.12;
    }
    prevCooldownRef.current = cd;
    if (recoilRef.current > 0) {
      recoilRef.current = Math.max(0, recoilRef.current - delta);
    }
  });

  const recoilT = recoilRef.current / 0.12;
  const recoilRotation = recoilT > 0 ? -0.06 * recoilT : 0;

  return (
    <group
      position={[data.position.x, data.position.y, data.position.z]}
      rotation={[0, data.rotation, 0]}
    >
      <CarBody
        faction={faction}
        roughnessMap={bodyTextures.roughnessMap}
        metalnessMap={bodyTextures.metalnessMap}
      />
      <Cabin faction={faction} />
      <Wheels faction={faction} />
      <ExhaustPipes faction={faction} />
      <RoofGun faction={faction} recoilRotation={recoilRotation} />
      <Headlights faction={faction} />
      <ShieldEffect active={data.shield.active} />
      <HealthBar percentage={healthPct} />
    </group>
  );
}
