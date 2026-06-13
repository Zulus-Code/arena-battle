// ─── Particle Meshes ───────────────────────────────────────────────────────────
// Renders particle system data as fading sprites.
// Reads from the singleton ParticleSystem each frame — no store dependency.
// Uses an improved soft-circle texture with wider glowing falloff.

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { particleSystem } from '@/effects/ParticleSystem';

// ─── Shared soft-circle texture ───────────────────────────────────────────────

let _sharedTexture: THREE.CanvasTexture | null = null;

function getParticleTexture(): THREE.CanvasTexture {
  if (_sharedTexture) return _sharedTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  _sharedTexture = new THREE.CanvasTexture(canvas);
  _sharedTexture.needsUpdate = true;
  return _sharedTexture;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ParticleMeshes() {
  const groupRef = useRef<THREE.Group>(null);
  const spriteMap = useRef<Map<string, THREE.Sprite>>(new Map());
  const materialPool = useRef<THREE.SpriteMaterial[]>([]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const particles = particleSystem.getParticles();
    const alive = new Set<string>();
    const map = spriteMap.current;
    const tex = getParticleTexture();

    // Update existing and mark alive
    for (const p of particles) {
      alive.add(p.id);
      let sprite = map.get(p.id);

      if (!sprite) {
        // Reuse material from pool or create new
        let mat = materialPool.current.pop();
        if (!mat) {
          mat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
        }
        sprite = new THREE.Sprite(mat);
        group.add(sprite);
        map.set(p.id, sprite);
      }

      const progress = p.age / p.lifetime;
      // Particles grow slightly then shrink
      const scaleCurve = progress < 0.2
        ? p.size * (0.5 + progress * 2.5)
        : p.size * (1.0 - (progress - 0.2) * 0.4);
      const opacity = Math.max(0, 1 - progress * progress);

      sprite.position.set(p.position.x, p.position.y, p.position.z);
      sprite.scale.setScalar(scaleCurve);
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.color.set(p.color);
      mat.opacity = opacity;
      mat.needsUpdate = true;
    }

    // Remove dead sprites
    for (const [id, sprite] of map) {
      if (!alive.has(id)) {
        group.remove(sprite);
        materialPool.current.push(sprite.material as THREE.SpriteMaterial);
        map.delete(id);
      }
    }
  });

  return <group ref={groupRef} />;
}
