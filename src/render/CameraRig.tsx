// ─── Camera Rig ───────────────────────────────────────────────────────────────
// Third-person camera behind the tank, looking forward.
// Clamped to arena bounds so walls never block the view.

import { useFrame, useThree } from '@react-three/fiber';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { screenShake } from '@/effects/ScreenShake';

const DISTANCE = 9;
const HEIGHT = 14;
const LOOK_AHEAD = 5;
const CAMERA_MARGIN = 2; // keep camera this far from walls

export function CameraRig() {
  const { camera } = useThree();
  const player = useGameWorldStore((s) => s.player);
  const arena = useGameWorldStore((s) => s.arena);

  useFrame((_state, delta) => {
    if (!player) return;

    const { x: px, z: pz } = player.position;
    const angle = player.rotation;

    // Target camera position: behind the tank
    const rawTargetX = px - Math.sin(angle) * DISTANCE;
    const rawTargetZ = pz - Math.cos(angle) * DISTANCE;

    // Clamp camera inside arena so walls never block
    let targetX = rawTargetX;
    let targetZ = rawTargetZ;
    if (arena) {
      const halfW = arena.width / 2 - CAMERA_MARGIN;
      const halfD = arena.depth / 2 - CAMERA_MARGIN;
      targetX = Math.max(-halfW, Math.min(halfW, rawTargetX));
      targetZ = Math.max(-halfD, Math.min(halfD, rawTargetZ));
    }

    // Screen shake offset
    const shakeOffset = screenShake.getOffset();
    targetX += shakeOffset.x;
    targetZ += shakeOffset.z;

    // Smooth follow
    const smooth = 1 - Math.exp(-6 * delta);
    camera.position.x += (targetX - camera.position.x) * smooth;
    camera.position.y += (HEIGHT - camera.position.y) * smooth;
    camera.position.z += (targetZ - camera.position.z) * smooth;

    // Look ahead of the tank
    const lookX = px + Math.sin(angle) * LOOK_AHEAD;
    const lookZ = pz + Math.cos(angle) * LOOK_AHEAD;
    camera.lookAt(lookX, 0, lookZ);
  });

  return null;
}
