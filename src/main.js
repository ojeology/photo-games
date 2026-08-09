import { renderWelcome } from './screens/welcome.js'
import { renderAvatar } from './screens/avatar.js'
import { renderReady } from './screens/ready.js'
import { renderRace } from './screens/race.js'

const app = document.getElementById('app')

const screens = {
  welcome: renderWelcome,
  avatar: renderAvatar,
  ready: renderReady,
  race: renderRace,
}

function goto(name, params = {}) {
  // Tear down any screen that registered a cleanup (e.g. the Phaser game).
  if (typeof app.__cleanup === 'function') {
    try {
      app.__cleanup()
    } catch (e) {
      /* ignore */
    }
    app.__cleanup = null
  }
  app.innerHTML = ''
  const render = screens[name]
  if (!render) {
    console.error('Unknown screen:', name)
    return
  }
  render(app, { goto }, params)
}

// Enter real browser fullscreen + lock landscape on a user gesture.
// Hides mobile browser chrome (URL bar / status bar) for an immersive game.
async function enterFullscreen() {
  const el = document.documentElement
  try {
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen()
  } catch (_) {
    /* fullscreen may be blocked — ignore, game still runs */
  }
  try {
    await screen.orientation?.lock?.('landscape')
  } catch (_) {
    /* not supported (e.g. iOS) — CSS rotate-overlay handles it */
  }
}

window.__photoGames = { goto, enterFullscreen }

goto('welcome')
