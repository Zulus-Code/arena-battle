// ─── Pickup Meshes ────────────────────────────────────────────────────────────
// Renders all pickups with floating rotation animation, emissive glow,
// and refined materials.

import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameWorldStore } from '@/store/gameWorldStore';
import type { PickupType } from '@/domain/entities/Pickup';
import { PICKUP_CONFIGS } from '@/config/PickupConfig';
import * as THREE from 'three';

export function PickupMeshes() {
  const pickups = useGameWorldStore(s => s.pickups);
  const active = pickups.filter(p => p.active);

  return (
    <group>
      {active.map(p => (
        <AnimatedPickup key={p.id} type={p.type} x={p.position.x} y={p.position.y} z={p.position.z} />
      ))}
    </group>
  );
}

interface AnimatedPickupProps {
  readonly type: PickupType;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function AnimatedPickup({ type, x, y, z }: AnimatedPickupProps) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const glowRef = React.useRef<THREE.Mesh>(null);
  const color = getPickupColor(type);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const t = performance.now() / 1000;
    const floatY = y + Math.sin(t * 2) * 0.25;
    meshRef.current.position.y = floatY;
    meshRef.current.rotation.y += delta * 1.5;

    if (glowRef.current) {
      glowRef.current.position.y = floatY;
      glowRef.current.rotation.y = meshRef.current.rotation.y;
      // Pulse glow
      const pulse = 0.5 + Math.sin(t * 3) * 0.3;
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = pulse;
    }
  });

  const geometry = getPickupGeometry(type);

  return (
    <group>
      {/* Glow halo — slightly larger translucent sphere behind pickup */}
      <mesh ref={glowRef} position={[x, y, z]}>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.3}
          roughness={0.3}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Main pickup mesh */}
      <mesh ref={meshRef} position={[x, y, z]} castShadow>
        {geometry}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          roughness={0.35}
          metalness={0.3}
        />
      </mesh>
    </group>
  );
}

function getPickupGeometry(type: PickupType): React.ReactElement {
  switch (type) {
    case 'Health':
      return <torusGeometry args={[0.3, 0.1, 12, 20]} />;
    case 'Shield':
      return <sphereGeometry args={[0.3, 12, 12]} />;
    case 'Ammo':
      return <boxGeometry args={[0.4, 0.4, 0.4]} />;
    case 'SpeedBoost':
      return <coneGeometry args={[0.3, 0.5, 8]} />;
    case 'RapidFire':
      return <cylinderGeometry args={[0.2, 0.3, 0.5, 12]} />;
  }
}

function getPickupColor(type: PickupType): string {
  return PICKUP_CONFIGS[type]?.color ?? '#ffffff';
}
