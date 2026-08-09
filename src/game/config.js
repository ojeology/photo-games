// World-space constants for the sprint.
// The track lives in fixed world coordinates; the VIEWPORT adapts to the
// real screen size (Scale.RESIZE), so there are no fixed "design screen" dims.

export const WORLD_GROUND_Y = 560 // y of the track surface in world space
export const TRACK_M = 100
export const PX_PER_M = 50
export const TRACK_PX = TRACK_M * PX_PER_M // 5000px

export const START_X = 360 // athlete's world start x (= start line)
export const FINISH_X = START_X + TRACK_PX

// Sprint physics — tuned so each tap produces VISIBLE movement.
//   At ~6 taps/sec you accelerate briskly and reach top speed in ~1.5s.
//   At ~3 taps/sec you cruise at a moderate speed. Below ~1.5 taps/sec you slow.
export const MAX_SPEED = 640 // px/s top speed (~12.8 m/s)
export const STRIDE_IMPULSE = 120 // px/s added per good stride (was 46 — too low)
export const FRICTION = 180 // px/s^2 natural slow-down (was 235)
