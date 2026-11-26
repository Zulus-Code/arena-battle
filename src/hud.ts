import { ARENA, type EnemyKind, type PlayerVehicleKind } from './config.ts'
import type { Game } from './game.ts'
import { toMapPoint } from './rules.ts'

export type QualityPreset = 'high' | 'low'

const MAP_SIZE = 180
const ENEMY_MAP_RADIUS: Record<EnemyKind, number> = {
  scout: 2.5,
  tank: 3.5,
  boss: 5,
}

export interface Hud {
  update(game: Game): void
  triggerHit(): void
  setQuality(preset: QualityPreset): void
  setVehicle(kind: PlayerVehicleKind): void
}

export interface HudCallbacks {
  onToggleQuality: () => void
  onSelectVehicle: (kind: PlayerVehicleKind) => void
  onResume: () => void
  onRestart: () => void
  onMenu: () => void
}

export function createHud(root: HTMLElement, callbacks: HudCallbacks): Hud {
  root.innerHTML = `
    <div class="hud-top">
      <div class="hp-bar"><div class="hp-fill" data-hp></div></div>
      <div class="hud-stats">
        <span data-score>Счёт: 0</span>
        <span data-wave>Волна: 1</span>
      </div>
    </div>
    <canvas class="minimap" data-minimap></canvas>
    <button type="button" class="quality-btn" data-quality title="Переключить тени (G)">
      Графика: Высокая
    </button>
    <div class="damage-flash" data-flash></div>
    <div class="overlay" data-menu>
      <h1>ARENA BATTLE</h1>
      <div class="vehicle-picker" role="group" aria-label="Выбор техники">
        <button type="button" class="vehicle-btn active" data-vehicle="buggy">
          <span class="vehicle-name">Багги</span>
          <span class="vehicle-meta">Быстрый · 90 HP</span>
        </button>
        <button type="button" class="vehicle-btn" data-vehicle="tank">
          <span class="vehicle-name">Танк</span>
          <span class="vehicle-meta">Броня · 160 HP</span>
        </button>
        <button type="button" class="vehicle-btn" data-vehicle="heavy">
          <span class="vehicle-name">Тяжёлый танк</span>
          <span class="vehicle-meta">Тяжёлый · 240 HP</span>
        </button>
      </div>
      <p>W/S — газ · A/D — руль · мышь — камера и башня · ЛКМ / Space — огонь · G — тени · Esc — пауза</p>
      <p class="big">Клик — в бой</p>
    </div>
    <div class="overlay hide" data-paused>
      <h1>ПАУЗА</h1>
      <div class="pause-actions">
        <button type="button" class="menu-btn primary" data-resume>Продолжить</button>
        <button type="button" class="menu-btn" data-restart>Начать заново</button>
        <button type="button" class="menu-btn" data-to-menu>В меню</button>
      </div>
    </div>
    <div class="overlay hide" data-over>
      <h1>РАЗБИТ</h1>
      <p class="big" data-final></p>
      <p>R или клик — ещё раз</p>
    </div>
  `

  const hp = root.querySelector<HTMLElement>('[data-hp]')!
  const score = root.querySelector<HTMLElement>('[data-score]')!
  const wave = root.querySelector<HTMLElement>('[data-wave]')!
  const menu = root.querySelector<HTMLElement>('[data-menu]')!
  const paused = root.querySelector<HTMLElement>('[data-paused]')!
  const over = root.querySelector<HTMLElement>('[data-over]')!
  const final = root.querySelector<HTMLElement>('[data-final]')!
  const qualityBtn = root.querySelector<HTMLButtonElement>('[data-quality]')!
  const resumeBtn = root.querySelector<HTMLButtonElement>('[data-resume]')!
  const restartBtn = root.querySelector<HTMLButtonElement>('[data-restart]')!
  const menuBtn = root.querySelector<HTMLButtonElement>('[data-to-menu]')!
  const vehicleBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-vehicle]'))
  const flash = root.querySelector<HTMLElement>('[data-flash]')!
  const minimap = root.querySelector<HTMLCanvasElement>('[data-minimap]')!
  const mapCtx = minimap.getContext('2d')!
  const mapPt = { mx: 0, my: 0 }
  let mapDpr = 0

  const syncMapDpr = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    if (dpr === mapDpr) return
    mapDpr = dpr
    minimap.width = Math.round(MAP_SIZE * dpr)
    minimap.height = Math.round(MAP_SIZE * dpr)
    mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  syncMapDpr()

  const bindBtn = (btn: HTMLButtonElement, fn: () => void) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      fn()
    })
  }
  bindBtn(qualityBtn, callbacks.onToggleQuality)
  bindBtn(resumeBtn, callbacks.onResume)
  bindBtn(restartBtn, callbacks.onRestart)
  bindBtn(menuBtn, callbacks.onMenu)
  for (const btn of vehicleBtns) {
    bindBtn(btn, () => callbacks.onSelectVehicle(btn.dataset.vehicle as PlayerVehicleKind))
  }

  let lastHp = -1
  let lastScore = -1
  let lastWave = -1
  let lastPhase = ''
  let flashTimer = 0

  return {
    update(game) {
      const maxHp = game.player.maxHp > 0 ? game.player.maxHp : 100
      const hpPct = Math.max(0, Math.min(100, (game.player.hp / maxHp) * 100))
      if (hpPct !== lastHp) {
        lastHp = hpPct
        hp.style.width = `${hpPct}%`
        hp.classList.toggle('low', hpPct <= 30)
      }
      if (game.score !== lastScore) {
        lastScore = game.score
        score.textContent = `Счёт: ${game.score}`
      }
      if (game.wave !== lastWave) {
        lastWave = game.wave
        wave.textContent = `Волна: ${Math.max(1, game.wave)}`
      }
      if (game.phase !== lastPhase) {
        lastPhase = game.phase
        menu.classList.toggle('hide', game.phase !== 'menu')
        paused.classList.toggle('hide', game.phase !== 'paused')
        over.classList.toggle('hide', game.phase !== 'over')
        if (game.phase === 'over') {
          final.textContent = `Счёт: ${game.score} · волн пройдено: ${Math.max(0, game.wave - 1)}`
        }
      }

      syncMapDpr()
      const scale = MAP_SIZE / (ARENA.half * 2)

      // 1. Arena background & frame.
      mapCtx.clearRect(0, 0, MAP_SIZE, MAP_SIZE)
      mapCtx.fillStyle = 'rgba(227, 221, 204, 0.35)'
      mapCtx.fillRect(0, 0, MAP_SIZE, MAP_SIZE)
      mapCtx.strokeStyle = 'rgba(16, 35, 61, 0.32)'
      mapCtx.lineWidth = 1.5
      mapCtx.strokeRect(0.75, 0.75, MAP_SIZE - 1.5, MAP_SIZE - 1.5)

      // 2. Obstacles.
      mapCtx.fillStyle = 'rgba(74, 80, 88, 0.78)'
      for (let i = 0; i < game.obstacles.length; i++) {
        const r = game.obstacles[i]
        toMapPoint(r.x, r.z, MAP_SIZE, ARENA.half, mapPt)
        const hw = r.hx * scale
        const hh = r.hz * scale
        mapCtx.fillRect(mapPt.mx - hw, mapPt.my - hh, hw * 2, hh * 2)
      }

      // 3. Player marker (green dot + heading line; yaw = 0 faces -Z = up on map).
      toMapPoint(game.player.x, game.player.z, MAP_SIZE, ARENA.half, mapPt)
      const dirX = -Math.sin(game.player.yaw)
      const dirY = -Math.cos(game.player.yaw)
      mapCtx.strokeStyle = '#1f7a3e'
      mapCtx.lineWidth = 2.2
      mapCtx.beginPath()
      mapCtx.moveTo(mapPt.mx, mapPt.my)
      mapCtx.lineTo(mapPt.mx + dirX * 9, mapPt.my + dirY * 9)
      mapCtx.stroke()
      mapCtx.fillStyle = '#2ea043'
      mapCtx.beginPath()
      mapCtx.arc(mapPt.mx, mapPt.my, 4, 0, Math.PI * 2)
      mapCtx.fill()
      mapCtx.strokeStyle = '#10233d'
      mapCtx.lineWidth = 1
      mapCtx.stroke()

      // 4. Bots (red dots sized by class).
      mapCtx.fillStyle = '#d93b3b'
      for (let i = 0; i < game.enemies.length; i++) {
        const e = game.enemies[i]
        toMapPoint(e.x, e.z, MAP_SIZE, ARENA.half, mapPt)
        mapCtx.beginPath()
        mapCtx.arc(mapPt.mx, mapPt.my, ENEMY_MAP_RADIUS[e.kind], 0, Math.PI * 2)
        mapCtx.fill()
      }
    },
    triggerHit() {
      flash.classList.add('active')
      window.clearTimeout(flashTimer)
      flashTimer = window.setTimeout(() => flash.classList.remove('active'), 160)
    },
    setQuality(preset) {
      qualityBtn.textContent = preset === 'high' ? 'Графика: Высокая' : 'Графика: Лёгкая'
      qualityBtn.classList.toggle('low', preset === 'low')
    },
    setVehicle(kind) {
      for (const btn of vehicleBtns) {
        btn.classList.toggle('active', btn.dataset.vehicle === kind)
      }
    },
  }
}
