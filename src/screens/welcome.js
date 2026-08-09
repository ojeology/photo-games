import { store } from '../lib/store.js'

export function renderWelcome(container, nav) {
  const hasAvatar = store.hasAvatar()

  container.innerHTML = `
    <div class="screen welcome-screen">
      <div class="lane-motif"></div>
      <h1>PHOTO<br><span>GAMES</span></h1>
      <p class="welcome-tag">Your face. Your friends. The podium.</p>
      <div class="welcome-actions">
        <button class="btn btn-primary btn-lg" id="btn-create">Create a Meet</button>
        <button class="btn btn-ghost btn-lg" id="btn-join">Join via link</button>
        ${
          hasAvatar
            ? '<button class="btn btn-ghost" id="btn-ready">View my athlete</button>'
            : ''
        }
      </div>
      <p class="welcome-foot">v1 · AVATAR BUILDER PREVIEW</p>
    </div>
  `

  // Both create & join need an athlete first — for now both route to the avatar builder.
  // This first tap is also our user-gesture moment to go fullscreen + lock landscape
  // for the whole app, so every screen runs immersive, not just the arena.
  const enter = () => window.__photoGames.enterFullscreen()

  container.querySelector('#btn-create').onclick = () => enter().finally(() => nav.goto('avatar'))
  container.querySelector('#btn-join').onclick = () => enter().finally(() => nav.goto('avatar'))
  const ready = container.querySelector('#btn-ready')
  if (ready) ready.onclick = () => enter().finally(() => nav.goto('ready'))
}
