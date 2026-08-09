// World-space constants for the sprint.
// The track lives in fixed world coordinates; the VIEWPORT adapts to the
// real screen size (Scale.RESIZE), so there are no fixed "design screen" dims.

export const WORLD_GROUND_Y = 560 // y of the track surface in world space
export const TRACK_M = 100
export const PX_PER_M = 50
export const TRACK_PX = TRACK_M * PX_PER_M // 5000px

export const START_X = 360 // athlete's world start x (= start line)
export const FINISH_X = START_X + TRACK_PX

export const MAX_SPEED = 640 // px/s top speed (~12.8 m/s)
export const FRICTION = 235 // px/s^2 natural slow-down
