// ─── Explosion Meshes ─────────────────────────────────────────────────────────
// Multi-layered explosions: inner fireball + outer ring + point light.

import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameWorldStore } from '@/store/gameWorldStore';
import type { ExplosionData } from '@/domain/entities/Explosion';
import * as THREE from 'three';

export function ExplosionMeshes() {
  const explosions = useGameWorldStore(s => s.explosions);

  return (
    <group>
      {explosions.map((exp) => (
        <ExplosionMesh key={exp.id} data={exp} />
      ))}
    </group>
  );
}

interface ExplosionMeshProps {
  readonly data: ExplosionData;
}

function ExplosionMesh({ data }: ExplosionMeshProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const lightRef = React.useRef<THREE.PointLight>(null);
  const innerRef = React.useRef<THREE.Mesh>(null);
  const outerRef = React.useRef<THREE.Mesh>(null);

  useFrame(() => {
    const group = groupRef.current;
    const inner = innerRef.current;
    const outer = outerRef.current;
    const light = lightRef.current;
    if (!group || !inner || !outer || !light) return;

    const explosions = useGameWorldStore.getState().explosions;
    const current = explosions.find(e => e.id === data.id);
    if (!current) {
      group.visible = false;
      return;
    }

    const progress = Math.min(1, current.age / current.lifetime);

    // Inner fireball — grows then shrinks
    const innerScale = progress < 0.3
      ? 0.1 + progress * 3
      : 1.0 - (progress - 0.3) * 1.3;
    inner.scale.setScalar(Math.max(0.05, innerScale));

    // Outer ring — expands steadily
    const outerScale = 0.15 + progress * 1.2;
    outer.scale.setScalar(outerScale);

    const innerMat = inner.material as THREE.MeshBasicMaterial;
    const outerMat = outer.material as THREE.MeshBasicMaterial;

    // Color progression: white-yellow → orange → red → dark
    const hue = 0.12 - progress * 0.12;
    const saturation = 1.0 - progress * 0.6;
    const lightness = 0.8 - progress * 0.8;

    innerMat.color.setHSL(hue, saturation, lightness * 0.8);
    innerMat.opacity = 1 - progress * progress;

    outerMat.color.setHSL(hue, saturation * 0.7, lightness * 0.4);
    outerMat.opacity = Math.max(0, (1 - progress) * 0.7);

    // Point light intensity follows explosion curve
    light.intensity = progress < 0.1
      ? progress * 20
      : (1 - progress) * 2;
  });

  return (
    <group ref={groupRef} position={[data.position.x, data.position.y, data.position.z]}>
      {/* Point light for illumination */}
      <pointLight
        ref={lightRef}
        color="#ff9944"
        intensity={0}
        distance={8}
        decay={1.8}
      />

      {/* Inner fireball */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          transparent
          opacity={1}
          color="#ff6600"
          depthWrite={false}
        />
      </mesh>

      {/* Outer shock ring */}
      <mesh ref={outerRef} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
        <ringGeometry args={[0.3, 0.7, 32]} />
        <meshBasicMaterial
          transparent
          opacity={0.7}
          color="#ff4400"
          side={2}
          depthWrite={false}
        />
      </mesh>

      {/* Small spark particles (static ring fragments) */}
      <SparkRing progress={0} />
    </group>
  );
}

// ─── Spark Ring ──────────────────────────────────────────────────────────────

function SparkRing({ progress: _progress }: { readonly progress: number }) {
  const sparkRef = React.useRef<THREE.Group>(null);

  useFrame(() => {
    const group = sparkRef.current;
    if (!group) return;

    const rot = performance.now() * 0.003;
    group.rotation.y = rot;
    group.rotation.x = rot * 0.7;

    group.children.forEach((child, i) => {
      const s = child as THREE.Mesh;
      const offset = i * 0.15;
      const pulse = Math.sin(performance.now() * 0.01 + offset) * 0.3 + 0.7;
      s.scale.setScalar(pulse * 0.5);
    });
  });

  const sparkCount = 8;
  const sparks = Array.from({ length: sparkCount }, (_, i) => {
    const angle = (i / sparkCount) * Math.PI * 2;
    const radius = 0.9;
    return {
      pos: [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.6, 0] as [number, number, number],
      rot: [0, 0, angle] as [number, number, number],
    };
  });

  return (
    <group ref={sparkRef}>
      {sparks.map((spark, i) => (
        <mesh key={i} position={spark.pos} rotation={spark.rot}>
          <boxGeometry args={[0.08, 0.02, 0.02]} />
          <meshBasicMaterial
            color="#ffcc66"
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
