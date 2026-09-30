/**
 * Calibration wizard math. The robot runs two test programs (compiled with
 * the current profile); the team measures what really happened and the
 * factors are corrected so the next programs hit the target.
 */

import type { Program, RobotProfile } from '../dsl/types'

export const CALIBRATION = { distanceCm: 50, turnDeg: 360 } as const

export function distanceTestProgram(title: string): Program {
  return {
    title,
    description: `${CALIBRATION.distanceCm} cm`,
    steps: [
      { op: 'set_speed', speed: 40 },
      { op: 'move', direction: 'forward', value: CALIBRATION.distanceCm, unit: 'cm' },
      { op: 'beep', note: 72, seconds: 0.2 },
    ],
  }
}

export function turnTestProgram(title: string): Program {
  return {
    title,
    description: `${CALIBRATION.turnDeg}°`,
    steps: [
      { op: 'set_speed', speed: 40 },
      { op: 'turn', direction: 'right', degrees: CALIBRATION.turnDeg },
      { op: 'beep', note: 72, seconds: 0.2 },
    ],
  }
}

const round3 = (n: number) => Math.round(n * 1000) / 1000
const clampFactor = (n: number) => Math.min(2, Math.max(0.5, round3(n)))

/**
 * New factors from measured results. If the robot drove 48 cm when asked
 * for 50, it must be asked for a bit more next time: factor × 50 / 48.
 */
export function applyCalibration(robot: RobotProfile, measured: { distanceCm?: number; turnDeg?: number }): RobotProfile {
  const next = { ...robot }
  if (measured.distanceCm && measured.distanceCm > 0) next.distanceFactor = clampFactor((robot.distanceFactor * CALIBRATION.distanceCm) / measured.distanceCm)
  if (measured.turnDeg && measured.turnDeg > 0) next.turnFactor = clampFactor((robot.turnFactor * CALIBRATION.turnDeg) / measured.turnDeg)
  return next
}
