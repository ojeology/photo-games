import Phaser from 'phaser'
import { Athlete } from './Athlete.js'
import { store } from '../lib/store.js'
import { bang, beep, tick, stumbleSnd, resumeAudio } from '../lib/audio.js'
import {
  WORLD_GROUND_Y,
  TRACK_M,
  PX_PER_M,
  START_X,
  FINISH_X,
  MAX_SPEED,
  FRICTION,
} from './config.js'

// Ground line sits at this fraction of the screen height (top = sky/stands,
// bottom = track). 0.80 leaves room for the run-up below the athlete.
const GROUND_FRAC = 0.8
const WORLD_W = FINISH_X + 220 // total scrollable world width

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
    this.staticObjs = []
    this.kbDone = false

    this.makeTextures()

    // real viewport
    const gs = this.scale.gameSize
    this.W = gs.width
    this.H = gs.height

    // world-space layer (built once; tall enough for any screen height)
    this.buildTrack()
    this.buildFinishLine()

    // shadow (world-space, follows athlete)
    this.shadow = this.add
      .ellipse(START_X, WORLD_GROUND_Y + 4, 84, 18, 0x000000, 0.28)
      .setDepth(2)

    // screen-space layer (rebuilt on resize)
    this.buildStatic()
    this.buildCountdown()
    this.addKeyboard()

    this.scale.on('resize', this.handleResize, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.handleResize, this))
    this.events.once('destroy', () => this.scale.off('resize', this.handleResize, this))

    this.loadAvatarThenStart()
  }

  // ---------- derived layout values ----------
  layoutValues() {
    this.groundScreenY = Math.round(this.H * GROUND_FRAC)
    this.athleteScreenX = Phaser.Math.Clamp(Math.round(this.W * 0.3), 240, 420)
    this.scrollY = WORLD_GROUND_Y - this.groundScreenY
    this.f = Phaser.Math.Clamp(this.H / 720, 0.62, 1.3) // font/UI scale
  }

  // ---------- textures ----------
  makeTextures() {
    if (!this.textures.exists('crowd')) this.makeCrowdTexture()
    if (!this.textures.exists('pad')) this.makePadTexture()
    if (!this.textures.exists('foot')) this.makeFootTexture()
  }

  makeCrowdTexture() {
    const w = 256,
      h = 96
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

  // A stylized footprint (sole + toes), pointing up. Flipped horizontally
  // for the right pad. Replaces the old fixed "L"/"R" letters for a cleaner,
  // Playman-style control feel.
  makeFootTexture() {
    const s = 200
    const c = document.createElement('canvas')
    c.width = s
    c.height = s
    const ctx = c.getContext('2d')
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    // sole (main pad) — lower 60% of the icon
    ctx.beginPath()
    ctx.ellipse(s * 0.5, s * 0.66, s * 0.26, s * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    // toes — five circles across the top
    const toes = [
      { x: 0.32, y: 0.3, r: 0.075 },
      { x: 0.43, y: 0.24, r: 0.07 },
      { x: 0.54, y: 0.22, r: 0.072 },
      { x: 0.65, y: 0.25, r: 0.066 },
      { x: 0.74, y: 0.32, r: 0.058 },
    ]
    toes.forEach((t) => {
      ctx.beginPath()
      ctx.arc(s * t.x, s * t.y, s * t.r, 0, Math.PI * 2)
      ctx.fill()
    })
    this.textures.addCanvas('foot', c)
  }

  // ---------- world-space track (built once) ----------
  buildTrack() {
    const g = this.add.graphics().setDepth(1)
    const top = WORLD_GROUND_Y
    const bottom = WORLD_GROUND_Y + 520 // tall enough for any screen

    g.fillStyle(0x9c3d2e, 1)
    g.fillRect(0, top, WORLD_W, bottom - top)
    g.fillStyle(0x6e2a1f, 1)
    g.fillRect(0, bottom - 40, WORLD_W, 40)

    g.lineStyle(2, 0xb5523f, 0.5)
    for (let y = top + 22; y < bottom - 30; y += 28) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(WORLD_W, y)
      g.strokePath()
    }

    g.lineStyle(3, 0xffffff, 0.45)
    g.beginPath()
    g.moveTo(0, top)
    g.lineTo(WORLD_W, top)
    g.strokePath()

    g.lineStyle(5, 0xffffff, 0.85)
    g.beginPath()
    g.moveTo(START_X, top)
    g.lineTo(START_X, top + 70)
    g.strokePath()

    for (let m = 20; m < TRACK_M; m += 20) {
      const x = START_X + m * PX_PER_M
      g.lineStyle(2, 0xffffff, 0.22)
      g.beginPath()
      g.moveTo(x, top)
      g.lineTo(x, top + 60)
      g.strokePath()
      this.add
        .text(x, top - 6, m + 'm', {
          fontFamily: 'Arial',
          fontSize: '17px',
          fontStyle: '700',
          color: 'rgba(255,255,255,0.45)',
        })
        .setOrigin(0.5, 1)
        .setDepth(1)
    }
  }

  buildFinishLine() {
    const fx = FINISH_X
    const g = this.add.graphics().setDepth(1)
    this.add.rectangle(fx, WORLD_GROUND_Y + 30, 7, 110, 0xffffff).setDepth(1)
    const bw = 12,
      cols = 4,
      rows = 8
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle((r + c) % 2 ? 0x111111 : 0xffffff, 1)
        g.fillRect(fx + c * bw - 24, WORLD_GROUND_Y - 206 + r * bw, bw, bw)
      }
    }
    this.add
      .text(fx, WORLD_GROUND_Y - 214, 'FINISH', {
        fontFamily: 'Arial',
        fontSize: '22px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5, 1)
      .setDepth(1)
  }

  // ---------- screen-space static layer (rebuilt on resize) ----------
  buildStatic() {
    this.layoutValues()
    const W = this.W,
      H = this.H,
      gY = this.groundScreenY,
      f = this.f
    const s = this.staticObjs

    // sky
    const sky = this.add.graphics().setScrollFactor(0).setDepth(0)
    sky.fillGradientStyle(0x0a0e1a, 0x0a0e1a, 0x2a3a63, 0x3f5483, 1)
    sky.fillRect(0, 0, W, gY)
    s.push(sky)

    // stands
    const standsTop = Math.max(0, gY - 140)
    const stands = this.add.graphics().setScrollFactor(0).setDepth(0)
    stands.fillStyle(0x121a30, 1)
    stands.fillRect(0, standsTop, W, gY - standsTop)
    stands.fillStyle(0x0b1224, 1)
    for (let x = 0; x < W + 40; x += 44) stands.fillRect(x, standsTop - 20, 26, 26)
    s.push(stands)

    // crowd (parallax)
    this.crowd = this.add
      .tileSprite(0, gY - 128, W, 104, 'crowd')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(0)
    s.push(this.crowd)

    // floodlight wash
    const glow = this.add.graphics().setScrollFactor(0).setDepth(0)
    glow.fillStyle(0xffffff, 0.035)
    glow.fillRect(0, 0, W, gY)
    s.push(glow)

    // ---- HUD ----
    this.timeText = this.add
      .text(W / 2, H * 0.045, '0.00', {
        fontFamily: 'monospace',
        fontSize: Math.round(46 * f) + 'px',
        fontStyle: '900',
        color: '#ffd23f',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(50)
    s.push(this.timeText)

    this.distText = this.add
      .text(24, H * 0.06, '0 m', {
        fontFamily: 'Arial',
        fontSize: Math.round(20 * f) + 'px',
        fontStyle: '700',
        color: '#e8ecf4',
      })
      .setScrollFactor(0)
      .setDepth(50)
    s.push(this.distText)

    const subDist = this.add
      .text(24, H * 0.06 + Math.round(22 * f), '/ 100 m', {
        fontFamily: 'Arial',
        fontSize: Math.round(13 * f) + 'px',
        color: '#8a93a8',
      })
      .setScrollFactor(0)
      .setDepth(50)
    s.push(subDist)

    // speed bar
    const barW = Phaser.Math.Clamp(Math.round(W * 0.18), 140, 240)
    const barH = Math.round(20 * f)
    const barX = W - 24
    const barY = H * 0.05
    const barBg = this.add
      .rectangle(barX, barY, barW, barH, 0xffffff, 0.1)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(50)
    s.push(barBg)
    this.speedBar = this.add
      .rectangle(barX, barY, 0, barH, 0xffd23f)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(51)
    s.push(this.speedBar)
    this.speedBarMax = barW
    const spdLbl = this.add
      .text(barX, barY + barH + 4, 'SPEED', {
        fontFamily: 'Arial',
        fontSize: Math.round(12 * f) + 'px',
        color: '#8a93a8',
        fontStyle: '700',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(50)
    s.push(spdLbl)

    // ---- control pads ----
    this.buildPads(s, f)
  }

  buildPads(s, f) {
    const W = this.W,
      H = this.H
    const ps = Phaser.Math.Clamp(Math.round(Math.min(W, H) * 0.34), 150, 240)
    const m = 16
    const padY = H - m - ps / 2

    const leftPad = this.add
      .image(m + ps / 2, padY, 'pad')
      .setDisplaySize(ps, ps)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
    const rightPad = this.add
      .image(W - m - ps / 2, padY, 'pad')
      .setDisplaySize(ps, ps)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
    s.push(leftPad, rightPad)

    // footprint icons (no fixed letters) — right one mirrored
    const footSize = ps * 0.62
    const leftFoot = this.add
      .image(leftPad.x, leftPad.y, 'foot')
      .setDisplaySize(footSize, footSize)
      .setScrollFactor(0)
      .setDepth(101)
      .setAlpha(0.5)
    const rightFoot = this.add
      .image(rightPad.x, rightPad.y, 'foot')
      .setDisplaySize(footSize, footSize)
      .setScrollFactor(0)
      .setFlipX(true)
      .setDepth(101)
      .setAlpha(0.5)
    s.push(leftFoot, rightFoot)

    // soft glow halos behind each pad — show which foot is "expected" next
    const glowL = this.add
      .circle(leftPad.x, leftPad.y, ps * 0.56, 0xffd23f, 0)
      .setScrollFactor(0)
      .setDepth(99)
    const glowR = this.add
      .circle(rightPad.x, rightPad.y, ps * 0.56, 0xffd23f, 0)
      .setScrollFactor(0)
      .setDepth(99)
    s.push(glowL, glowR)
    this.glowL = glowL
    this.glowR = glowR

    // gentle breathing pulse to invite tapping (before the gun)
    this.padPulse = this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (this.raceActive) return
        this.tweens.add({ targets: leftFoot, scale: { from: 0.58, to: 0.66 }, duration: 450, yoyo: true })
        this.tweens.add({ targets: rightFoot, scale: { from: 0.58, to: 0.66 }, duration: 450, yoyo: true })
      },
    })

    const press = (pad, foot, footImg, glow) => {
      resumeAudio()
      pad.setScale(0.9)
      pad.setTint(0xffd23f)
      footImg.setAlpha(0.95)
      this.flashRipple(pad.x, pad.y, ps)
      // flash the glow on the pressed foot
      glow.alpha = 0.55
      this.tweens.add({ targets: glow, alpha: 0, duration: 360 })
      this.onTap(foot)
    }
    const release = (pad, footImg) => {
      pad.setScale(1)
      pad.clearTint()
      footImg.setAlpha(0.5)
    }
    leftPad.on('pointerdown', () => press(leftPad, 'L', leftFoot, glowL))
    leftPad.on('pointerup', () => release(leftPad, leftFoot))
    leftPad.on('pointerout', () => release(leftPad, leftFoot))
    rightPad.on('pointerdown', () => press(rightPad, 'R', rightFoot, glowR))
    rightPad.on('pointerup', () => release(rightPad, rightFoot))
    rightPad.on('pointerout', () => release(rightPad, rightFoot))

    this.leftPad = leftPad
    this.rightPad = rightPad
    this.leftFoot = leftFoot
    this.rightFoot = rightFoot

    // live stride indicator (shows your L/R rhythm)
    this.buildStrideIndicator(s, f)
  }

  // Highlight the pad the player should tap next (dynamic guidance, no fixed letters).
  // Called whenever lastFoot changes.
  updateNextFootHint() {
    if (!this.raceActive || !this.glowL) return
    // after a left tap, right is expected (and vice versa); before any tap, both subtle
    const expectR = this.lastFoot === 'L'
    const expectL = this.lastFoot === 'R'
    this.tweens.killTweensOf([this.glowL, this.glowR])
    this.glowL.alpha = expectL ? 0.32 : 0
    this.glowR.alpha = expectR ? 0.32 : 0
  }

  flashRipple(x, y, size) {
    const ring = this.add
      .circle(x, y, size * 0.18, 0xffd23f, 0.5)
      .setScrollFactor(0)
      .setDepth(102)
    this.tweens.add({
      targets: ring,
      radius: size * 0.62,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })
  }

  // small row of dots showing the last few strides (L gold / R cyan)
  buildStrideIndicator(s, f) {
    const W = this.W,
      H = this.H
    const cy = H - 20 - Math.round(Math.min(W, H) * 0.34) - 16
    this.strideDots = []
    const cx = W / 2
    const n = 8
    const gap = Math.round(16 * f)
    const dotR = Math.round(6 * f)
    for (let i = 0; i < n; i++) {
      const d = this.add
        .circle(cx - ((n - 1) * gap) / 2 + i * gap, cy, dotR, 0xffffff, 0.16)
        .setScrollFactor(0)
        .setDepth(60)
      s.push(d)
      this.strideDots.push(d)
    }
    this.strideLog = []
  }

  logStride(foot, good) {
    if (!this.strideDots) return
    this.strideLog.push({ foot, good })
    if (this.strideLog.length > this.strideDots.length) this.strideLog.shift()
    this.strideDots.forEach((d, i) => {
      const entry = this.strideLog[i]
      if (!entry) {
        d.setFillStyle(0xffffff, 0.16)
      } else if (!entry.good) {
        d.setFillStyle(0xe63946, 0.85) // red = stumble
      } else if (entry.foot === 'L') {
        d.setFillStyle(0xffd23f, 0.9) // gold = left
      } else {
        d.setFillStyle(0x00e5ff, 0.9) // cyan = right
      }
    })
  }

  destroyStatic() {
    if (this.staticObjs) {
      this.staticObjs.forEach((o) => o && o.destroy && o.destroy())
      this.staticObjs = []
    }
    if (this.hintText) {
      this.hintText.destroy()
      this.hintText = null
    }
  }

  addKeyboard() {
    if (this.kbDone) return
    this.kbDone = true
    const kb = this.input.keyboard
    if (!kb) return
    kb.on('keydown-A', () => this.onTap('L'))
    kb.on('keydown-D', () => this.onTap('R'))
    kb.on('keydown-LEFT', () => this.onTap('L'))
    kb.on('keydown-RIGHT', () => this.onTap('R'))
  }

  buildCountdown() {
    this.countdownText = this.add
      .text(this.W / 2, this.H * 0.4, '', {
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

  repositionCountdown() {
    if (this.countdownText) this.countdownText.setPosition(this.W / 2, this.H * 0.4)
  }

  handleResize(gameSize) {
    this.W = gameSize.width
    this.H = gameSize.height
    this.destroyStatic()
    this.buildStatic()
    this.repositionCountdown()
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

  // ---------- avatar + start ----------
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
      this.athlete = new Athlete(this, START_X, WORLD_GROUND_Y, 'head', jersey)
      this.athlete.setPose('marks')
      this.cameras.main.scrollX = 0
      this.cameras.main.scrollY = this.scrollY
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
    this.tapCount = 0
    if (this.hintText) {
      this.hintText.destroy()
      this.hintText = null
    }
    // reset stride dots
    if (this.strideDots) this.strideDots.forEach((d) => d.setFillStyle(0xffffff, 0.16))
    this.strideLog = []
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
    this.tapCount = 0
    this.strideLog = []
    if (this.athlete) this.athlete.setPose('run')
    // brighten foot icons now the race is live
    if (this.leftFoot) this.leftFoot.setAlpha(0.7)
    if (this.rightFoot) this.rightFoot.setAlpha(0.7)
    this.addTimer(550, () => this.countdownText.setVisible(false))
    this.addTimer(450, () => this.showHint('ALTERNATE  THE  PADS  TO  SPRINT'))
  }

  // "how to move" hint, shown right after the gun
  showHint(msg) {
    if (this.hintText) this.hintText.destroy()
    const f = this.f || 1
    this.hintText = this.add
      .text(this.W / 2, this.H * 0.56, msg, {
        fontFamily: 'Arial',
        fontSize: Math.round(34 * f) + 'px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(140)
      .setAlpha(0)
    this.tweens.add({
      targets: this.hintText,
      alpha: 0.95,
      duration: 220,
    })
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

  onTap(foot) {
    if (!this.athlete || this.finished) return
    if (!this.raceActive) {
      this.falseStart()
      return
    }
    if (this.athlete.stumbleLock > 0) return

    // hide the "how to move" hint after the first few taps
    this.tapCount = (this.tapCount || 0) + 1
    if (this.tapCount === 4 && this.hintText) {
      this.tweens.add({ targets: this.hintText, alpha: 0, duration: 400 })
    }

    if (this.lastFoot === null) {
      this.lastFoot = foot
      this.athlete.applyStride()
      tick()
      this.logStride(foot, true)
      this.updateNextFootHint()
      return
    }
    if (foot !== this.lastFoot) {
      this.lastFoot = foot
      this.athlete.applyStride()
      tick()
      this.logStride(foot, true)
      this.updateNextFootHint()
    } else {
      this.athlete.applyStumble()
      this.lastFoot = foot
      stumbleSnd()
      this.logStride(foot, false)
      this.updateNextFootHint()
    }
  }

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
    const maxScroll = Math.max(0, WORLD_W - this.W)
    let scroll = Phaser.Math.Clamp(this.athlete.x - this.athleteScreenX, 0, maxScroll)
    this.cameras.main.scrollX = scroll
    this.cameras.main.scrollY = this.scrollY

    this.shadow.x = this.athlete.x
    if (this.crowd) this.crowd.tilePositionX = scroll * 0.85

    this.updateHUD()
  }

  updateHUD() {
    if (!this.timeText) return
    this.timeText.setText(this.elapsed ? this.elapsed.toFixed(2) : '0.00')
    const m = Math.max(0, Math.min(TRACK_M, Math.floor((this.athlete.x - START_X) / PX_PER_M)))
    this.distText.setText(m + ' m')
    this.speedBar.width = this.speedBarMax * (this.athlete.speed / MAX_SPEED)
  }
}
