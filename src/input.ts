export interface Input {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
  firing: boolean
  yawDelta: number
}

export interface InputController {
  state: Input
  /** Copy keyboard state and accumulated mouse delta into this frame. */
  beginFrame(): void
  /** Clear the accumulated mouse delta after the frame used it. */
  endFrame(): void
  /** Reset all held keys, mouse button state, and motion deltas (used on pause/resume). */
  clear(): void
}

export function createInput(canvas: HTMLCanvasElement): InputController {
  const keys = new Set<string>()
  let mouseDown = false
  const state: Input = {
    forward: false,
    back: false,
    left: false,
    right: false,
    firing: false,
    yawDelta: 0,
  }

  window.addEventListener('keydown', (e) => {
    keys.add(e.code)
    if (e.code === 'Space') e.preventDefault()
  })
  window.addEventListener('keyup', (e) => keys.delete(e.code))
  window.addEventListener('blur', () => {
    keys.clear()
    mouseDown = false
  })

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouseDown = true
  })
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false
  })
  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) state.yawDelta -= e.movementX * 0.0024
  })

  return {
    state,
    beginFrame() {
      state.forward = keys.has('KeyW') || keys.has('ArrowUp')
      state.back = keys.has('KeyS') || keys.has('ArrowDown')
      state.left = keys.has('KeyA') || keys.has('ArrowLeft')
      state.right = keys.has('KeyD') || keys.has('ArrowRight')
      state.firing = mouseDown || keys.has('Space')
    },
    endFrame() {
      state.yawDelta = 0
    },
    clear() {
      keys.clear()
      mouseDown = false
      state.forward = false
      state.back = false
      state.left = false
      state.right = false
      state.firing = false
      state.yawDelta = 0
    },
  }
}

export function requestLock(canvas: HTMLCanvasElement): void {
  if (document.pointerLockElement === canvas) return
  try {
    Promise.resolve(canvas.requestPointerLock() as unknown).catch(() => {})
  } catch {
    // Ignore missing user-activation errors (e.g. Escape resume in browsers that block lock).
  }
}
