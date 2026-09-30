/**
 * Field geometry → DSL commands. The AI only decides which missions go in
 * which run and in what order; distances and angles are computed here from
 * the season coordinates. Calibration is applied later by the compilers.
 *
 * Coordinates: mm from the mat's bottom-left corner; heading in degrees,
 * 0 = +x, counterclockwise positive (so "turn left" increases the heading).
 */

import type { Port, Step } from '../dsl/types'
import type { Mission, Point, Pose } from './season'

/** Moves shorter than this are skipped; turns are rounded to whole degrees. */
const MIN_MOVE_MM = 5

/** Angle in (-180, 180]. */
export function normalizeDeg(angle: number): number {
  const a = ((((angle + 180) % 360) + 360) % 360) - 180
  return a === -180 ? 180 : a
}

export function headingTo(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Builds a run step by step while tracking where the robot is. Every update
 * uses the rounded command values, so rounding errors do not accumulate.
 */
export class PathBuilder {
  readonly steps: Step[] = []
  /** Points the robot's center passes through, for drawing the route. */
  readonly trace: Point[]
  private current: Pose

  constructor(start: Pose) {
    this.current = { ...start }
    this.trace = [{ x: start.x, y: start.y }]
  }

  get pose(): Pose {
    return { ...this.current }
  }

  /** Turn in place to face `heading` (shortest direction). */
  turnTo(heading: number) {
    const delta = normalizeDeg(heading - this.current.headingDeg)
    const degrees = Math.round(Math.abs(delta))
    if (degrees < 1) return
    this.steps.push({ op: 'turn', direction: delta > 0 ? 'left' : 'right', degrees })
    this.current.headingDeg = normalizeDeg(this.current.headingDeg + (delta > 0 ? degrees : -degrees))
  }

  /** Drive straight (forward or backward) by `mm`, keeping the heading. */
  drive(mm: number, direction: 'forward' | 'back' = 'forward') {
    const cm = round1(mm / 10)
    if (cm * 10 < MIN_MOVE_MM) return
    this.steps.push({ op: 'move', direction, value: cm, unit: 'cm' })
    const sign = direction === 'forward' ? 1 : -1
    const rad = (this.current.headingDeg * Math.PI) / 180
    this.current.x += Math.cos(rad) * cm * 10 * sign
    this.current.y += Math.sin(rad) * cm * 10 * sign
    this.trace.push({ x: this.current.x, y: this.current.y })
  }

  /** Turn toward `target`, then drive to it. */
  goTo(target: Point) {
    const distance = Math.hypot(target.x - this.current.x, target.y - this.current.y)
    if (distance < MIN_MOVE_MM) return
    this.turnTo(headingTo(this.current, target))
    this.drive(distance)
  }

  add(...steps: Step[]) {
    this.steps.push(...steps)
  }
}

/** Where the robot's center stops before a mission: `approachMm` in front of the model. */
export function approachPoint(mission: Mission): Point {
  const rad = (mission.headingDeg * Math.PI) / 180
  return { x: mission.x - Math.cos(rad) * mission.approachMm, y: mission.y - Math.sin(rad) * mission.approachMm }
}

/** Actions that need an attachment motor. */
export const NEEDS_ATTACHMENT: ReadonlySet<Mission['action']> = new Set(['pull', 'lift', 'deliver', 'collect', 'flip'])

/**
 * Mission action as DSL commands, done while the robot faces the model.
 * "down" = clockwise, "up" = counterclockwise on the attachment motor.
 */
export function actionSteps(path: PathBuilder, mission: Mission, attachment: Port | null) {
  const arm = (dir: 'clockwise' | 'counterclockwise'): Step[] =>
    attachment ? [{ op: 'motor_run', port: attachment, direction: dir, value: mission.attachmentDeg, unit: 'degrees' }] : []
  const down = () => path.add(...arm('clockwise'))
  const up = () => path.add(...arm('counterclockwise'))

  switch (mission.action) {
    case 'push':
      path.drive(mission.actionMm)
      path.drive(mission.actionMm, 'back')
      break
    case 'pull':
      down()
      path.drive(mission.actionMm, 'back')
      up()
      break
    case 'lift':
      down()
      path.add({ op: 'wait', seconds: 0.3 })
      up()
      break
    case 'deliver':
      path.drive(mission.actionMm)
      up()
      path.drive(mission.actionMm, 'back')
      down()
      break
    case 'collect':
      down()
      path.drive(mission.actionMm)
      up()
      path.drive(mission.actionMm, 'back')
      break
    case 'flip':
      down()
      up()
      break
  }
}
