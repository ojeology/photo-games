import { renderWelcome } from './screens/welcome.js'
import { renderAvatar } from './screens/avatar.js'
import { renderReady } from './screens/ready.js'

const app = document.getElementById('app')

const screens = {
  welcome: renderWelcome,
  avatar: renderAvatar,
  ready: renderReady,
}

function goto(name, params = {}) {
  app.innerHTML = ''
  const render = screens[name]
  if (!render) {
    console.error('Unknown screen:', name)
    return
  }
  render(app, { goto }, params)
}

// Try to lock landscape orientation if the browser allows it.
async function tryLockLandscape() {
  try {
    await document.documentElement.requestFullscreen?.()
  } catch (_) {
    /* fullscreen may need a user gesture — ignore failure */
  }
  try {
    await screen.orientation?.lock?.('landscape')
  } catch (_) {
    /* not supported (e.g. iOS) — CSS rotate-overlay handles it */
  }
}

// Expose for screens that want to lock on a user gesture (e.g. entering a race)
window.__photoGames = { goto, tryLockLandscape }

goto('welcome')
