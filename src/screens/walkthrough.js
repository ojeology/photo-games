import { store } from '../lib/store.js'

// First-time "how to play" walkthrough. Shown before the first race (and
// re-watchable from the Ready screen). Teaches the controls with animated demos.
export function renderWalkthrough(container, nav, params = {}) {
  const event = params.event === 'hurdles' ? 'hurdles' : 'sprint'
  const avatar = store.getAvatar()

  const steps = [
    {
      title: 'MEET YOUR <span>ATHLETE</span>',
      body: 'Your real face is on the runner. Win the race, then beat your friends.',
      demo: 'avatar',
    },
    {
      title: 'HOW TO <span>SPRINT</span>',
      body: 'Alternate the two pads — <b>left, right, left, right</b> — as fast as you can.',
      demo: 'rhythm',
    },
    {
      title: 'DON\'T <span>FLINCH</span>',
      body: 'Wait for <b>BANG!</b> Tap before the gun and it\'s a <b>false start</b> — you reset.',
      demo: 'gun',
    },
    {
      title: 'MIND YOUR <span>FEET</span>',
      body: 'Hit the <b>same foot twice</b> and you <b>stumble</b>. Keep the rhythm!',
      demo: 'stumble',
    },
  ]
  if (event === 'hurdles') {
    steps.push({
      title: 'CLEAR THE <span>HURDLES</span>',
      body: 'Tap <b>JUMP</b> to leap each hurdle. Time it wrong and you crash into it.',
      demo: 'jump',
    })
  }

  let i = 0
  let demoTimer = null

  container.innerHTML = `
    <div class="screen" style="align-items:center;justify-content:center;">
      <div class="tut-overlay">
        <div class="tut-card" id="tut-card">
          <div class="tut-step-dots" id="tut-dots"></div>
          <div class="tut-title" id="tut-title"></div>
          <div class="tut-demo" id="tut-demo"></div>
          <div class="tut-body" id="tut-body"></div>
          <div class="tut-actions" id="tut-actions"></div>
        </div>
      </div>
    </div>
  `

  const dotsEl = container.querySelector('#tut-dots')
  const titleEl = container.querySelector('#tut-title')
  const demoEl = container.querySelector('#tut-demo')
  const bodyEl = container.querySelector('#tut-body')
  const actionsEl = container.querySelector('#tut-actions')

  function clearDemo() {
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null }
  }

  function pad(letter) {
    return `<div class="tut-pad" data-p="${letter}">${letter === 'J' ? '▲' : letter}</div>`
  }

  function renderDemo(kind) {
    clearDemo()
    demoEl.innerHTML = ''
    if (kind === 'avatar') {
      demoEl.innerHTML = `<div style="width:120px;height:120px;border-radius:50%;overflow:hidden;border:3px solid var(--gold);box-shadow:0 8px 30px rgba(0,0,0,0.5);">
        ${avatar ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;display:block;"/>` : ''}
      </div>`
      return
    }
    if (kind === 'rhythm') {
      demoEl.innerHTML = `<div class="tut-pad" data-p="L">L</div><div class="tut-arrow">↔</div><div class="tut-pad" data-p="R">R</div>`
      const L = demoEl.querySelector('[data-p="L"]')
      const R = demoEl.querySelector('[data-p="R"]')
      let on = 0
      demoTimer = setInterval(() => {
        on ^= 1
        L.classList.toggle('lit', !!on)
        R.classList.toggle('lit', !on)
      }, 420)
      return
    }
    if (kind === 'gun') {
      demoEl.innerHTML = `<div style="font-size:26px;font-weight:900;letter-spacing:2px;color:var(--muted);" id="gun-word">SET…</div>`
      const w = demoEl.querySelector('#gun-word')
      let n = 0
      const seq = ['SET…', 'SET…', 'BANG!', 'BANG!']
      demoTimer = setInterval(() => {
        n = (n + 1) % seq.length
        w.textContent = seq[n]
        w.style.color = seq[n] === 'BANG!' ? 'var(--red)' : 'var(--muted)'
        w.style.transform = seq[n] === 'BANG!' ? 'scale(1.2)' : 'scale(1)'
      }, 600)
      return
    }
    if (kind === 'stumble') {
      demoEl.innerHTML = `<div class="tut-pad lit" style="border-color:var(--red);background:rgba(230,57,70,0.2);color:var(--red);">L</div><div class="tut-arrow">×</div><div class="tut-pad lit" style="border-color:var(--red);background:rgba(230,57,70,0.2);color:var(--red);">L</div>`
      return
    }
    if (kind === 'jump') {
      demoEl.innerHTML = `<div class="tut-pad" data-p="J" style="width:84px;height:84px;">▲</div>`
      const J = demoEl.querySelector('[data-p="J"]')
      demoTimer = setInterval(() => { J.classList.toggle('lit') }, 700)
      return
    }
  }

  function renderStep() {
    const step = steps[i]
    // dots
    dotsEl.innerHTML = steps.map((_, k) => `<div class="tut-dot ${k === i ? 'active' : ''}"></div>`).join('')
    titleEl.innerHTML = step.title
    bodyEl.innerHTML = step.body
    renderDemo(step.demo)
    const last = i === steps.length - 1
    actionsEl.innerHTML = `
      <button class="btn btn-ghost" id="tut-skip">Skip</button>
      ${i > 0 ? '<button class="btn btn-ghost" id="tut-back">Back</button>' : ''}
      <button class="btn btn-primary" id="tut-next">${last ? 'Start race' : 'Next'}</button>
    `
    container.querySelector('#tut-back')?.addEventListener('click', () => { if (i > 0) { i--; renderStep() } })
    container.querySelector('#tut-next').onclick = () => {
      if (last) {
        clearDemo()
        store.setWalkthroughSeen()
        nav.goto('race', { event })
      } else { i++; renderStep() }
    }
    container.querySelector('#tut-skip').onclick = () => {
      clearDemo()
      store.setWalkthroughSeen()
      nav.goto('race', { event })
    }
  }

  renderStep()

  container.__cleanup = clearDemo
}
