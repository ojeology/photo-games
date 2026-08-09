import { store } from '../lib/store.js'

export function renderReady(container, nav) {
  const hasAvatar = store.hasAvatar()
  const hasHead = store.hasHead()

  // If an older avatar exists without the face crop, prompt to re-save.
  if (hasAvatar && !hasHead) {
    container.innerHTML = `
      <div class="screen ready-screen">
        <h2>Your Athlete</h2>
        <div class="ready-avatar"><img src="${store.getAvatar()}" alt="your athlete"/></div>
        <p class="ready-sub">Quick update needed to get your face on the track.</p>
        <div class="ready-actions">
          <button class="btn btn-primary" id="btn-edit">Update avatar</button>
        </div>
      </div>`
    container.querySelector('#btn-edit').onclick = () => nav.goto('avatar')
    return
  }

  if (!hasAvatar) {
    container.innerHTML = `
      <div class="screen ready-screen">
        <h2>Your Athlete</h2>
        <div class="ready-avatar"><p style="color:var(--muted)">No avatar yet.</p></div>
        <p class="ready-sub">Create an avatar to start racing.</p>
        <div class="ready-actions">
          <button class="btn btn-primary" id="btn-edit">Create avatar</button>
        </div>
      </div>`
    container.querySelector('#btn-edit').onclick = () => nav.goto('avatar')
    return
  }

  const seenTut = store.hasSeenWalkthrough()

  // go fullscreen (user gesture) then route via walkthrough if first time
  const startEvent = (event) => {
    window.__photoGames
      .enterFullscreen()
      .finally(() => {
        if (!store.hasSeenWalkthrough()) nav.goto('walkthrough', { event })
        else nav.goto('race', { event })
      })
  }

  container.innerHTML = `
    <div class="screen ready-screen" style="gap:14px;">
      <h2>Your Athlete</h2>
      <div class="ready-avatar"><img src="${store.getAvatar()}" alt="your athlete"/></div>
      <p class="ready-sub">Pick an event and take it to the track.</p>
      <div class="event-list">
        <button class="btn btn-primary event-btn" id="btn-sprint">
          <span class="event-name">100m Sprint</span>
          <span class="event-tag">rhythm tap</span>
        </button>
        <button class="btn btn-primary event-btn" id="btn-hurdles">
          <span class="event-name">100m Hurdles</span>
          <span class="event-tag">sprint + jump</span>
        </button>
        <button class="btn btn-ghost event-btn" id="btn-javelin" disabled>
          <span class="event-name">Javelin Throw</span>
          <span class="event-tag">coming soon</span>
        </button>
        <button class="btn btn-ghost event-btn" id="btn-longjump" disabled>
          <span class="event-name">Long Jump</span>
          <span class="event-tag">coming soon</span>
        </button>
      </div>
      <div class="ready-actions" style="margin-top:6px;">
        <button class="btn btn-ghost" id="btn-howto">How to play</button>
        <button class="btn btn-ghost" id="btn-edit">Edit avatar</button>
      </div>
    </div>
  `

  container.querySelector('#btn-sprint').onclick = () => startEvent('sprint')
  container.querySelector('#btn-hurdles').onclick = () => startEvent('hurdles')
  container.querySelector('#btn-howto').onclick = () => nav.goto('walkthrough', { event: 'sprint' })
  container.querySelector('#btn-edit').onclick = () => nav.goto('avatar')
}
