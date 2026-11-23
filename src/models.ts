import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import { MeshBasicNodeMaterial } from 'three/webgpu'

export type VehicleKind = 'buggy' | 'buggyEnemy' | 'tank' | 'boss'

export interface VehicleView {
  root: THREE.Group
  /** Height of the normalised model, for mounting a turret. */
  height: number
}

interface Spec {
  url: string
  /** Target length in arena units. */
  length: number
  /** Model forward axis -> our forward (-Z). */
  yaw: number
}

const SPECS: Record<VehicleKind, Spec> = {
  buggy: { url: '/models/buggy.glb', length: 3.4, yaw: Math.PI },
  buggyEnemy: { url: '/models/buggy-enemy.glb', length: 3.4, yaw: Math.PI },
  tank: { url: '/models/tank.glb', length: 4.6, yaw: -Math.PI / 2 },
  boss: { url: '/models/boss.glb', length: 6.2, yaw: -Math.PI / 2 },
}

export type VehicleTemplates = Record<VehicleKind, THREE.Object3D>

export async function loadVehicles(): Promise<VehicleTemplates> {
  const loader = new GLTFLoader()
  const kinds = Object.keys(SPECS) as VehicleKind[]
  const loaded = await Promise.all(
    kinds.map(async (kind) => {
      const gltf = await loader.loadAsync(SPECS[kind].url)
      return [kind, gltf.scene] as const
    }),
  )
  const templates = {} as VehicleTemplates
  for (const [kind, scene] of loaded) templates[kind] = scene
  return templates
}

function shadowBlob(length: number): THREE.Mesh {
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 18),
    new MeshBasicNodeMaterial({ color: 0x2f2c22, transparent: true, opacity: 0.26, depthWrite: false }),
  )
  blob.rotation.x = -Math.PI / 2
  blob.position.y = 0.03
  blob.scale.set(length * 0.4, length * 0.6, 1)
  return blob
}

export function createVehicle(templates: VehicleTemplates, kind: VehicleKind): VehicleView {
  const spec = SPECS[kind]
  const model = cloneSkinned(templates[kind])

  // Face our forward axis, then scale to a known length and drop onto the floor.
  model.rotation.y = spec.yaw
  model.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.scale.setScalar(spec.length / Math.max(size.x, size.z))
  model.updateMatrixWorld(true)

  const box2 = new THREE.Box3().setFromObject(model)
  const center = box2.getCenter(new THREE.Vector3())
  model.position.set(-center.x, -box2.min.y, -center.z)

  const root = new THREE.Group()
  root.add(model)
  root.add(shadowBlob(spec.length))

  return { root, height: box2.max.y - box2.min.y }
}
