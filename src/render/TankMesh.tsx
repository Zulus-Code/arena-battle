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
  Player: {
    underbody: '#334466',
    body:      '#4a7eff',
    cabin:     '#2a5edd',
    gun:       '#5588cc',
    wheel:     '#1a1a1a',
    headlight: '#ffffaa',
    glass:     '#1a2a44',
    exhaust:   '#3a3a3a',
    trim:      '#1a2a44',
    seat:      '#1a1a1a',
  },
  Enemy: {
    underbody: '#553333',
    body:      '#dd3333',
    cabin:     '#aa1111',
    gun:       '#cc4444',
    wheel:     '#1a1a1a',
    headlight: '#ff8888',
    glass:     '#331111',
    exhaust:   '#3a3a3a',
    trim:      '#331111',
    seat:      '#1a1a1a',
  },
} as const;

// ─── Shared Textures ──────────────────────────────────────────────────────────
// Created once per faction pair, shared across all tanks.

function useBodyTextures() {
  return useMemo(() => ({
    roughnessMap: createBodyRoughnessMap(),
    metalnessMap: createMetallicFlakeTexture(),
  }), []);
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

      {/* ── Front bumper / bull bar ── */}
      <mesh position={[0, 0.23, 1.01]} castShadow>
        <boxGeometry args={[1.15, 0.06, 0.06]} />
        <meshStandardMaterial color={c.trim} roughness={0.4} metalness={0.8} />
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
      {/* ── Main cabin cell ── */}
      <mesh position={[0, 0.37, 0.05]} castShadow>
        <boxGeometry args={[0.85, 0.22, 0.5]} />
        <meshStandardMaterial color={c.cabin} roughness={0.55} metalness={0.35} />
      </mesh>

      {/* ── Roof panel ── */}
      <mesh position={[0, 0.52, 0.05]} castShadow>
        <boxGeometry args={[0.78, 0.03, 0.42]} />
        <meshStandardMaterial color={c.cabin} roughness={0.65} metalness={0.25} />
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

      {/* ── Left window ── */}
      <mesh position={[-0.44, 0.40, 0.05]} castShadow>
        <boxGeometry args={[0.025, 0.12, 0.3]} />
        <meshStandardMaterial
          color={c.glass}
          roughness={0.15}
          metalness={0.2}
        />
      </mesh>

      {/* ── Right window ── */}
      <mesh position={[0.44, 0.40, 0.05]} castShadow>
        <boxGeometry args={[0.025, 0.12, 0.3]} />
        <meshStandardMaterial
          color={c.glass}
          roughness={0.15}
          metalness={0.2}
        />
      </mesh>

      {/* ── Rear cabin wall ── */}
      <mesh position={[0, 0.40, -0.18]} castShadow>
        <boxGeometry args={[0.75, 0.18, 0.03]} />
        <meshStandardMaterial color={c.cabin} roughness={0.55} metalness={0.35} />
      </mesh>

      {/* ── Roll cage bars (roof → body) ── */}
      <RollCageBar position={[-0.32, 0.45, 0.05]} />
      <RollCageBar position={[0.32, 0.45, 0.05]} />
      <RollCageBar position={[0, 0.45, -0.18]} />

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

function RollCageBar({ position }: { readonly position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
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
          {/* Suspension arm */}
          <mesh
            position={[pos[0] * 0.88, 0.10, pos[2]]}
            rotation={[0, 0, pos[0] > 0 ? -0.3 : 0.3]}
          >
            <boxGeometry args={[0.04, 0.04, 0.25]} />
            <meshStandardMaterial
              color={c.underbody}
              roughness={0.55}
              metalness={0.7}
            />
          </mesh>

          {/* Wheel tire */}
          <mesh position={pos} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.155, 0.155, 0.1, 16]} />
            <meshStandardMaterial
              color={c.wheel}
              roughness={0.85}
              metalness={0.05}
            />
          </mesh>

          {/* Hubcap / rim (outer face) */}
          <mesh position={[pos[0] + (pos[0] > 0 ? 0.06 : -0.06), pos[1], pos[2]]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.015, 12]} />
            <meshStandardMaterial
              color="#444455"
              roughness={0.3}
              metalness={0.85}
            />
          </mesh>

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
  return (
    <group position={[0, 0.56, 0.1]}>
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
          <boxGeometry args={[0.08, 0.06, 0.1]} />
          <meshStandardMaterial color={c.gun} roughness={0.3} metalness={0.75} />
        </mesh>

        {/* Barrel tube */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.2]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.42, 8]} />
          <meshStandardMaterial color={c.gun} roughness={0.25} metalness={0.8} />
        </mesh>

        {/* Muzzle brake */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.43]}>
          <cylinderGeometry args={[0.06, 0.07, 0.05, 6]} />
          <meshStandardMaterial color={c.trim} roughness={0.25} metalness={0.85} />
        </mesh>

        {/* Barrel heat shield ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.13]}>
          <torusGeometry args={[0.05, 0.008, 6, 8]} />
          <meshStandardMaterial color={c.trim} roughness={0.3} metalness={0.8} />
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
