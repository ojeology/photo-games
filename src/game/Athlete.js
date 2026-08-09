import Phaser from 'phaser'
import { MAX_SPEED } from './config.js'

// A side-view athlete: circular face (the player's photo) on a procedural
// running body. Legs/arms swing with speed; body bobs + leans.
// Built as a Container so the whole figure can be positioned/rotated easily.
export class Athlete extends Phaser.GameObjects.Container {
  constructor(scene, x, groundY, headKey, jersey) {
    super(scene, x, groundY)
    this.groundY = groundY
    this.jersey = jersey
    this.phase = 0 // leg-cycle phase
    this.speed = 0 // px/s
    this.pose = 'marks' // marks | run | idle
    this.stumbleLock = 0 // ms remaining

    const shorts = jersey.alt
    const sleeve = jersey.alt

    // --- legs (two, front + back for depth) ---
    this.legBack = this.makeLeg(scene, shorts)
    this.legBack.x = -9
    this.legBack.setAlpha(0.72)

    this.legFront = this.makeLeg(scene, shorts)
    this.legFront.x = 9

    // --- shorts ---
    this.shorts = scene.add.rectangle(0, -52, 70, 22, shorts)

    // --- back arm (behind torso) ---
    this.armBack = scene.add.rectangle(-30, -104, 15, 48, sleeve)
    this.armBack.setOrigin(0.5, 0)
    this.armBack.setAlpha(0.72)

    // --- torso (jersey) ---
    this.torso = scene.add.rectangle(0, -84, 80, 58, jersey.color)
    // subtle chest trim
    this.trim = scene.add.rectangle(0, -110, 80, 6, 0xffffff, 0.25)

    // --- front arm (in front of torso) ---
    this.armFront = scene.add.rectangle(30, -104, 15, 48, sleeve)
    this.armFront.setOrigin(0.5, 0)

    // --- head: gold ring + face ---
    this.ring = scene.add.circle(0, -150, 48, 0xffd23f)
    if (headKey && scene.textures.exists(headKey)) {
      this.head = scene.add.image(0, -150, headKey).setDisplaySize(86, 86)
    } else {
      this.head = scene.add.circle(0, -150, 43, 0x8a93a8)
    }

    this.add([
      this.legBack,
      this.legFront,
      this.shorts,
      this.armBack,
      this.torso,
      this.trim,
      this.armFront,
      this.ring,
      this.head,
    ])
    scene.add.existing(this)
    this.setDepth(10)
  }

  makeLeg(scene, color) {
    const c = scene.add.container(0, -44) // hip pivot
    const upper = scene.add.rectangle(0, 20, 18, 40, color)
    const shoe = scene.add.rectangle(4, 40, 26, 9, 0x0b0b0b)
    c.add([upper, shoe])
    return c
  }

  setPose(p) {
    this.pose = p
  }

  applyStride() {
    this.speed = Math.min(MAX_SPEED, this.speed + 46)
  }

  applyStumble() {
    this.speed *= 0.5
    this.stumbleLock = 320
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.add({
        targets: this,
        angle: this.angle + 7,
        duration: 80,
        yoyo: true,
      })
    }
  }

  // Called every frame from the scene's update.
  updateAnim(dt) {
    if (this.stumbleLock > 0) this.stumbleLock -= dt * 1000

    const sf = this.speed / MAX_SPEED
    const still = (this.pose === 'marks' || this.pose === 'idle') && this.speed < 6

    if (still) {
      const crouch = this.pose === 'marks'
      this.legFront.rotation = Phaser.Math.Linear(this.legFront.rotation, crouch ? 0.55 : 0.05, 0.25)
      this.legBack.rotation = Phaser.Math.Linear(this.legBack.rotation, crouch ? -0.25 : -0.05, 0.25)
      this.armFront.rotation = Phaser.Math.Linear(this.armFront.rotation, crouch ? 0.35 : 0.06, 0.25)
      this.armBack.rotation = Phaser.Math.Linear(this.armBack.rotation, crouch ? -0.2 : -0.06, 0.25)
      this.y = Phaser.Math.Linear(this.y, this.groundY + (crouch ? 9 : 0), 0.25)
      this.rotation = Phaser.Math.Linear(this.rotation, crouch ? 0.28 : 0, 0.2)
      return
    }

    // running
    this.phase += Math.min(1, sf + 0.15) * dt * 24
    const sp = Math.sin(this.phase)
    this.legFront.rotation = sp * 0.8
    this.legBack.rotation = -sp * 0.8
    this.armFront.rotation = -sp * 0.7
    this.armBack.rotation = sp * 0.7

    const bob = Math.abs(Math.sin(this.phase * 2)) * 7 * Math.min(1, sf + 0.2)
    this.y = this.groundY - bob
    this.rotation = Phaser.Math.Linear(this.rotation, sf * 0.14, 0.2)
  }
}
