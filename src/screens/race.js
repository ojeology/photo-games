import Phaser from 'phaser'
import { SprintScene } from '../game/SprintScene.js'

export function renderRace(container, nav) {
  container.innerHTML = `
    <div class="screen race-screen">
      <div id="game-root"></div>
      <div id="race-overlay" class="race-overlay hidden"></div>
    </div>
  `

  const root = container.querySelector('#game-root')
  const overlay = container.querySelector('#race-overlay')

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: root,
    backgroundColor: '#0a0e1a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    scene: [SprintScene],
  })

  function showResults(time) {
    overlay.classList.remove('hidden')
    overlay.innerHTML = `
      <div class="result-card">
        <h2>FINISH</h2>
        <div class="result-time">${time.toFixed(2)}s</div>
        <p class="result-sub">100m sprint · solo practice</p>
        <div class="result-actions">
          <button class="btn btn-primary" id="btn-again">Race again</button>
          <button class="btn btn-ghost" id="btn-menu">Menu</button>
        </div>
      </div>
    `
    overlay.querySelector('#btn-again').onclick = () => {
      overlay.classList.add('hidden')
      game.scene.getScene('sprint').scene.restart()
    }
    overlay.querySelector('#btn-menu').onclick = () => {
      try {
        game.destroy(true)
      } catch (e) {
        /* ignore */
      }
      container.__cleanup = null
      setTimeout(() => nav.goto('ready'), 60)
    }
  }

  game.registry.set('onFinish', showResults)

  container.__cleanup = () => {
    try {
      game.destroy(true)
    } catch (e) {
      /* ignore */
    }
  }
}
