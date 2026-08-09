import Phaser from 'phaser'
import { MAX_SPEED, STRIDE_IMPULSE, JUMP_DUR, JUMP_HEIGHT } from './config.js'

const SCALE = 1.1

// body proportions (origin at the feet, y=0; body goes UP = negative y)
const HEAD_R = 24
const NECK_H = 12
const HIP_Y = -98
const SHOULDER_Y = HIP_Y - 52

// color helpers
function toNum(hex) {
  if (typeof hex === 'number') return hex
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return (parseInt(v.slice(0, 2), 16) << 16) | (parseInt(v.slice(2, 4), 16) << 8) | parseInt(v.slice(4, 6), 16)
}
function shade(num, amt) {
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)))
  return (f(r) << 16) | (f(g) << 8) | f(b)
}

/**
 * Side-view athlete. Uses simple GameObjects (rectangles/circles/images) in a
 * flat container — the proven-rendering structure — but with skin-tone-matched
 * limbs and a feathered face head for realism. Limbs are single-level
 * containers (hip pivot) so they can rotate for the run cycle.
 */
export class Athlete extends Phaser.GameObjects.Container {
  constructor(scene, x, groundY, headKey, jersey, skinHex) {
    super(scene, x, groundY)
    this.groundY = groundY
    this.pose = 'marks'
    this.phase = 0
    this.speed = 0
    this.stumbleLock = 0
    this._airborne = false
    this.jumpT = 0

    const skinN = toNum(skinHex || '#d2a27a')
    this.skin = skinN
    this.skinL = shade(skinN, 0.14)
    this.skinD = shade(skinN, -0.18)
    this.skinDD = shade(skinN, -0.32)
    const jc = toNum(jersey.color)
    this.jerseyC = jc
    this.jerseyD = shade(jc, -0.24)
    this.shortsC = shade(toNum(jersey.alt), -0.06)
    this.shortsD = shade(this.shortsC, -0.16)

    this.build(headKey)
    this.setDepth(10)
    this.setScale(SCALE)
  }

  // single-level leg container (hip pivot) — proven to render
  makeLeg(color, shoeColor) {
    const c = this.scene.add.container(0, HIP_Y)
    const thigh = this.scene.add.rectangle(0, 20, 17, 40, color)
    const shin = this.scene.add.rectangle(0, 56, 13, 40, color)
    const shoe = this.scene.add.rectangle(5, 78, 26, 10, shoeColor)
    shoe.setStrokeStyle(2, 0xffffff, 0.5)
    c.add([thigh, shin, shoe])
    return c
  }

  // single-level arm container (shoulder pivot)
  makeArm(color) {
    const c = this.scene.add.container(0, SHOULDER_Y + 2)
    const upper = this.scene.add.rectangle(0, 18, 14, 38, color)
    const fore = this.scene.add.rectangle(0, 52, 11, 32, color)
    const hand = this.scene.add.circle(0, 70, 7, color)
    c.add([upper, fore, hand])
    return c
  }

  build(headKey) {
    // back leg (darker)
    this.legBack = this.makeLeg(this.skinD, 0x121217)
    this.legBack.x = -6
    this.legBack.setAlpha(0.82)

    // back arm (darker)
    this.armBack = this.makeArm(this.skinD)
    this.armBack.x = -14
    this.armBack.setAlpha(0.82)

    // shorts
    this.shorts = this.scene.add.rectangle(0, HIP_Y + 2, 40, 22, this.shortsC)
    this.shorts.setStrokeStyle(2, this.shortsD, 1)

    // torso (jersey) — tapered via two stacked rects
    this.torso = this.scene.add.rectangle(0, SHOULDER_Y + 24, 46, 50, this.jerseyC)
    this.torso.setStrokeStyle(2, this.jerseyD, 1)
    // collar V hint
    this.collar = this.scene.add.rectangle(0, SHOULDER_Y + 2, 18, 4, 0xffffff, 0.5)

    // front leg (lighter skin)
    this.legFront = this.makeLeg(this.skinL, 0x1b1b1f)
    this.legFront.x = 6

    // front arm (lighter skin)
    this.armFront = this.makeArm(this.skinL)
    this.armFront.x = 14

    // neck (skin)
    this.neck = this.scene.add.rectangle(0, SHOULDER_Y - NECK_H / 2, 16, NECK_H, this.skinL)

    // head: skin base circle + feathered face image on top
    this.headBase = this.scene.add.circle(0, SHOULDER_Y - NECK_H - HEAD_R + 2, HEAD_R + 3, this.skin)
    if (headKey && this.scene.textures.exists(headKey)) {
      this.head = this.scene.add
        .image(0, SHOULDER_Y - NECK_H - HEAD_R + 2, headKey)
        .setDisplaySize(HEAD_R * 2, HEAD_R * 2)
    } else {
      this.head = this.scene.add.circle(0, SHOULDER_Y - NECK_H - HEAD_R + 2, HEAD_R, this.skinD)
    }

    this.add([
      this.legBack,
      this.armBack,
      this.shorts,
      this.torso,
      this.collar,
      this.legFront,
      this.armFront,
      this.neck,
      this.headBase,
      this.head,
    ])
    this.scene.add.existing(this)
  }

  setPose(p) { this.pose = p }

  applyStride() { this.speed = Math.min(MAX_SPEED, this.speed + STRIDE_IMPULSE) }

  applyStumble() {
    this.speed *= 0.55
    this.stumbleLock = 250
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.add({ targets: this, angle: this.angle + 10, duration: 90, yoyo: true })
    }
  }

  jump() {
    if (this._airborne) return false
    this._airborne = true
    this.jumpT = 0
    return true
  }
  get airborne() { return this._airborne }

  _lerp(a, b, t) { return a + (b - a) * t }

  updateAnim(dt) {
    if (this.stumbleLock > 0) this.stumbleLock -= dt * 1000
    const sf = this.speed / MAX_SPEED
    const still = (this.pose === 'marks' || this.pose === 'idle') && this.speed < 6 && !this._airborne

    if (this._airborne) {
      this.jumpT += dt / JUMP_DUR
      if (this.jumpT >= 1) { this._airborne = false; this.jumpT = 1 }
    }
    const jumpOff = this._airborne ? JUMP_HEIGHT * 4 * this.jumpT * (1 - this.jumpT) : 0

    if (still) {
      const crouch = this.pose === 'marks'
      const k = 0.22
      this.legFront.rotation = this._lerp(this.legFront.rotation, crouch ? 0.55 : 0.08, k)
      this.legBack.rotation = this._lerp(this.legBack.rotation, crouch ? -0.28 : -0.07, k)
      this.armFront.rotation = this._lerp(this.armFront.rotation, crouch ? 0.4 : 0.08, k)
      this.armBack.rotation = this._lerp(this.armBack.rotation, crouch ? -0.25 : -0.08, k)
      this.y = this._lerp(this.y, this.groundY + (crouch ? 8 : 0), k)
      this.rotation = this._lerp(this.rotation, crouch ? 0.22 : 0, 0.18)
      return
    }

    this.phase += (0.18 + sf * 1.05) * dt * 20
    const p = this.phase

    if (this._airborne) {
      this.legFront.rotation = this._lerp(this.legFront.rotation, 0.5, 0.3)
      this.legBack.rotation = this._lerp(this.legBack.rotation, 0.35, 0.3)
      this.armFront.rotation = this._lerp(this.armFront.rotation, -0.3, 0.3)
      this.armBack.rotation = this._lerp(this.armBack.rotation, 0.5, 0.3)
    } else {
      this.legFront.rotation = Math.sin(p) * 0.75
      this.legBack.rotation = Math.sin(p + Math.PI) * 0.75
      this.armFront.rotation = Math.sin(p + Math.PI) * 0.62
      this.armBack.rotation = Math.sin(p) * 0.62
    }

    const bob = Math.abs(Math.sin(p * 2)) * 6 * Math.min(1, sf + 0.25)
    this.y = this.groundY - bob - jumpOff
    this.rotation = this._lerp(this.rotation, 0.1 + sf * 0.12, 0.18)
  }
}
