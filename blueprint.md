# 🏅 PHOTO GAMES — Product Blueprint (v1)

> A photo-avatar summer-games where your face is the athlete and your friend group is your "country."
> Mobile-web-first · Landscape-locked · Live + async multiplayer · Sharp broadcast-sports tone.

---

## 1. VISION & POSITIONING

**One line:** Race your friends — with your real face on the athlete — in slick track-and-field events. Share the podium, roast the loser.

**Target audience:** High-schoolers (14–18). They move in packs, live in group chats, are vain + competitive, and play in short sessions (lunch, bus, between classes).

**Why this wins for them:**
- The team they *already have* (their group chat / clique) *is* the game.
- A "join my Meet" link in the group chat = instant play, no download.
- Seeing your own face lose to your buddy's face = screenshots, roasting, free marketing.

**Genre gap:** Track-and-field / mini-Olympics is quiet right now on web/mobile. The photo-avatar twist makes it personal and shareable — not a clone.

**Monetization:** Free in v1. Plan (don't build) for cosmetics + squad customization + season pass later. Build the avatar system so gear can layer on without a rewrite.

---

## 2. CORE GAME LOOP

```
1. HOST creates a "Meet" → gets a share link → drops it in the group chat
2. Friends tap the link, join, upload their face → becomes their athlete
3. COACH SCREEN: host assigns each friend to events / sets the race order
        ↓
4. LIVE FINALS — everyone races at once, real-time, 4–8 faces on screen
   • tap-rhythm controls, positions sync live across devices
   • photo-finish replay auto-generated at the line
        ↓
5. PODIUM — gold/silver/bronze faces + shareable poster → one tap to group chat
        ↓
6. Anyone who missed it? Run ASYNC → posts a time → becomes a GHOST
   → that ghost haunts everyone else's future live races (translucent face in a lane)
        ↓
(loop back: next Meet, rivalries get personal, school leaderboards later)
```

**The bridge mechanic — why "both" modes isn't double the work:**
Async times become **ghosts**. One event = one race simulation, populated by live humans, ghosts, or a mix. Async literally matters because your solo runs haunt your friends' live races. No separate "async engine."

---

## 3. SCREENS / UX FLOW

All screens **landscape-locked**, mobile-web-first (big tap targets, thumb-reach controls at the two bottom corners).

1. **Landing / Home** — bold broadcast intro. "Create a Meet" or "Join via link."
2. **Onboarding — Avatar upload** → crop tool (zoom / rotate / position the oval on your face) → preview on a sleek athlete silhouette → "Looks good."
3. **Lobby** — all joined faces shown in lanes. Host assigns events, players ready up. Share link prominent. Report button on any avatar.
4. **Coach / Event select** — host picks the event for this race (or a sequence).
5. **Race screen** — the event. Lanes, all faces visible, your lane highlighted, HUD + thumb controls. Stadium atmosphere.
6. **Photo-finish replay** — slow-mo line cross, faces in order.
7. **Results / Podium** — gold/silver/bronze faces, shareable poster, "Next race" / "Replay."
8. **Leaderboard** (light v1) — this Meet's standings. School leaderboards = later.
9. **Profile** — your avatar, your per-event stats, your gear (gear = later).

---

## 4. v1 EVENT SPECS (3 events, polished)

Tone: sharp, broadcast-sports, real physics-feel — *not* goofy meme-cartoon.

### Event 1 — 100m Sprint 🏃 (the flagship)
- **Controls:** Rhythm-tap. A pulsing "sweet zone" meter; tap in the zone for max acceleration. Tap too fast = stumble (lose speed); too slow = underperform. Two thumb buttons (alternate L/R for the running feel).
- **Skill:** Sustaining optimal cadence, not just spamming.
- **Drama:** False start — tap before the gun = penalty. Great live-callout moment.
- **Face comedy:** Mid-sprint faces grimacing; slo-mo photo-finish frozen at the line.

### Event 2 — Hurdles 🚧
- **Controls:** Same sprint rhythm-tap **+ a jump button**. Time the jump to clear each hurdle. Miss = crash, lose speed, face eats dirt (brief stumble recovery).
- **Skill:** The hurdle spacing sets the rhythm; jump timing overlays the sprint cadence.
- **Face comedy:** The crash = the "ate dirt" face-cam. Clean landings = focused face.

### Event 3 — Javelin Throw 🦑 (precision event, not all button-mash)
- **Controls:** Two-phase. (1) **Run-up** — short rhythm-tap to build approach speed. (2) **Release** — a power/angle timing meter; hit the release button in the optimal zone.
- **Result:** Javelin flies in an arc; slo-mo replay of the throw + landing. Distance = score.
- **Face comedy:** Wind-up → release face; the spin-whip moment.
- *(Swap option: Long Jump — same run-up + hold-to-angle release. Javelin chosen because it's visually more distinct from the two running events and has a stronger slo-mo replay.)*

**Photo-finish + podium** at the end of every event.

---

## 5. THE AVATAR PIPELINE (the make-or-break piece — build first to de-risk)

This is the single riskiest component. If the face-to-athlete step looks janky, the whole "sharp" tone collapses. **Build and validate it before anything else.**

**v1 approach — reliable over clever:**
1. **Upload** a selfie (camera or file).
2. **Manual crop tool** — an oval frame the user drags / pinches to zoom / rotates over their face. Live preview on the athlete body as they adjust. *No AI dependency in v1* = nothing to break.
3. **Placement** — cropped face dropped onto a clean, sleek athlete silhouette with a subtle outline ring (the "sharp" look). A slight color match / vignette so the face doesn't look pasted.
4. **Default to a circle/oval crop** (cleanest, most forgiving). Background removal = later enhancement, not v1.

**Design for later (don't break it now):**
- Build the avatar as a **layered sprite**: base silhouette → face layer → *accessory layers* (headband, shades, face paint, team colors). This is the only "monetization tax" in v1 — it costs almost nothing now and saves a rewrite later.
- Store the crop params (zoom/rotate/position) so the face can be re-rendered at any size.

**Auto-detection later:** Add a face-detection "suggested crop" as a convenience once the manual flow is solid. Not v1.

---

## 6. MULTIPLAYER ARCHITECTURE

### Live finals (the headline)
- **Transport:** WebSockets via a tiny Node server (Socket.IO or plain `ws`).
- **Model:** Each client runs its athlete's simulation locally (player inputs → their progress). Each client reports its current position to the server at a fixed tick (~20 Hz). Server broadcasts all positions to all clients. Clients render other faces at interpolated positions.
- **Start sync:** Ready-check, then server sends a synchronized start timestamp; all clients countdown 3-2-1 together. Small latency variance is fine for a casual party game.
- **Winner:** First to cross the line. v1 trusts clients (it's friends in a lobby, low stakes) with basic sanity checks (progress can't exceed physical max). Anti-cheat hardening = later.

### Async heats + ghosts
- **Async** = run solo, submit final time + a compact ghost file (a series of position/time samples, ~every 100ms). Trivial — just a REST POST.
- **Ghost in a live race:** at race start, fetch the relevant ghosts; replay their samples locally, rendered as translucent faces in their lanes. No extra netcode.
- **One simulation, three populations:** live humans / ghosts / a mix. This reuse is why "both" modes is affordable.

### Rooms / lobbies
- Host creates a Meet → unique room code + share link. Link carries the room code; tapping it joins straight into the lobby.
- 4–8 players per Meet.

---

## 7. TECH STACK

| Layer | Pick | Why |
|---|---|---|
| **Game client** | **Phaser 3** | Most popular 2D web game framework; handles rendering, sprites, scenes, audio, input. Fast to ship. Mature docs. |
| **UI overlays** | DOM/HTML over the Phaser canvas | Menus, lobby, profile — easier as HTML/CSS than in-canvas. Phaser handles the race itself. |
| **Realtime server** | **Node.js + Socket.IO** | Rooms, broadcast, start-sync. Tiny server, cheap to host. |
| **Backend API** | Node.js (Express) | REST: create meet, submit async time, fetch leaderboards/ghosts, store avatars. |
| **Database + auth + storage** | **Supabase** | Postgres + auth + file storage + realtime subscriptions in one, generous free tier. Stores users, avatars, scores, ghosts, meets. |
| **Hosting — web client** | Vercel / Netlify | Static deploy of the Phaser app. |
| **Hosting — realtime + API** | Render / Railway / Fly.io | Cheap Node host for the socket server + REST. |

**Why this stack:** every piece is mainstream, well-documented, and has a free/cheap tier. Nothing exotic. A single competent dev can move fast on it.

---

## 8. LANDSCAPE ORIENTATION

The game **forces landscape** — a track is horizontal and the hook is seeing all friends' faces across the lanes.

- **Primary:** Screen Orientation API — `screen.orientation.lock('landscape')` on entering a race (Chrome Android supports this under fullscreen; requires a user gesture to enter fullscreen first).
- **Fallback (iOS Safari + unsupported):** detect portrait, show a clean **"rotate your device"** overlay (rotated-phone icon). Encourage, don't hard-block lobby/social screens.
- **Layout:** game canvas designed at a 16:9 landscape aspect; letterbox on ultrawide. Controls at the two bottom corners for thumb reach in landscape. All UI designed landscape-first.

---

## 9. GROWTH LOOPS

1. **Share-link lobby** — host drops a "join my Meet" link in the group chat; friends tap and play in-browser, zero install. This is the core viral mechanic.
2. **Shareable podium poster** — win gold → one tap → a poster of your face on the podium (flag, event, time/stats) goes to the group chat → FOMO → next Meet grows.
3. **Photo-finish clip** — the slo-mo line-cross is a built-in share asset.
4. **Ghost revenge** — "you got beat by [friend]'s ghost" notification drives re-engagement.

---

## 10. SAFETY / CONSENT (light, but present from v1)

Audience is mostly 14–18 (largely outside the strictest kid-privacy zones), but **they're uploading photos of faces**, so:

- **Consent tap** on upload: "I confirm this is my photo / I have permission to use it" + link to short terms. Cheap, matters.
- **Report button** on any avatar (lobby, results, profile): one tap → flags the photo, hides it pending review.
- **Remove path:** admin can pull a flagged photo/avatar. Simple moderation queue.
- Not in v1, planned: auto face-verification / inappropriate-image screening.

---

## 11. MONETIZATION RUNWAY (plan, don't build — just don't break)

- **Face gear** — headbands, shades, face paint, "country" colors, gold-medal auras. *(Avatar layered-sprite supports this.)*
- **Squad customization** — team flags, logos, jersey colors. *(Store a "team" entity now so gear can attach.)*
- **Season pass** — a "Games" pass with unlockable gear through a season. *(Season entity now, pass later.)*
- **Ad-supported free tier** — possible later for the cashless segment.

**The only v1 taxes:** build the avatar as layered sprites, and store team + season entities. Costs almost nothing now, prevents a rewrite later.

---

## 12. v1 BUILD ORDER (milestones)

| # | Milestone | Why this order |
|---|---|---|
| **1** | **Avatar pipeline** — upload + manual crop + place on silhouette (layered sprite) | Riskiest piece. De-risk first. If faces look bad, nothing else matters. |
| **2** | **Single-player 100m Sprint** — simulation + rhythm controls + rendering one athlete | Core game feel. Prove it's fun solo. |
| **3** | **Landscape lock + mobile-web polish** — orientation API, rotate prompt, thumb controls, 16:9 layout | Make it feel like a real phone game, not a desktop demo. |
| **4** | **Multiplayer lobby + live 100m race** — websocket rooms, real-time position sync for 4–8 | The headline feature. The thing people share. |
| **5** | **Photo-finish replay + podium + shareable poster** | The growth loop. Without this, it doesn't spread. |
| **6** | **Async mode + ghost recording/replay** | Completes "both" modes. Low effort after live works. |
| **7** | **Event 2: Hurdles · Event 3: Javelin** | Content expansion on the proven engine. |
| **8** | **Safety/reporting + consent tap** | Ship responsibly. Light but required. |
| **9** | **Season/leaderboard scaffolding** (light) | Sets up retention + future monetization. |

**Definition of done for v1:** a host can create a Meet, friends join via link, upload faces, race live in 3 events, see a photo-finish + podium poster they can share, and missed friends can run async and haunt future races as ghosts. All in a landscape phone browser, no download.

---

## 13. DECISIONS LOG (what we locked)

| Decision | Locked |
|---|---|
| Core idea | Photo-avatar summer games; face = athlete, crew = "country" |
| Audience | High-schoolers (14–18) |
| Multiplayer | Live finals (headline) + async heats that feed ghosts — "both" |
| Events v1 | 100m Sprint · Hurdles · Javelin (Long Jump as swap option) |
| Platform | Mobile-web-first, share-link lobbies (native app later) |
| Orientation | **Landscape-locked** |
| Tone | Sharp broadcast-sports, real faces, slo-mo photo finish |
| Monetization | Free now; cosmetics/squad-gear/season-pass runway planned, not built |
| Avatar | Manual crop (no AI in v1), layered sprite for future gear |
| Tech | Phaser 3 + Node/Socket.IO realtime + Supabase (db/auth/storage) |
