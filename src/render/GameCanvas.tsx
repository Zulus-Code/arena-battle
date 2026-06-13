// ─── Game Canvas ──────────────────────────────────────────────────────────────
// Main game scene — wraps everything in a R3F Canvas.

import { Canvas } from '@react-three/fiber';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { SceneLighting } from './SceneLighting';
import { CameraRig } from './CameraRig';
import { ArenaMesh } from './ArenaMesh';
import { TankMesh } from './TankMesh';
import { ProjectileMeshes } from './ProjectileMeshes';
import { PickupMeshes } from './PickupMeshes';
import { ExplosionMeshes } from './ExplosionMeshes';
import { ParticleMeshes } from './ParticleMeshes';
import * as THREE from 'three';

function PlayerTank() {
  const player = useGameWorldStore(s => s.player);
  if (!player || player.status === 'Dead') return null;
  return <TankMesh data={player} faction="Player" />;
}

function EnemyTanks() {
  const enemies = useGameWorldStore(s => s.enemies);
  return enemies
    .filter(e => e.status !== 'Dead')
    .map(e => (
      <TankMesh key={e.id} data={e} faction="Enemy" />
    ));
}

export default function GameCanvas() {
  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 0.025]} />
      <SceneLighting />
      <CameraRig />
      <ArenaMesh />
      <PlayerTank />
      <EnemyTanks />
      <ProjectileMeshes />
      <PickupMeshes />
      <ExplosionMeshes />
      <ParticleMeshes />
    </Canvas>
  );
}
