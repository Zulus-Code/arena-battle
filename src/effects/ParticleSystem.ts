// ─── Particle System ──────────────────────────────────────────────────────────
// Lightweight particle effect manager for explosions, trails, etc.
// Pure data — renderer reads particle arrays and draws them.

import { v4 as uuidv4 } from 'uuid';
import type { Vec3 } from '@/domain/types/CoreTypes';

export interface ParticleData {
  readonly id: string;
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly color: string;
  readonly size: number;
  readonly lifetime: number;
  readonly age: number;
  readonly gravity: number;
}

type MutableVec3 = { x: number; y: number; z: number };
type MutableParticle = {
  -readonly [K in keyof ParticleData]: ParticleData[K] extends Vec3 ? MutableVec3 : ParticleData[K];
};

function randomVel(speed: number): MutableVec3 {
  return {
    x: (Math.random() - 0.5) * 2 * speed,
    y: Math.random() * speed,
    z: (Math.random() - 0.5) * 2 * speed,
  };
}

export class ParticleSystem {
  private particles: MutableParticle[] = [];

  burst(
    position: Vec3,
    count: number,
    color: string,
    speed: number = 5,
    size: number = 0.3,
    lifetime: number = 1.0,
  ): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: uuidv4(),
        position: { x: position.x, y: position.y, z: position.z },
        velocity: randomVel(speed),
        color,
        size,
        lifetime,
        age: 0,
        gravity: -9.8,
      });
    }
  }

  tick(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;
      p.velocity.y += p.gravity * dt;
      p.age += dt;
      if (p.age >= p.lifetime) this.particles.splice(i, 1);
    }
  }

  getParticles(): readonly ParticleData[] {
    return this.particles as readonly ParticleData[];
  }

  clear(): void {
    this.particles = [];
  }
}

export const particleSystem = new ParticleSystem();
