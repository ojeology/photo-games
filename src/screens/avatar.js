import { store } from '../lib/store.js'
import { cropFace, composeAvatar } from '../lib/avatar.js'

const JERSEYS = [
  { id: 'red', color: '#e63946', alt: '#9d1b2a' },
  { id: 'blue', color: '#1d4ed8', alt: '#1e3a8a' },
  { id: 'green', color: '#16a34a', alt: '#14532d' },
  { id: 'gold', color: '#ffd23f', alt: '#b8860b' },
  { id: 'cyan', color: '#00b8d4', alt: '#086375' },
]

const OVAL = { rx: 240, ry: 300 }

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

export function renderAvatar(container, nav) {
  let img = null
  let transform = { panX: 0, panY: 0, scale: 1, rotation: 0 }
  let baseScale = 1
  let jerseyIdx = 0

  container.innerHTML = `
    <div class="screen avatar-screen">
      <header class="screen-head">
        <h2>Create your <span>athlete</span></h2>
        <p id="step-label" class="step-label">Step 1 of 3 — Upload your face</p>
      </header>
      <div class="screen-body" id="avatar-body"></div>
    </div>
  `
  const body = container.querySelector('#avatar-body')
  const stepLabel = container.querySelector('#step-label')

  showUpload()

  // ---------- STEP 1: UPLOAD ----------
  function showUpload() {
    stepLabel.textContent = 'Step 1 of 3 — Upload your face'
    body.innerHTML = `
      <div class="upload-state">
        <div class="upload-zone" id="upload-zone">
          <div class="upload-icon">📷</div>
          <p class="upload-title">Add your photo</p>
          <p class="upload-sub">Front-facing selfie, good light</p>
        </div>
        <div class="upload-actions">
          <button class="btn btn-ghost" id="btn-file">Choose photo</button>
          <button class="btn btn-ghost" id="btn-camera">Take selfie</button>
        </div>
        <input type="file" id="file-input" accept="image/*" hidden />
        <input type="file" id="camera-input" accept="image/*" capture="user" hidden />
        <label class="consent">
          <input type="checkbox" id="consent" />
          <span>I confirm this is my photo and I have permission to use it.</span>
        </label>
        <button class="btn btn-primary" id="btn-continue" disabled>Continue</button>
      </div>
    `
    const fileInput = body.querySelector('#file-input')
    const cameraInput = body.querySelector('#camera-input')
    const consent = body.querySelector('#consent')
    const cont = body.querySelector('#btn-continue')
    const zone = body.querySelector('#upload-zone')

    body.querySelector('#btn-file').onclick = () => fileInput.click()
    body.querySelector('#btn-camera').onclick = () => cameraInput.click()
    zone.onclick = () => fileInput.click()

    fileInput.onchange = onFile
    cameraInput.onchange = onFile
    consent.onchange = update
    cont.onclick = () => { if (img) showCrop() }

    function onFile(e) {
      const f = e.target.files && e.target.files[0]
      if (!f) return
      const url = URL.createObjectURL(f)
      const image = new Image()
      image.onload = () => {
        img = image
        zone.classList.add('has-img')
        zone.querySelector('.upload-title').textContent = 'Got it!'
        zone.querySelector('.upload-sub').textContent = 'Looks good — continue when ready'
        update()
      }
      image.onerror = () => alert('Could not load that image. Try another.')
      image.src = url
    }
    function update() {
      cont.disabled = !(img && consent.checked)
    }
  }

  // ---------- STEP 2: CROP ----------
  function showCrop() {
    stepLabel.textContent = 'Step 2 of 3 — Position your face'
    body.innerHTML = `
      <div class="crop-state">
        <div class="crop-stage">
          <canvas id="crop-canvas"></canvas>
        </div>
        <div class="crop-side">
          <div class="crop-side-scroll">
            <div class="preview-box">
              <canvas id="preview-canvas" width="180" height="180"></canvas>
              <p class="preview-label">Your athlete</p>
            </div>
            <div class="swatches" id="swatches"></div>
            <div class="control-row">
              <label>Zoom</label>
              <input type="range" id="zoom" min="0.4" max="3.5" step="0.01" value="1" />
            </div>
            <div class="control-row">
              <label>Rotate</label>
              <input type="range" id="rotate" min="-45" max="45" step="1" value="0" />
            </div>
            <p class="crop-hint">Drag to move · pinch or scroll to zoom</p>
          </div>
          <div class="crop-actions">
            <button class="btn btn-ghost" id="btn-back">Back</button>
            <button class="btn btn-primary" id="btn-confirm">Looks good</button>
          </div>
        </div>
      </div>
    `

    const canvas = body.querySelector('#crop-canvas')
    canvas.width = OVAL.rx * 2
    canvas.height = OVAL.ry * 2
    const ctx = canvas.getContext('2d')
    const preview = body.querySelector('#preview-canvas')
    const pctx = preview.getContext('2d')
    const zoom = body.querySelector('#zoom')
    const rotate = body.querySelector('#rotate')
    const swatchesEl = body.querySelector('#swatches')

    // team color swatches
    JERSEYS.forEach((j, i) => {
      const b = document.createElement('button')
      b.className = 'swatch' + (i === jerseyIdx ? ' active' : '')
      b.style.background = `linear-gradient(160deg, ${j.color}, ${j.alt})`
      b.title = j.id
      b.onclick = () => { jerseyIdx = i; refreshSwatches(); draw() }
      swatchesEl.appendChild(b)
    })
    function refreshSwatches() {
      swatchesEl.querySelectorAll('.swatch').forEach((s, i) =>
        s.classList.toggle('active', i === jerseyIdx)
      )
    }

    // fit-cover base scale (slightly oversized so the face fills the oval by default)
    baseScale = Math.max(canvas.width / img.width, canvas.height / img.height) * 1.1
    transform = { panX: 0, panY: 0, scale: 1, rotation: 0 }
    zoom.value = 1
    rotate.value = 0

    const fullScale = () => baseScale * transform.scale

    function draw() {
      const cw = canvas.width
      const ch = canvas.height
      const cx = cw / 2
      const cy = ch / 2

      ctx.clearRect(0, 0, cw, ch)
      ctx.fillStyle = '#0a0e1a'
      ctx.fillRect(0, 0, cw, ch)

      // image
      ctx.save()
      ctx.translate(cx + transform.panX, cy + transform.panY)
      ctx.rotate(transform.rotation)
      ctx.scale(fullScale(), fullScale())
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      ctx.restore()

      // darken outside the oval (cut a hole with evenodd)
      ctx.save()
      ctx.fillStyle = 'rgba(5,8,16,0.72)'
      ctx.beginPath()
      ctx.rect(0, 0, cw, ch)
      ctx.ellipse(cx, cy, OVAL.rx, OVAL.ry, 0, 0, Math.PI * 2)
      ctx.fill('evenodd')
      ctx.restore()

      // gold ring
      ctx.strokeStyle = '#ffd23f'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.ellipse(cx, cy, OVAL.rx, OVAL.ry, 0, 0, Math.PI * 2)
      ctx.stroke()

      // crosshair
      ctx.strokeStyle = 'rgba(255,210,63,0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx - 14, cy); ctx.lineTo(cx + 14, cy)
      ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy + 14)
      ctx.stroke()

      drawPreview()
    }

    function drawPreview() {
      const face = cropFace(
        img,
        { panX: transform.panX, panY: transform.panY, scale: fullScale(), rotation: transform.rotation },
        OVAL
      )
      const avatar = composeAvatar(face, JERSEYS[jerseyIdx])
      pctx.clearRect(0, 0, preview.width, preview.height)
      pctx.drawImage(avatar, 0, 0, preview.width, preview.height)
    }

    // ---- pointer interaction: drag + pinch (zoom & rotate) ----
    const pointers = new Map()
    let lastDist = 0
    let lastAng = 0
    let hasAng = false

    function toCanvas(e) {
      const r = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - r.left) * (canvas.width / r.width),
        y: (e.clientY - r.top) * (canvas.height / r.height),
      }
    }
    function initGesture() {
      const pts = [...pointers.values()]
      lastDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      lastAng = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x)
      hasAng = true
    }

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId)
      const p = toCanvas(e)
      pointers.set(e.pointerId, { x: p.x, y: p.y, px: p.x, py: p.y })
      if (pointers.size === 2) initGesture()
    })
    canvas.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return
      const p = toCanvas(e)
      const ent = pointers.get(e.pointerId)
      ent.px = ent.x
      ent.py = ent.y
      ent.x = p.x
      ent.y = p.y
      if (pointers.size >= 2) {
        const pts = [...pointers.values()]
        const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
        const ang = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x)
        if (lastDist) {
          transform.scale = clamp(transform.scale * (d / lastDist), 0.4, 3.5)
          zoom.value = transform.scale
        }
        if (hasAng) {
          let da = ang - lastAng
          while (da > Math.PI) da -= 2 * Math.PI
          while (da < -Math.PI) da += 2 * Math.PI
          transform.rotation = clamp(transform.rotation + da, -Math.PI / 4, Math.PI / 4)
          rotate.value = (transform.rotation * 180) / Math.PI
        }
        lastDist = d
        lastAng = ang
        draw()
      } else {
        transform.panX += ent.x - ent.px
        transform.panY += ent.y - ent.py
        draw()
      }
    })
    const endPtr = (e) => {
      pointers.delete(e.pointerId)
      if (pointers.size === 2) initGesture()
      else if (pointers.size < 2) hasAng = false
    }
    canvas.addEventListener('pointerup', endPtr)
    canvas.addEventListener('pointercancel', endPtr)
    canvas.addEventListener('pointerleave', endPtr)

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        transform.scale = clamp(transform.scale * (1 - e.deltaY * 0.0015), 0.4, 3.5)
        zoom.value = transform.scale
        draw()
      },
      { passive: false }
    )

    zoom.oninput = () => { transform.scale = parseFloat(zoom.value); draw() }
    rotate.oninput = () => {
      transform.rotation = (parseFloat(rotate.value) * Math.PI) / 180
      draw()
    }

    body.querySelector('#btn-back').onclick = () => showUpload()
    body.querySelector('#btn-confirm').onclick = () => {
      const btn = body.querySelector('#btn-confirm')
      try {
        btn.disabled = true
        btn.textContent = 'Saving…'
        const face = cropFace(
          img,
          { panX: transform.panX, panY: transform.panY, scale: fullScale(), rotation: transform.rotation },
          OVAL
        )
        const avatar = composeAvatar(face, JERSEYS[jerseyIdx])
        const dataUrl = avatar.toDataURL('image/jpeg', 0.9)
        store.setAvatar(dataUrl)
        nav.goto('ready')
      } catch (err) {
        console.error('Avatar save failed:', err)
        btn.disabled = false
        btn.textContent = 'Looks good'
        alert('Something went wrong saving your avatar: ' + (err && err.message ? err.message : err) + '. Please try again or use a different photo.')
      }
    }

    draw()
  }
}
