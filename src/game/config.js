// Shared game constants for the sprint.
export const DESIGN_W = 1280
export const DESIGN_H = 720
export const GROUND_Y = 560

export const TRACK_M = 100
export const PX_PER_M = 50
export const TRACK_PX = TRACK_M * PX_PER_M // 5000px

// Athlete starts at the on-screen "left third" so the finish line
// approaches from the right as the world scrolls.
export const START_X = 360
export const FINISH_X = START_X + TRACK_PX

export const ATHLETE_SCREEN_X = 360 // where the athlete is pinned on screen

// Sprint physics (tuned by feel — easy to adjust)
export const MAX_SPEED = 640 // px/s top speed (~12.8 m/s)
export const STRIDE_IMPULSE = 46 // px/s added per good stride
export const FRICTION = 235 // px/s^2 natural slow-down
export const STUMBLE_LOCK_MS = 320 // locked after a stumble
