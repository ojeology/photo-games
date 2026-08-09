// Avatar compositing utilities.
// cropFace(): cut an oval face out of a source image given a transform.
// sampleSkinTone(): auto-detect skin tone from the face (so the drawn body
//   matches the player's real skin — key to looking realistic, not pasted).
// renderHead(): draw a feathered head (skin base + face fading at the rim).
// makeHead(): compact circular head texture for the runner.
// composeAvatar(): full athlete bust (shoulders, neck, jersey, feathered face).

/* ---- color helpers ---- */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex) {
  if (typeof hex === 'number') {
    return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 }
  }
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) }
}

/**
 * Cut an oval crop out of `img`.
 */
export function cropFace(img, t, oval) {
  const w = Math.round(oval.rx * 2)
  const h = Math.round(oval.ry * 2)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(w / 2, h / 2, oval.rx, oval.ry, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.clearRect(0, 0, w, h)
  ctx.translate(w / 2 + t.panX, h / 2 + t.panY)
  ctx.rotate(t.rotation)
  ctx.scale(t.scale, t.scale)
  ctx.drawImage(img, -img.width / 2, -img.height / 2)
  ctx.restore()

  return c
}

/**
 * Auto-detect a skin tone from the cropped face by sampling the cheek region.
 * Returns {r,g,b,hex}. Falls back to a medium tone if detection fails.
 * @param {HTMLImageElement|HTMLCanvasElement} face
 */
export function sampleSkinTone(face) {
  const w = face.width || face.naturalWidth
  const h = face.height || face.naturalHeight
  if (!w || !h) return { r: 210, g: 162, b: 122, hex: '#d2a27a' }

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  try {
    ctx.drawImage(face, 0, 0, w, h)
  } catch (e) {
    return { r: 210, g: 162, b: 122, hex: '#d2a27a' }
  }

  let data
  try {
    data = ctx.getImageData(0, 0, w, h).data
  } catch (e) {
    return { r: 210, g: 162, b: 122, hex: '#d2a27a' }
  }

  // sample the cheek band (lower-center of the face, below eyes/above chin)
  let rs = 0, gs = 0, bs = 0, n = 0
  const x0 = Math.floor(w * 0.32), x1 = Math.floor(w * 0.68)
  const y0 = Math.floor(h * 0.52), y1 = Math.floor(h * 0.74)
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * w + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
      // plausible skin pixel heuristic
      if (r > 95 && g > 40 && b > 20 && r > g && r > b && (r - g) > 12 && (mx - mn) > 15 && r < 255) {
        rs += r; gs += g; bs += b; n++
      }
    }
  }
  if (n < 8) return { r: 210, g: 162, b: 122, hex: '#d2a27a' }

  let r = clamp(rs / n, 130, 248)
  let g = clamp(gs / n, 88, 215)
  let b = clamp(bs / n, 64, 195)
  return { r, g, b, hex: rgbToHex(r, g, b) }
}

/**
 * Draw a feathered head onto ctx: a skin-tone base circle, the face cover-fit
 * on top, then a radial feather so the face fades into the skin at the rim
 * (kills the hard "sticker" edge). Shared by makeHead + composeAvatar.
 */
function renderHead(ctx, cx, cy, r, face, skin) {
  const sk = typeof skin === 'string' ? hexToRgb(skin) : skin
  const skinFill = `rgb(${sk.r},${sk.g},${sk.b})`

  // 1. skin base
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = skinFill
  ctx.fill()
  ctx.clip()

  // 2. face, cover-fit, nudged so features (not forehead) center
  const ar = face.width / face.height
  let dw, dh
  if (ar > 1) { dh = r * 2; dw = dh * ar } else { dw = r * 2; dh = dw / ar }
  const oy = -(dh - r * 2) * 0.42
  ctx.drawImage(face, cx - dw / 2, cy - dh / 2 + oy, dw, dh)

  // 3. feather the rim -> face fades into skin base (no hard circle edge)
  const grd = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r)
  grd.addColorStop(0, `rgba(${sk.r},${sk.g},${sk.b},0)`)
  grd.addColorStop(0.72, `rgba(${sk.r},${sk.g},${sk.b},0)`)
  grd.addColorStop(1, `rgba(${sk.r},${sk.g},${sk.b},1)`)
  ctx.fillStyle = grd
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()

  // 4. soft contact shadow under the chin (face has weight)
  ctx.save()
  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(cx, cy + r * 0.92, r * 0.6, r * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 5. subtle rim light on top for depth
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = r * 0.04
  ctx.beginPath()
  ctx.arc(cx, cy, r - r * 0.03, Math.PI * 1.15, Math.PI * 1.85)
  ctx.stroke()
  ctx.restore()
}

/**
 * Compact circular head texture for the runner (300x300).
 */
export function makeHead(face, skin) {
  const s = 300
  const c = document.createElement('canvas')
  c.width = s
  c.height = s
  const ctx = c.getContext('2d')
  renderHead(ctx, s / 2, s / 2, s / 2 - 2, face, skin)
  return c
}

function toNum(hex) {
  if (typeof hex === 'number') return hex
  const { r, g, b } = hexToRgb(hex)
  return (r << 16) | (g << 8) | b
}
function shadeNum(num, amt) {
  const { r, g, b } = hexToRgb(num)
  const f = (v) => clamp(Math.round(v + 255 * amt), 0, 255)
  return (f(r) << 16) | (f(g) << 8) | f(b)
}

/**
 * Full athlete bust (600x600): jersey shoulders, neck, feathered face.
 * Built layered so gear can hook in later.
 */
export function composeAvatar(face, jersey = { color: '#e63946', alt: '#9d1b2a' }, skin = '#d2a27a') {
  const size = 600
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#0a0e1a'
  ctx.fillRect(0, 0, size, size)

  const jc = toNum(jersey.color)
  const jcD = toNum(jersey.alt)
  const shortsC = shadeNum(jcD, -0.1)

  // --- shoulders / torso (jersey) ---
  const torsoTop = size * 0.6
  const grad = ctx.createLinearGradient(0, torsoTop, 0, size)
  grad.addColorStop(0, jersey.color)
  grad.addColorStop(1, jersey.alt)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(size * 0.1, size)
  ctx.lineTo(size * 0.12, size * 0.9)
  ctx.bezierCurveTo(size * 0.16, size * 0.66, size * 0.3, size * 0.6, size * 0.42, size * 0.56)
  ctx.lineTo(size * 0.46, size * 0.5)
  ctx.lineTo(size * 0.54, size * 0.5)
  ctx.lineTo(size * 0.58, size * 0.56)
  ctx.bezierCurveTo(size * 0.7, size * 0.6, size * 0.84, size * 0.66, size * 0.88, size * 0.9)
  ctx.lineTo(size * 0.9, size)
  ctx.closePath()
  ctx.fill()

  // shorts hem
  ctx.fillStyle = `#${shortsC.toString(16).padStart(6, '0')}`
  ctx.fillRect(size * 0.12, size * 0.93, size * 0.76, size * 0.05)

  // collar V
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = size * 0.014
  ctx.beginPath()
  ctx.moveTo(size * 0.46, size * 0.5)
  ctx.lineTo(size * 0.5, size * 0.575)
  ctx.lineTo(size * 0.54, size * 0.5)
  ctx.stroke()

  // --- neck (skin) ---
  const sk = typeof skin === 'string' ? hexToRgb(skin) : skin
  const neckGrad = ctx.createLinearGradient(0, size * 0.42, 0, size * 0.56)
  neckGrad.addColorStop(0, `rgb(${clamp(sk.r + 18, 0, 255)},${clamp(sk.g + 12, 0, 255)},${clamp(sk.b + 8, 0, 255)})`)
  neckGrad.addColorStop(1, `rgb(${sk.r},${sk.g},${sk.b})`)
  ctx.fillStyle = neckGrad
  ctx.beginPath()
  ctx.moveTo(size * 0.46, size * 0.56)
  ctx.lineTo(size * 0.46, size * 0.46)
  ctx.quadraticCurveTo(size * 0.5, size * 0.43, size * 0.54, size * 0.46)
  ctx.lineTo(size * 0.54, size * 0.56)
  ctx.closePath()
  ctx.fill()

  // --- head (feathered face on skin base) ---
  renderHead(ctx, size / 2, size * 0.32, size * 0.22, face, skin)

  return c
}
