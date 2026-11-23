import type { Game } from './game.ts'

export interface Hud {
  update(game: Game): void
}

export function createHud(root: HTMLElement): Hud {
  root.innerHTML = `
    <div class="hud-top">
      <div class="hp-bar"><div class="hp-fill" data-hp></div></div>
      <div class="hud-stats">
        <span data-score>0</span>
        <span data-wave>Волна 1</span>
      </div>
    </div>
    <div class="crosshair" data-cross></div>
    <div class="overlay" data-menu>
      <h1>ARENA BATTLE</h1>
      <p>WASD — ехать · мышь — башня · ЛКМ / Space — огонь</p>
      <p class="big">Клик — в бой</p>
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
  const cross = root.querySelector<HTMLElement>('[data-cross]')!
  const menu = root.querySelector<HTMLElement>('[data-menu]')!
  const over = root.querySelector<HTMLElement>('[data-over]')!
  const final = root.querySelector<HTMLElement>('[data-final]')!

  let lastHp = -1
  let lastScore = -1
  let lastWave = -1
  let lastPhase = ''

  return {
    update(game) {
      const hpPct = Math.max(0, Math.min(100, game.player.hp))
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
        over.classList.toggle('hide', game.phase !== 'over')
        cross.classList.toggle('hide', game.phase !== 'playing')
        if (game.phase === 'over') {
          final.textContent = `Счёт: ${game.score} · волн пройдено: ${Math.max(0, game.wave - 1)}`
        }
      }
    },
  }
}
