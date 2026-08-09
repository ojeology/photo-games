import Phaser from 'phaser'
import { SprintScene } from './SprintScene.js'
import { HURDLE_METERS, START_X, PX_PER_M, WORLD_GROUND_Y } from './config.js'
import { beep, resumeAudio } from '../lib/audio.js'

// Hurdles = the sprint engine + hurdles to clear + a JUMP button.
// Reuses everything from SprintScene (controls, countdown, finish, HUD).
export class HurdlesScene extends SprintScene {
  constructor() {
    super()
    this.eventKey = 'hurdles'
  }

  create() {
    super.create()
    this.eventLabel = '100m Hurdles'
    this.hintMessage = 'RUN  WITH  L↔R  ·  HIT  JUMP  TO  CLEAR  HURDLES'
    this.buildHurdles()
  }

  // world-space hurdles (built once)
  buildHurdles() {
    this.hurdles = HURDLE_METERS.map((m) => {
      const x = START_X + m * PX_PER_M
      const g = this.add.graphics().setDepth(3)
      // posts
      g.fillStyle(0xffffff, 0.9)
      g.fillRect(x - 2, WORLD_GROUND_Y - 78, 4, 78)
      g.fillRect(x + 18, WORLD_GROUND_Y - 78, 4, 78)
      // top bar (red/white)
      g.fillStyle(0xe63946, 1)
      g.fillRect(x - 6, WORLD_GROUND_Y - 82, 32, 8)
      g.fillStyle(0xffffff, 0.95)
      g.fillRect(x - 6, WORLD_GROUND_Y - 82, 32, 3)
      // shadow
      g.fillStyle(0x000000, 0.2)
      g.fillEllipse(x + 8, WORLD_GROUND_Y + 4, 40, 8)
      return { x, cleared: false, gfx: g }
    })
  }

  // event-specific control: JUMP button (screen-space, survives resize)
  buildEventControls(s, f) {
    const W = this.W, H = this.H
    const ps = Phaser.Math.Clamp(Math.round(Math.min(W, H) * 0.26), 110, 180)
    const jx = W / 2
    const jy = H - 16 - ps / 2

    const pad = this.add
      .image(jx, jy, 'pad')
      .setDisplaySize(ps, ps)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
    s.push(pad)

    const lbl = this.add
      .text(jx, jy - 4, '▲\nJUMP', {
        fontFamily: 'Arial',
        fontSize: Math.round(20 * f) + 'px',
        fontStyle: '900',
        color: 'rgba(255,255,255,0.6)',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
    s.push(lbl)

    const doJump = () => {
      resumeAudio()
      pad.setScale(0.9)
      pad.setTint(0x00e5ff)
      this.tweens.add({ targets: pad, scaleX: 1, scaleY: 1, duration: 120 })
      this.tweens.add({ targets: pad, tint: 0xffffff, duration: 200 })
      if (this.athlete && this.raceActive && !this.athlete.airborne) {
        this.athlete.jump()
        beep(740)
      }
    }
    pad.on('pointerdown', doJump)
    this.jumpBtn = pad

    // keyboard: space / up to jump
    const kb = this.input.keyboard
    if (kb) kb.on('keydown-SPACE', doJump)
  }

  update(time, delta) {
    super.update(time, delta)
    if (!this.athlete || this.finished) return
    for (const h of this.hurdles) {
      if (h.cleared) continue
      if (this.athlete.x >= h.x) {
        if (this.athlete.airborne) {
          // cleared!
          h.cleared = true
          beep(1040)
          this.tweens.add({ targets: h.gfx, scaleY: 1.08, duration: 120, yoyo: true })
        } else {
          // crashed into hurdle
          h.cleared = true
          this.athlete.applyStumble()
          // knock the hurdle down
          this.tweens.add({ targets: h.gfx, angle: 62, alpha: 0.5, duration: 260 })
        }
      }
    }
  }
}
