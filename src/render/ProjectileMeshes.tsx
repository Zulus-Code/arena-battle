// ─── Projectile Meshes ────────────────────────────────────────────────────────
// Renders projectiles as glowing spheres with sprite halo, motion trail,
// and subtle point light.

import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameWorldStore } from '@/store/gameWorldStore';
import * as THREE from 'three';

export function ProjectileMeshes() {
  const projectiles = useGameWorldStore((s) => s.projectiles);

  return (
    <group>
      {projectiles.map((proj) => (
        <ProjectileSphere key={proj.id} proj={proj} />
      ))}
    </group>
  );
}

interface ProjectileSphereProps {
  readonly proj: {
    readonly id: string;
    readonly position: { readonly x: number; readonly y: number; readonly z: number };
    readonly radius: number;
    readonly color: string;
  };
}

function ProjectileSphere({ proj }: ProjectileSphereProps) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const glowRef = React.useRef<THREE.Sprite>(null);
  const trailGroupRef = React.useRef<THREE.Group>(null);
  const lightRef = React.useRef<THREE.PointLight>(null);
  const prevPos = React.useRef({ x: proj.position.x, y: proj.position.y, z: proj.position.z });
  const trailHistory = React.useRef<THREE.Vector3[]>([]);

  useFrame(() => {
    const mesh = meshRef.current;
    const glow = glowRef.current;
    const light = lightRef.current;
    if (!mesh || !glow || !light) return;

    const { x, y, z } = proj.position;
    mesh.position.set(x, y, z);
    glow.position.copy(mesh.position);
    light.position.copy(mesh.position);

    // Pulse light intensity
    const pulse = 0.8 + Math.sin(performance.now() * 0.02) * 0.2;
    light.intensity = pulse * 1.5;

    // Build trail from position history
    const dx = x - prevPos.current.x;
    const dy = y - prevPos.current.y;
    const dz = z - prevPos.current.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > 0.02) {
      trailHistory.current.push(new THREE.Vector3(x, y, z));
      if (trailHistory.current.length > 12) {
        trailHistory.current.shift();
      }
    }
    prevPos.current = { x, y, z };

    // Update trail segments
    if (trailGroupRef.current) {
      const trailGroup = trailGroupRef.current;
      const history = trailHistory.current;

      // Ensure enough children
      while (trailGroup.children.length < history.length) {
        const seg = new THREE.Mesh(
          new THREE.SphereGeometry(proj.radius * 0.6, 6, 6),
          new THREE.MeshBasicMaterial({
            color: proj.color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        trailGroup.add(seg);
      }

      // Update each child
      for (let i = 0; i < history.length; i++) {
        const seg = trailGroup.children[i] as THREE.Mesh;
        seg.position.copy(history[i]);
        const alpha = (i / Math.max(1, history.length - 1)) * 0.5;
        (seg.material as THREE.MeshBasicMaterial).opacity = alpha;
        seg.scale.setScalar(0.4 + alpha * 0.6);
        seg.visible = true;
      }

      // Hide excess
      for (let i = history.length; i < trailGroup.children.length; i++) {
        trailGroup.children[i].visible = false;
      }
    }
  });

  const radius = Math.max(proj.radius, 0.15);
  const glowTexture = useMemoSpriteGlow(proj.color);

  return (
    <>
      {/* Motion trail */}
      <group ref={trailGroupRef} />

      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 12, 12]} />
        <meshStandardMaterial
          color={proj.color}
          emissive={proj.color}
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Outer sprite glow */}
      <sprite ref={glowRef} scale={[radius * 6, radius * 6, 1]}>
        <spriteMaterial map={glowTexture} transparent opacity={0.6} depthWrite={false} />
      </sprite>

      {/* Subtle point light */}
      <pointLight
        ref={lightRef}
        color={proj.color}
        intensity={1.0}
        distance={radius * 10}
        decay={1.8}
      />
    </>
  );
}

function useMemoSpriteGlow(color: string): THREE.Texture {
  return React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, [color]);
}
