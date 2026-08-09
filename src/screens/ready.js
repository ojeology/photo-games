import { store } from '../lib/store.js'

export function renderReady(container, nav) {
  const dataUrl = store.getAvatar()

  container.innerHTML = `
    <div class="screen ready-screen">
      <h2>Your Athlete</h2>
      <div class="ready-avatar">
        ${dataUrl ? `<img src="${dataUrl}" alt="your athlete" />` : `<p style="color:var(--muted)">No avatar yet.</p>`}
      </div>
      <p class="ready-sub">Looking sharp. Ready for the Games.</p>
      <div class="ready-actions">
        <button class="btn btn-ghost" id="btn-edit">Edit avatar</button>
        <button class="btn btn-primary" id="btn-join" disabled>Enter the Meet — soon</button>
      </div>
    </div>
  `

  container.querySelector('#btn-edit').onclick = () => nav.goto('avatar')
  // "Enter the Meet" is the next milestone (lobby + live race). Disabled for now.
}
