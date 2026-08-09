import { store } from '../lib/store.js'

export function renderReady(container, nav) {
  const hasAvatar = store.hasAvatar()
  const hasHead = store.hasHead()

  let sub, btnLabel, btnAction, btnDisabled
  if (hasAvatar && hasHead) {
    sub = 'Looking sharp. Take it to the track.'
    btnLabel = 'Practice Sprint'
    btnAction = () => {
      // user gesture → go fullscreen + lock landscape, then load the race
      window.__photoGames.enterFullscreen().finally(() => nav.goto('race'))
    }
    btnDisabled = ''
  } else if (hasAvatar && !hasHead) {
    sub = 'Quick update needed to get your face on the track.'
    btnLabel = 'Update avatar'
    btnAction = () => nav.goto('avatar')
    btnDisabled = ''
  } else {
    sub = 'Create an avatar to start racing.'
    btnLabel = 'Create avatar'
    btnAction = () => nav.goto('avatar')
    btnDisabled = ''
  }

  const dataUrl = store.getAvatar()

  container.innerHTML = `
    <div class="screen ready-screen">
      <h2>Your Athlete</h2>
      <div class="ready-avatar">
        ${dataUrl ? `<img src="${dataUrl}" alt="your athlete" />` : `<p style="color:var(--muted)">No avatar yet.</p>`}
      </div>
      <p class="ready-sub">${sub}</p>
      <div class="ready-actions">
        <button class="btn btn-ghost" id="btn-edit">Edit avatar</button>
        <button class="btn btn-primary" id="btn-main">${btnLabel}</button>
      </div>
    </div>
  `

  container.querySelector('#btn-edit').onclick = () => nav.goto('avatar')
  const main = container.querySelector('#btn-main')
  if (main && btnAction) main.onclick = btnAction
}
