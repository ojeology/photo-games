// Tiny WebAudio helper — no audio files needed, everything is synthesized.
// Guarded so it never breaks the game if audio is unavailable.

let ctx = null

function ac() {
  if (ctx) return ctx
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()
  } catch (e) {
    ctx = null
  }
  return ctx
}

// Call on a user gesture to unlock audio on mobile.
export function resumeAudio() {
  const c = ac()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

export function bang() {
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const dur = 0.32
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5)
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1700
  const g = c.createGain()
  g.gain.setValueAtTime(0.7, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(lp)
  lp.connect(g)
  g.connect(c.destination)
  src.start()
}

export function beep(freq = 660) {
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'square'
  o.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.3, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
  o.connect(g)
  g.connect(c.destination)
  o.start(t)
  o.stop(t + 0.2)
}

export function tick() {
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.value = 210
  const g = c.createGain()
  g.gain.setValueAtTime(0.15, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  o.connect(g)
  g.connect(c.destination)
  o.start(t)
  o.stop(t + 0.06)
}

export function stumbleSnd() {
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(150, t)
  o.frequency.exponentialRampToValueAtTime(55, t + 0.22)
  const g = c.createGain()
  g.gain.setValueAtTime(0.25, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
  o.connect(g)
  g.connect(c.destination)
  o.start(t)
  o.stop(t + 0.3)
}
