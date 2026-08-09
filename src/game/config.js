// World-space constants for the sprint.
// The track lives in fixed world coordinates; the VIEWPORT adapts to the
// real screen size (Scale.RESIZE), so there are no fixed "design screen" dims.

export const WORLD_GROUND_Y = 560
export const TRACK_M = 100
export const PX_PER_M = 50
export const TRACK_PX = TRACK_M * PX_PER_M

export const START_X = 360
export const FINISH_X = START_X + TRACK_PX

export const MAX_SPEED = 640
export const STRIDE_IMPULSE = 120
export const FRICTION = 180

// Hurdles event
export const HURDLE_METERS = [18, 32, 46, 60, 74, 88] // hurdle positions along the 100m
export const JUMP_DUR = 0.62 // seconds airborne
export const JUMP_HEIGHT = 175 // px peak
