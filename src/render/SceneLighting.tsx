// ─── Scene Lighting ──────────────────────────────────────────────────────────
// Warm key light with soft shadows, cool fill, and subtle atmospheric rim.

import { useGameWorldStore } from '@/store/gameWorldStore';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';

export function SceneLighting() {
  const session = useGameWorldStore(s => s.session);
  const levelIndex = session ? session.level : 0;
  const config = LEVEL_CONFIGS[levelIndex] ?? LEVEL_CONFIGS[0];
  const ambientIntensity = config?.ambientIntensity ?? 0.3;
  const skyColor = config?.skyColor ?? '#1a1a2e';

  // Shadow camera frustum — covers the largest arena (60×60)
  const shadowCamSize = 38;

  return (
    <>
      {/* Ambient — subtle scene-wide fill */}
      <ambientLight intensity={ambientIntensity * 0.5} color="#334466" />

      {/* Key light — warm sun, casts soft shadows */}
      <directionalLight
        position={[15, 24, 12]}
        intensity={1.3}
        color="#fff8ee"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-shadowCamSize}
        shadow-camera-right={shadowCamSize}
        shadow-camera-top={shadowCamSize}
        shadow-camera-bottom={-shadowCamSize}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      {/* Fill light — cool bounce from opposite side */}
      <directionalLight
        position={[-12, 8, -8]}
        intensity={0.45}
        color="#aaccff"
      />

      {/* Rim / back light — separates silhouettes from bg */}
      <directionalLight
        position={[0, 6, -18]}
        intensity={0.35}
        color="#ccddff"
      />

      {/* Sky/ground hemispheric blend */}
      <hemisphereLight
        color={skyColor}
        groundColor="#111122"
        intensity={0.5}
      />

      {/* Subtle point light near the arena center — adds depth */}
      <pointLight
        position={[0, 6, 0]}
        intensity={0.3}
        color="#ffeecc"
        distance={40}
        decay={1.5}
      />
    </>
  );
}
