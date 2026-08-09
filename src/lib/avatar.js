// Avatar compositing utilities.
// cropFace(): cut an oval face out of a source image given a transform.
// composeAvatar(): layer the cropped face onto a sleek athlete bust (layered sprite).

/**
 * Cut an oval crop out of `img`.
 * @param {HTMLImageElement|HTMLCanvasElement} img source photo
 * @param {{panX:number,panY:number,scale:number,rotation:number}} t transform
 *        (scale = full scale incl. base fit-cover; pan in source-canvas px;
 *        rotation in radians). Same transform used by the live crop canvas.
 * @param {{rx:number,ry:number}} oval radii
 * @returns {HTMLCanvasElement} the cropped face, sized rx*2 x ry*2
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
 * Compose the final athlete avatar: jersey bust + cropped face + gold ring.
 * Built as distinct layers so accessories (headbands, shades, team colors)
 * can be added later without a rewrite.
 * @param {HTMLImageElement|HTMLCanvasElement} face cropped face (aspect ~0.8)
 * @param {{color:string,alt:string}} jersey team colors
 * @returns {HTMLCanvasElement} 600x600 avatar
 */
export function composeAvatar(face, jersey = { color: '#e63946', alt: '#9d1b2a' }) {
  const size = 600
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')

  // Background fill (clean dark corners for JPEG export + UI blending)
  ctx.fillStyle = '#0a0e1a'
  ctx.fillRect(0, 0, size, size)

  // --- Layer 1: jersey / bust ---
  const grad = ctx.createLinearGradient(0, size * 0.5, 0, size)
  grad.addColorStop(0, jersey.color)
  grad.addColorStop(1, jersey.alt)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(size * 0.06, size)
  ctx.lineTo(size * 0.06, size * 0.84)
  ctx.bezierCurveTo(size * 0.06, size * 0.68, size * 0.17, size * 0.62, size * 0.33, size * 0.58)
  ctx.lineTo(size * 0.37, size * 0.52)
  ctx.lineTo(size * 0.63, size * 0.52)
  ctx.lineTo(size * 0.67, size * 0.58)
  ctx.bezierCurveTo(size * 0.83, size * 0.62, size * 0.94, size * 0.68, size * 0.94, size * 0.84)
  ctx.lineTo(size * 0.94, size)
  ctx.closePath()
  ctx.fill()

  // collar trim
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = size * 0.012
  ctx.beginPath()
  ctx.moveTo(size * 0.37, size * 0.52)
  ctx.lineTo(size * 0.63, size * 0.52)
  ctx.stroke()

  // --- Layer 2: face ---
  const faceW = size * 0.5
  const faceH = size * 0.625
  const fx = size / 2
  const fy = size * 0.34
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(fx, fy, faceW / 2, faceH / 2, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(face, fx - faceW / 2, fy - faceH / 2, faceW, faceH)
  ctx.restore()

  // depth shadow on the face edge
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = size * 0.01
  ctx.beginPath()
  ctx.ellipse(fx, fy, faceW / 2, faceH / 2, 0, 0, Math.PI * 2)
  ctx.stroke()

  // --- Layer 3: gold ring (future: accessory hooks above this) ---
  ctx.strokeStyle = '#ffd23f'
  ctx.lineWidth = size * 0.02
  ctx.beginPath()
  ctx.ellipse(fx, fy, faceW / 2 + size * 0.012, faceH / 2 + size * 0.012, 0, 0, Math.PI * 2)
  ctx.stroke()

  return c
}

/**
 * Make a compact circular head texture from the cropped face — used by the
 * race so the player's face sits on the running athlete's head.
 * Cover-fits the (oval) face into a circle, preserving aspect.
 * @param {HTMLImageElement|HTMLCanvasElement} face cropped face
 * @returns {HTMLCanvasElement} 200x200 circular head
 */
export function makeHead(face) {
  const s = 200
  const c = document.createElement('canvas')
  c.width = s
  c.height = s
  const ctx = c.getContext('2d')
  ctx.save()
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2)
  ctx.clip()
  const ar = face.width / face.height
  let dw, dh
  if (ar > 1) {
    dw = s
    dh = s / ar
  } else {
    dh = s
    dw = s * ar
  }
  ctx.drawImage(face, (s - dw) / 2, (s - dh) / 2, dw, dh)
  ctx.restore()
  return c
}
