import Phaser from 'phaser'
import { MAX_SPEED, STRIDE_IMPULSE, JUMP_DUR, JUMP_HEIGHT } from './config.js'

const SCALE = 1.15

// ----- body proportions (origin at the feet, y=0; body goes UP = negative y) -----
const HEAD_R = 25
const NECK_H = 11, NECK_W = 16
const TORSO_H = 56, SHOULDER_W = 48, WAIST_W = 35
const SHORTS_H = 19, SHORTS_W = 40
const THIGH_L = 47, THIGH_WT = 17, THIGH_WB = 13
const SHIN_L = 43, SHIN_WT = 13, SHIN_WB = 10
const FOOT_L = 24, FOOT_H = 10
const UARM_L = 39, UARM_WT = 14, UARM_WB = 11
const FARM_L = 35, FARM_WT = 11, FARM_WB = 9
const HAND_R = 7

// derived joint heights (negative = above feet)
const HIP_Y = -(FOOT_H + SHIN_L + THIGH_L)
const SHOULDER_Y = HIP_Y - TORSO_H
const HEAD_CY = SHOULDER_Y - NECK_H - HEAD_R

// ----- color helpers -----
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
 * A realistic, articulated side-view athlete. The player's real face is the
 * head; the body is drawn with tapered, shaded limbs hinged at joints
 * (hip/knee/ankle, shoulder/elbow) so it runs believably. Skin tone is
 * matched to the player's photo so the face blends in, not pasted on.
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

    // colors
    const skinN = toNum(skinHex || '#d2a27a')
    this.skin = skinN
    this.skinL = shade(skinN, 0.12) // highlight
    this.skinD = shade(skinN, -0.16) // shaded side
    this.skinDD = shade(skinN, -0.30) // deep shade (back limbs)
    const jc = toNum(jersey.color)
    this.jerseyC = jc
    this.jerseyD = shade(jc, -0.26)
    this.shortsC = shade(toNum(jersey.alt), -0.08)
    this.shortsD = shade(this.shortsC, -0.18)
    this.shoeC = 0x1b1b1f
    this.shoeBack = 0x121217

    this.build()
    this.setDepth(10)
    this.setScale(SCALE)
  }

  // ---- drawing helpers ----
  makeLimb(len, wT, wB, cT, cB) {
    const g = this.scene.add.graphics()
    g.fillGradientStyle(cT, cT, cB, cB, 1)
    g.beginPath()
    g.moveTo(-wT / 2, 0)
    g.lineTo(wT / 2, 0)
    g.lineTo(wB / 2, len)
    g.lineTo(-wB / 2, len)
    g.closePath()
    g.fillPath()
    g.fillCircle(0, 0, wT / 2)
    g.fillCircle(0, len, wB / 2)
    return g
  }

  makeShoe(back) {
    const g = this.scene.add.graphics()
    g.fillStyle(back ? this.shoeBack : this.shoeC, 1)
    g.fillRoundedRect(-5, SHIN_L - FOOT_H, FOOT_L, FOOT_H + 5, 5)
    // white sole
    g.fillStyle(0xffffff, 0.9)
    g.fillRect(-5, SHIN_L + 1, FOOT_L, 3)
    // toe cap highlight
    g.fillStyle(0xffffff, 0.12)
    g.fillRoundedRect(FOOT_L - 12, SHIN_L - FOOT_H + 2, 10, FOOT_H, 4)
    return g
  }

  makeHand(back) {
    const g = this.scene.add.graphics()
    g.fillStyle(back ? this.skinD : this.skin, 1)
    g.fillCircle(0, FARM_L, HAND_R)
    return g
  }

  build() {
    // --- back leg (darker, behind) ---
    this.legBack = this.scene.add.container(-5, HIP_Y)
    this.legBack.add(this.makeLimb(THIGH_L, THIGH_WT, THIGH_WB, this.skinD, this.skinDD))
    this.shinBack = this.scene.add.container(0, THIGH_L)
    this.shinBack.add(this.makeLimb(SHIN_L, SHIN_WT, SHIN_WB, this.skinD, this.skinDD))
    this.shinBack.add(this.makeShoe(true))
    this.legBack.add(this.shinBack)
    this.legBack.setAlpha(0.84)

    // --- back arm (darker, behind torso) ---
    this.armBack = this.scene.add.container(-15, SHOULDER_Y + 4)
    this.armBack.add(this.makeLimb(UARM_L, UARM_WT, UARM_WB, this.skinD, this.skinDD))
    this.forearmBack = this.scene.add.container(0, UARM_L)
    this.forearmBack.add(this.makeLimb(FARM_L, FARM_WT, FARM_WB, this.skinD, this.skinDD))
    this.forearmBack.add(this.makeHand(true))
    this.armBack.add(this.forearmBack)
    this.armBack.setAlpha(0.84)

    // --- torso (jersey) ---
    this.torso = this.scene.add.graphics()
    this.torso.fillGradientStyle(this.jerseyC, this.jerseyC, this.jerseyD, this.jerseyD, 1)
    this.torso.beginPath()
    this.torso.moveTo(-SHOULDER_W / 2, SHOULDER_Y + 7)
    this.torso.lineTo(-(NECK_W / 2 + 2), SHOULDER_Y)
    this.torso.lineTo(NECK_W / 2 + 2, SHOULDER_Y)
    this.torso.lineTo(SHOULDER_W / 2, SHOULDER_Y + 7)
    this.torso.lineTo(WAIST_W / 2, HIP_Y)
    this.torso.lineTo(-WAIST_W / 2, HIP_Y)
    this.torso.closePath()
    this.torso.fillPath()
    // chest side-shading
    this.torso.fillStyle(this.jerseyD, 0.4)
    this.torso.beginPath()
    this.torso.moveTo(SHOULDER_W / 2 - 4, SHOULDER_Y + 8)
    this.torso.lineTo(WAIST_W / 2, HIP_Y)
    this.torso.lineTo(WAIST_W / 2 - 10, HIP_Y)
    this.torso.lineTo(SHOULDER_W / 2 - 12, SHOULDER_Y + 10)
    this.torso.closePath()
    this.torso.fillPath()
    // collar V
    this.torso.lineStyle(3, 0xffffff, 0.5)
    this.torso.beginPath()
    this.torso.moveTo(-NECK_W / 2, SHOULDER_Y + 2)
    this.torso.lineTo(0, SHOULDER_Y + 13)
    this.torso.lineTo(NECK_W / 2, SHOULDER_Y + 2)
    this.torso.strokePath()

    // --- shorts ---
    this.shorts = this.scene.add.graphics()
    this.shorts.fillGradientStyle(this.shortsC, this.shortsC, this.shortsD, this.shortsD, 1)
    this.shorts.fillRoundedRect(-SHORTS_W / 2, HIP_Y - 3, SHORTS_W, SHORTS_H + 6, 6)
    // side stripe
    this.shorts.fillStyle(0xffffff, 0.25)
    this.shorts.fillRect(SHORTS_W / 2 - 5, HIP_Y - 2, 3, SHORTS_H + 3)

    // --- front leg (full color, in front) ---
    this.legFront = this.scene.add.container(5, HIP_Y)
    this.legFront.add(this.makeLimb(THIGH_L, THIGH_WT, THIGH_WB, this.skinL, this.skinD))
    this.shinFront = this.scene.add.container(0, THIGH_L)
    this.shinFront.add(this.makeLimb(SHIN_L, SHIN_WT, SHIN_WB, this.skinL, this.skinD))
    this.shinFront.add(this.makeShoe(false))
    this.legFront.add(this.shinFront)

    // --- front arm (full color, in front) ---
    this.armFront = this.scene.add.container(15, SHOULDER_Y + 4)
    this.armFront.add(this.makeLimb(UARM_L, UARM_WT, UARM_WB, this.skinL, this.skinD))
    this.forearmFront = this.scene.add.container(0, UARM_L)
    this.forearmFront.add(this.makeLimb(FARM_L, FARM_WT, FARM_WB, this.skinL, this.skinD))
    this.forearmFront.add(this.makeHand(false))
    this.armFront.add(this.forearmFront)

    // --- neck (skin) ---
    this.neck = this.scene.add.graphics()
    this.neck.fillGradientStyle(this.skinL, this.skinL, this.skin, this.skin, 1)
    this.neck.fillRoundedRect(-NECK_W / 2, SHOULDER_Y - NECK_H, NECK_W, NECK_H + 5, 4)

    // --- head: skin base + feathered face ---
    this.headBase = this.scene.add.circle(0, HEAD_CY, HEAD_R + 4, this.skin)
    if (headKey && this.scene.textures.exists(headKey)) {
      this.head = this.scene.add.image(0, HEAD_CY, headKey).setDisplaySize(HEAD_R * 2, HEAD_R * 2)
    } else {
      this.head = this.scene.add.circle(0, HEAD_CY, HEAD_R, this.skinD)
    }

    // add back-to-front so layering reads with depth
    this.add([
      this.legBack,
      this.armBack,
      this.torso,
      this.shorts,
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

    // jump arc
    if (this._airborne) {
      this.jumpT += dt / JUMP_DUR
      if (this.jumpT >= 1) { this._airborne = false; this.jumpT = 1 }
    }
    const jumpOff = this._airborne ? JUMP_HEIGHT * 4 * this.jumpT * (1 - this.jumpT) : 0

    if (still) {
      const crouch = this.pose === 'marks'
      const k = 0.22
      this.legFront.rotation = this._lerp(this.legFront.rotation, crouch ? 0.55 : 0.08, k)
      this.shinFront.rotation = this._lerp(this.shinFront.rotation, crouch ? 0.7 : 0.12, k)
      this.legBack.rotation = this._lerp(this.legBack.rotation, crouch ? -0.28 : -0.07, k)
      this.shinBack.rotation = this._lerp(this.shinBack.rotation, crouch ? 0.5 : 0.1, k)
      this.armFront.rotation = this._lerp(this.armFront.rotation, crouch ? 0.4 : 0.08, k)
      this.armBack.rotation = this._lerp(this.armBack.rotation, crouch ? -0.25 : -0.08, k)
      this.forearmFront.rotation = this._lerp(this.forearmFront.rotation, 0.25, k)
      this.forearmBack.rotation = this._lerp(this.forearmBack.rotation, 0.25, k)
      this.y = this._lerp(this.y, this.groundY + (crouch ? 8 : 0), k)
      this.rotation = this._lerp(this.rotation, crouch ? 0.24 : 0, 0.18)
      return
    }

    // running cycle
    this.phase += (0.18 + sf * 1.05) * dt * 20
    const p = this.phase
    const hipA = 0.75, kneeA = 1.15, armA = 0.62, elbowA = 0.95

    if (this._airborne) {
      // tucked jump pose: knees up, arms slightly back
      this.legFront.rotation = this._lerp(this.legFront.rotation, 0.5, 0.3)
      this.shinFront.rotation = this._lerp(this.shinFront.rotation, 1.0, 0.3)
      this.legBack.rotation = this._lerp(this.legBack.rotation, 0.35, 0.3)
      this.shinBack.rotation = this._lerp(this.shinBack.rotation, 0.85, 0.3)
      this.armFront.rotation = this._lerp(this.armFront.rotation, -0.3, 0.3)
      this.armBack.rotation = this._lerp(this.armBack.rotation, 0.5, 0.3)
      this.forearmFront.rotation = this._lerp(this.forearmFront.rotation, 0.3, 0.3)
      this.forearmBack.rotation = this._lerp(this.forearmBack.rotation, 0.4, 0.3)
    } else {
      // legs alternate; knees bend on the swing
      this.legFront.rotation = Math.sin(p) * hipA
      this.legBack.rotation = Math.sin(p + Math.PI) * hipA
      this.shinFront.rotation = 0.18 + Math.max(0, Math.sin(p + 1.1)) * kneeA
      this.shinBack.rotation = 0.18 + Math.max(0, Math.sin(p + 1.1 + Math.PI)) * kneeA
      // arms opposite to legs
      this.armFront.rotation = Math.sin(p + Math.PI) * armA
      this.armBack.rotation = Math.sin(p) * armA
      this.forearmFront.rotation = 0.35 + Math.max(0, Math.sin(p + Math.PI + 0.6)) * elbowA
      this.forearmBack.rotation = 0.35 + Math.max(0, Math.sin(p + 0.6)) * elbowA
    }

    const bob = Math.abs(Math.sin(p * 2)) * 6 * Math.min(1, sf + 0.25)
    this.y = this.groundY - bob - jumpOff
    this.rotation = this._lerp(this.rotation, 0.1 + sf * 0.12, 0.18)
  }
}
