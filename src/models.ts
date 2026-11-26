import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import { getSoftShadowMaterial } from './scene.ts'

export type VehicleKind = 'buggy' | 'buggyEnemy' | 'tank' | 'boss'

export interface VehicleView {
  root: THREE.Group
  tiltGroup: THREE.Group
  /** Height of the normalised model, for mounting a turret. */
  height: number
  wheels: THREE.Object3D[]
  steerPivots: THREE.Object3D[]
  gunNode: THREE.Object3D | null
  gunRestX: number
  mixer: THREE.AnimationMixer | null
  materials: THREE.MeshStandardMaterial[]
  baseEmissives: THREE.Color[]
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

export interface VehicleTemplate {
  scene: THREE.Object3D
  animations: THREE.AnimationClip[]
}

export type VehicleTemplates = Record<VehicleKind, VehicleTemplate>

let sharedShadowGeo: THREE.PlaneGeometry | null = null

function getShadowGeo(): THREE.PlaneGeometry {
  if (!sharedShadowGeo) {
    sharedShadowGeo = new THREE.PlaneGeometry(1, 1)
    sharedShadowGeo.rotateX(-Math.PI / 2)
  }
  return sharedShadowGeo
}

export async function loadVehicles(): Promise<VehicleTemplates> {
  const loader = new GLTFLoader()
  const kinds = Object.keys(SPECS) as VehicleKind[]
  const loaded = await Promise.all(
    kinds.map(async (kind) => {
      const gltf = await loader.loadAsync(SPECS[kind].url)
      return [kind, { scene: gltf.scene, animations: gltf.animations }] as const
    }),
  )
  const templates = {} as VehicleTemplates
  for (const [kind, tpl] of loaded) templates[kind] = tpl
  return templates
}

function createShadowBlob(length: number): THREE.Mesh {
  const blob = new THREE.Mesh(getShadowGeo(), getSoftShadowMaterial())
  blob.position.y = 0.025
  blob.scale.set(length * 0.85, 1, length * 1.18)
  blob.renderOrder = 1
  return blob
}

function findGunNode(root: THREE.Object3D): THREE.Object3D | null {
  const direct = root.getObjectByName('Tank_Gun') ?? root.getObjectByName('Tank_Turret')
  if (direct) return direct
  const stack: THREE.Object3D[] = [root]
  while (stack.length > 0) {
    const cur = stack.pop()!
    if (cur !== root && /gun|barrel/i.test(cur.name)) return cur
    for (let i = cur.children.length - 1; i >= 0; i--) stack.push(cur.children[i])
  }
  return null
}

/** Instantiates a pooled vehicle view with wheel pivots, cloned materials for hit flash, and tank tread mixer. */
export function createVehicle(templates: VehicleTemplates, kind: VehicleKind): VehicleView {
  const spec = SPECS[kind]
  const tpl = templates[kind]
  const model = cloneSkinned(tpl.scene)

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

  // Clone materials once per pooled instance so hit flashes don't tint siblings.
  const clonedMats = new Map<THREE.Material, THREE.MeshStandardMaterial>()
  const materials: THREE.MeshStandardMaterial[] = []
  const baseEmissives: THREE.Color[] = []

  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true

    const replaceMat = (m: THREE.Material): THREE.Material => {
      if (!(m instanceof THREE.MeshStandardMaterial)) return m
      let copy = clonedMats.get(m)
      if (!copy) {
        copy = m.clone()
        clonedMats.set(m, copy)
        materials.push(copy)
        baseEmissives.push(copy.emissive.clone())
      }
      return copy
    }

    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(replaceMat) : replaceMat(mesh.material)
  })

  // Extract buggy wheels and insert steering pivots on front wheels.
  const wheels: THREE.Object3D[] = []
  const steerPivots: THREE.Object3D[] = []
  for (const name of ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right']) {
    const wheel = model.getObjectByName(name)
    if (!wheel) continue
    wheels.push(wheel)
    if (name.startsWith('wheel-front') && wheel.parent) {
      const pivot = new THREE.Group()
      pivot.position.copy(wheel.position)
      wheel.parent.add(pivot)
      wheel.position.set(0, 0, 0)
      pivot.add(wheel)
      steerPivots.push(pivot)
    }
  }

  const gunNode = findGunNode(model)
  const gunRestX = gunNode ? gunNode.position.x : 0

  let mixer: THREE.AnimationMixer | null = null
  if (tpl.animations.length > 0) {
    const forwardClip =
      tpl.animations.find((c) => c.name.includes('Tank_Forward')) ?? tpl.animations[0]
    mixer = new THREE.AnimationMixer(model)
    mixer.clipAction(forwardClip).play()
    mixer.update(0)
  }

  const tiltGroup = new THREE.Group()
  tiltGroup.add(model)

  const root = new THREE.Group()
  root.add(tiltGroup)
  root.add(createShadowBlob(spec.length))

  return {
    root,
    tiltGroup,
    height: box2.max.y - box2.min.y,
    wheels,
    steerPivots,
    gunNode,
    gunRestX,
    mixer,
    materials,
    baseEmissives,
  }
}

/** Sets temporary hit flash intensity (0 = normal, 1 = bright flash) without allocation. */
export function setVehicleFlash(view: VehicleView, amount: number): void {
  for (let i = 0; i < view.materials.length; i++) {
    const m = view.materials[i]
    const base = view.baseEmissives[i]
    if (amount <= 0.001) {
      m.emissive.copy(base)
      m.emissiveIntensity = 1
    } else {
      m.emissive.setRGB(
        base.r + amount * 0.9,
        base.g + amount * 0.45,
        base.b + amount * 0.25,
      )
      m.emissiveIntensity = 1 + amount * 0.8
    }
  }
}
