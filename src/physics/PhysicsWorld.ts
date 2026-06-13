// ─── Rapier Isolation Wrapper ─────────────────────────────────────────────────
// Clean API for the rest of the game. Currently in "lite" mode using circle-
// circle distance checks. When Rapier is integrated, swap internals without
// changing the public interface.

import type { Vec3 } from '@/domain/types/CoreTypes';
import { circlesOverlap, distance2D } from './PhysicsHelpers';

export interface ColliderHandle {
  readonly id: number;
}

export interface ColliderDesc {
  readonly position: Vec3;
  readonly radius: number;
  readonly group: number;
}

interface StoredCollider {
  position: Vec3;
  radius: number;
  group: number;
}

export class PhysicsWorld {
  private nextId = 0;
  private readonly colliders = new Map<number, StoredCollider>();

  addCollider(desc: ColliderDesc): ColliderHandle {
    const id = this.nextId++;
    this.colliders.set(id, {
      position: { ...desc.position },
      radius: desc.radius,
      group: desc.group,
    });
    return { id };
  }

  removeCollider(handle: ColliderHandle): void {
    this.colliders.delete(handle.id);
  }

  updatePosition(handle: ColliderHandle, position: Vec3): void {
    const c = this.colliders.get(handle.id);
    if (c) c.position = position;
  }

  /** Advance simulation. No-op in lite mode. */
  step(_dt: number): void {
    // Reserved for Rapier integration.
  }

  /** Test two colliders for overlap. */
  checkOverlap(a: ColliderHandle, b: ColliderHandle): boolean {
    const ca = this.colliders.get(a.id);
    const cb = this.colliders.get(b.id);
    if (!ca || !cb) return false;
    return circlesOverlap(ca.position, ca.radius, cb.position, cb.radius);
  }

  /** Find all colliders overlapping the given handle. */
  queryOverlaps(handle: ColliderHandle): readonly ColliderHandle[] {
    const body = this.colliders.get(handle.id);
    if (!body) return [];
    const results: ColliderHandle[] = [];
    for (const [id, other] of this.colliders) {
      if (id === handle.id) continue;
      if (circlesOverlap(body.position, body.radius, other.position, other.radius)) {
        results.push({ id });
      }
    }
    return results;
  }

  /** Direct 2D distance between two points (XZ plane). */
  distance(a: Vec3, b: Vec3): number {
    return distance2D(a, b);
  }
}
/** Singleton physics world instance. */
export const physicsWorld = new PhysicsWorld();
