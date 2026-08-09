import Phaser from 'phaser'
import { Athlete } from './Athlete.js'
import { store } from '../lib/store.js'
import {
  bang,
  beep,
  tick,
  stumbleSnd,
  resumeAudio,
} from '../lib/audio.js'
import {
  DESIGN_W,
  DESIGN_H,
  GROUND_Y,
  TRACK_M,
  PX_PER_M,
  START_X,
  FINISH_X,
  ATHLETE_SCREEN_X,
  MAX_SPEED,
  FRICTION,
} from './config.js'

export class SprintScene extends Phaser.Scene {
  constructor() {
    super('sprint')
  }

  create() {
    // --- state ---
    this.raceActive = false
    this.finished = false
    this.startTime = 0
    this.elapsed = 0
    this.finalTime = 0
    this.lastFoot = null
    this.timers = []

    this.makeTextures()
    this.buildBackground()
    this.buildTrack()
    this.buildFinishLine()
    this.buildHUD()
    this.buildControls()
    this.buildCountdown()

    // shadow under the athlete (stays on the ground, doesn't bob)
    this.shadow = this.add.ellipse(START_X, GROUND_Y + 4, 84, 18, 0x000000, 0.28)
    this.shadow.setDepth(2)

    this.cameras.main.setBounds(0, 0, FINISH_X + 220, DESIGN_H)

    this.loadAvatarThenStart()
  }

  // ---------- textures ----------
  makeTextures() {
    if (!this.textures.exists('crowd')) this.makeCrowdTexture()
    if (!this.textures.exists('pad')) this.makePadTexture()
  }

  makeCrowdTexture() {
    const w = 256
    const h = 96
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#0d1326'
    ctx.fillRect(0, 0, w, h)
    const colors = ['#e63946', '#ffd23f', '#1d4ed8', '#16a34a', '#ffffff', '#00b8d4', '#f97316', '#a855f7']
    for (let i = 0; i < 520; i++) {
      ctx.fillStyle = colors[(Math.random() * colors.length) | 0]
      ctx.globalAlpha = 0.45 + Math.random() * 0.55
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2)
    }
    this.textures.addCanvas('crowd', c)
  }

  makePadTexture() {
    const s = 240
    const c = document.createElement('canvas')
    c.width = s
    c.height = s
    const ctx = c.getContext('2d')
    const r = 30
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.arcTo(s, 0, s, s, r)
    ctx.arcTo(s, s, 0, s, r)
    ctx.arcTo(0, s, 0, 0, r)
    ctx.arcTo(0, 0, s, 0, r)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, s)
    g.addColorStop(0, 'rgba(255,255,255,0.14)')
    g.addColorStop(1, 'rgba(255,255,255,0.04)')
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 2
    ctx.stroke()
    this.textures.addCanvas('pad', c)
  }

  // ---------- background ----------
  buildBackground() {
    // sky gradient (fixed to screen)
    const sky = this.add.graphics().setScrollFactor(0)
    sky.fillGradientStyle(0x0a0e1a, 0x0a0e1a, 0x2a3a63, 0x3f5483, 1)
    sky.fillRect(0, 0, DESIGN_W, GROUND_Y)

    // stadium stands band (fixed)
    const stands = this.add.graphics().setScrollFactor(0)
    stands.fillStyle(0x121a30, 1)
    stands.fillRect(0, GROUND_Y - 140, DESIGN_W, 140)
    stands.fillStyle(0x0b1224, 1)
    for (let x = 0; x < DESIGN_W + 40; x += 44) {
      stands.fillRect(x, GROUND_Y - 160, 26, 26)
    }

    // crowd (parallax via manual tile scroll in update)
    this.crowd = this.add
      .tileSprite(0, GROUND_Y - 128, DESIGN_W, 104, 'crowd')
      .setOrigin(0, 0)
      .setScrollFactor(0)

    // soft floodlight wash
    const glow = this.add.graphics().setScrollFactor(0)
    glow.fillStyle(0xffffff, 0.035)
    glow.fillRect(0, 0, DESIGN_W, GROUND_Y)
  }

  // ---------- track ----------
  buildTrack() {
    const g = this.add.graphics()
    const end = FINISH_X + 220

    // tartan surface
    g.fillStyle(0x9c3d2e, 1)
    g.fillRect(0, GROUND_Y, end, DESIGN_H - GROUND_Y)
    // darker near edge
    g.fillStyle(0x6e2a1f, 1)
    g.fillRect(0, DESIGN_H - 34, end, 34)

    // lane perspective lines
    g.lineStyle(2, 0xb5523f, 0.5)
    for (let y = GROUND_Y + 22; y < DESIGN_H - 30; y += 28) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(end, y)
      g.strokePath()
    }

    // bright ground line
    g.lineStyle(3, 0xffffff, 0.45)
    g.beginPath()
    g.moveTo(0, GROUND_Y)
    g.lineTo(end, GROUND_Y)
    g.strokePath()

    // start line
    g.lineStyle(5, 0xffffff, 0.85)
    g.beginPath()
    g.moveTo(START_X, GROUND_Y)
    g.lineTo(START_X, GROUND_Y + 70)
    g.strokePath()

    // distance markers every 20m
    for (let m = 20; m < TRACK_M; m += 20) {
      const x = START_X + m * PX_PER_M
      g.lineStyle(2, 0xffffff, 0.22)
      g.beginPath()
      g.moveTo(x, GROUND_Y)
      g.lineTo(x, GROUND_Y + 60)
      g.strokePath()
      this.add
        .text(x, GROUND_Y - 6, m + 'm', {
          fontFamily: 'Arial',
          fontSize: '17px',
          fontStyle: '700',
          color: 'rgba(255,255,255,0.45)',
        })
        .setOrigin(0.5, 1)
    }
  }

  buildFinishLine() {
    const fx = FINISH_X
    // white line
    this.add.rectangle(fx, GROUND_Y + 30, 7, 110, 0xffffff)
    // checkered flag
    const g = this.add.graphics()
    const bw = 12
    const cols = 4
    const rows = 8
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle((r + c) % 2 ? 0x111111 : 0xffffff, 1)
        g.fillRect(fx + c * bw - 24, GROUND_Y - 206 + r * bw, bw, bw)
      }
    }
    // FINISH label
    this.add
      .text(fx, GROUND_Y - 214, 'FINISH', {
        fontFamily: 'Arial',
        fontSize: '22px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5, 1)
  }

  // ---------- HUD ----------
  buildHUD() {
    this.timeText = this.add
      .text(DESIGN_W / 2, 26, '0.00', {
        fontFamily: 'monospace',
        fontSize: '46px',
        fontStyle: '900',
        color: '#ffd23f',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(50)

    this.distText = this.add
      .text(28, 34, '0 m', {
        fontFamily: 'Arial',
        fontSize: '20px',
        fontStyle: '700',
        color: '#e8ecf4',
      })
      .setScrollFactor(0)
      .setDepth(50)

    this.add
      .text(28, 58, '/ 100 m', {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#8a93a8',
      })
      .setScrollFactor(0)
      .setDepth(50)

    // speed bar
    this.add
      .rectangle(DESIGN_W - 28, 36, 226, 20, 0xffffff, 0.1)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(50)
    this.speedBar = this.add
      .rectangle(DESIGN_W - 28, 36, 0, 20, 0xffd23f)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(51)
    this.add
      .text(DESIGN_W - 28, 60, 'SPEED', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#8a93a8',
        fontStyle: '700',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(50)
  }

  updateHUD() {
    if (!this.athlete) return
    this.timeText.setText(this.elapsed ? this.elapsed.toFixed(2) : '0.00')
    const m = Math.max(0, Math.min(TRACK_M, Math.floor((this.athlete.x - START_X) / PX_PER_M)))
    this.distText.setText(m + ' m')
    this.speedBar.width = 226 * (this.athlete.speed / MAX_SPEED)
  }

  // ---------- controls ----------
  buildControls() {
    const padY = DESIGN_H - 20
    const padSize = 240

    const leftPad = this.add
      .image(20 + padSize / 2, padY - padSize / 2, 'pad')
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
    const rightPad = this.add
      .image(DESIGN_W - 20 - padSize / 2, padY - padSize / 2, 'pad')
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(leftPad.x, leftPad.y, 'L', {
        fontFamily: 'Arial',
        fontSize: '64px',
        fontStyle: '900',
        color: 'rgba(255,255,255,0.5)',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
    this.add
      .text(rightPad.x, rightPad.y, 'R', {
        fontFamily: 'Arial',
        fontSize: '64px',
        fontStyle: '900',
        color: 'rgba(255,255,255,0.5)',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)

    const press = (pad, foot) => {
      resumeAudio()
      pad.setScale(0.92)
      this.onTap(foot)
    }
    const release = (pad) => pad.setScale(1)

    leftPad.on('pointerdown', () => press(leftPad, 'L'))
    leftPad.on('pointerup', () => release(leftPad))
    leftPad.on('pointerout', () => release(leftPad))
    rightPad.on('pointerdown', () => press(rightPad, 'R'))
    rightPad.on('pointerup', () => release(rightPad))
    rightPad.on('pointerout', () => release(rightPad))

    // keyboard (desktop testing)
    const kb = this.input.keyboard
    if (kb) {
      kb.on('keydown-A', () => this.onTap('L'))
      kb.on('keydown-D', () => this.onTap('R'))
      kb.on('keydown-LEFT', () => this.onTap('L'))
      kb.on('keydown-RIGHT', () => this.onTap('R'))
    }

    this.leftPad = leftPad
    this.rightPad = rightPad
  }

  // ---------- countdown ----------
  buildCountdown() {
    this.countdownText = this.add
      .text(DESIGN_W / 2, DESIGN_H * 0.4, '', {
        fontFamily: 'Arial',
        fontSize: '86px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setVisible(false)
  }

  showCountdown(msg, color = '#ffffff') {
    this.countdownText.setText(msg)
    this.countdownText.setColor(color)
    this.countdownText.setScale(1.45)
    this.countdownText.setVisible(true)
    this.tweens.add({
      targets: this.countdownText,
      scale: 1,
      duration: 240,
      ease: 'Back.easeOut',
    })
  }

  addTimer(ms, fn) {
    const t = this.time.delayedCall(ms, fn)
    this.timers.push(t)
    return t
  }

  clearTimers() {
    this.timers.forEach((t) => t.remove())
    this.timers = []
  }

  // ---------- avatar load + race start ----------
  loadAvatarThenStart() {
    let jersey = { color: '#e63946', alt: '#9d1b2a' }
    try {
      const j = store.getJersey()
      if (j) jersey = JSON.parse(j)
    } catch (e) {
      /* defaults */
    }
    this.jersey = jersey

    const build = () => {
      this.athlete = new Athlete(this, START_X, GROUND_Y, 'head', jersey)
      this.athlete.setPose('marks')
      // place camera so the athlete sits at the left third
      this.cameras.main.scrollX = 0
      this.startCountdown()
    }

    const headUrl = store.getHead()
    if (this.textures.exists('head') || !headUrl) {
      build()
      return
    }
    const img = new Image()
    img.onload = () => {
      if (this.textures.exists('head')) this.textures.remove('head')
      this.textures.addImage('head', img)
      build()
    }
    img.onerror = () => build()
    img.src = headUrl
  }

  startCountdown() {
    this.clearTimers()
    this.raceActive = false
    this.lastFoot = null
    if (this.athlete) {
      this.athlete.speed = 0
      this.athlete.x = START_X
      this.athlete.setPose('marks')
    }

    this.showCountdown('ON YOUR MARKS')
    beep(520)
    this.addTimer(1200, () => {
      this.showCountdown('SET')
      beep(660)
      this.addTimer(900, () => this.gun())
    })
  }

  gun() {
    this.showCountdown('BANG!', '#e63946')
    resumeAudio()
    bang()
    this.raceActive = true
    this.startTime = this.time.now
    if (this.athlete) this.athlete.setPose('run')
    this.addTimer(550, () => this.countdownText.setVisible(false))
  }

  falseStart() {
    this.clearTimers()
    this.raceActive = false
    this.lastFoot = null
    if (this.athlete) this.athlete.speed = 0
    this.showCountdown('FALSE START!', '#e63946')
    stumbleSnd()
    this.addTimer(1500, () => this.startCountdown())
  }

  // ---------- tap handling ----------
  onTap(foot) {
    if (!this.athlete) return
    if (this.finished) return

    if (!this.raceActive) {
      // tapped before the gun
      this.falseStart()
      return
    }
    if (this.athlete.stumbleLock > 0) return

    if (this.lastFoot === null) {
      this.lastFoot = foot
      this.athlete.applyStride()
      tick()
      return
    }
    if (foot !== this.lastFoot) {
      // correct alternation
      this.lastFoot = foot
      this.athlete.applyStride()
      tick()
    } else {
      // same foot twice -> stumble
      this.athlete.applyStumble()
      this.lastFoot = foot
      stumbleSnd()
    }
  }

  // ---------- finish ----------
  finish() {
    this.finished = true
    this.raceActive = false
    this.finalTime = this.elapsed
    this.athlete.speed = 0
    this.athlete.setPose('idle')
    this.cameras.main.flash(380, 255, 255, 255)
    this.addTimer(720, () => {
      const cb = this.game.registry.get('onFinish')
      if (cb) cb(this.finalTime)
    })
  }

  // ---------- frame ----------
  update(time, delta) {
    if (!this.athlete) return
    const dt = Math.min(delta, 50) / 1000

    if (this.raceActive && !this.finished) {
      this.athlete.speed -= FRICTION * dt
      if (this.athlete.speed < 0) this.athlete.speed = 0
      if (this.athlete.speed > MAX_SPEED) this.athlete.speed = MAX_SPEED
      this.athlete.x += this.athlete.speed * dt
      this.elapsed = (time - this.startTime) / 1000

      if (this.athlete.x >= FINISH_X) {
        this.athlete.x = FINISH_X
        this.finish()
      }
    }

    this.athlete.updateAnim(dt)

    // pin athlete on screen, scroll the world
    let scroll = this.athlete.x - ATHLETE_SCREEN_X
    const maxScroll = FINISH_X + 220 - DESIGN_W
    scroll = Phaser.Math.Clamp(scroll, 0, maxScroll)
    this.cameras.main.scrollX = scroll

    // shadow follows
    this.shadow.x = this.athlete.x

    // parallax crowd
    if (this.crowd) this.crowd.tilePositionX = this.cameras.main.scrollX * 0.85

    this.updateHUD()
  }
}
