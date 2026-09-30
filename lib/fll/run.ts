/**
 * One FLL run (robot leaves the launch area, does missions, returns) turned
 * into a DSL program plus the route to draw on the field.
 */

import type { Port, Program, RobotProfile } from '../dsl/types'
import { segmentHitsPolygon, zonePolygon } from './geometry'
import { NEEDS_ATTACHMENT, PathBuilder, actionSteps, approachPoint, missionHeading } from './path'
import { type Point, type Pose, type Season, localize } from './season'

export interface PlannedMission {
  id: string
  /** Attachment port chosen for this mission (if its action needs one). */
  attachment?: Port
}

export interface PlannedRun {
  name: string
  launchAreaId: string
  missions: PlannedMission[]
  explanation: string
}

export interface FllPlan {
  summary: string
  runs: PlannedRun[]
  tips: string[]
}

export type RunWarning =
  | { kind: 'no_attachment'; missionId: string }
  | { kind: 'unknown_mission'; missionId: string }
  | { kind: 'unknown_launch_area'; launchAreaId: string }
  | { kind: 'forbidden_zone'; zoneId: string }

export interface BuiltRun {
  program: Program
  /** Start pose of the robot's center. */
  start: Pose
  trace: Point[]
  points: number
  warnings: RunWarning[]
}

/** Speed for FLL runs: slower driving is more repeatable. */
const RUN_SPEED = 40

/** Start pose when the season has no launch areas yet: bottom-left corner, facing right. */
const FALLBACK_START: Pose = { x: 150, y: 150, headingDeg: 0 }

export function buildRun(season: Season, run: PlannedRun, robot: RobotProfile, lang: 'ru' | 'kk' | 'en'): BuiltRun {
  const warnings: RunWarning[] = []
  const area = season.launchAreas.find((a) => a.id === run.launchAreaId) ?? season.launchAreas[0]
  if (area?.id !== run.launchAreaId) warnings.push({ kind: 'unknown_launch_area', launchAreaId: run.launchAreaId })
  const start = area?.start ?? FALLBACK_START

  const path = new PathBuilder(start)
  path.add({ op: 'set_speed', speed: RUN_SPEED })
  let points = 0
  const names: string[] = []

  for (const planned of run.missions) {
    const mission = season.missions.find((m) => m.id === planned.id)
    if (!mission) {
      warnings.push({ kind: 'unknown_mission', missionId: planned.id })
      continue
    }
    const attachment = planned.attachment ?? robot.attachments[0]?.port ?? null
    if (NEEDS_ATTACHMENT.has(mission.action) && !attachment) warnings.push({ kind: 'no_attachment', missionId: mission.id })

    for (const via of mission.plan.via) path.goTo(via)
    path.goTo(approachPoint(mission))
    path.turnTo(missionHeading(mission))
    actionSteps(path, mission, NEEDS_ATTACHMENT.has(mission.action) ? attachment : null)
    points += mission.points
    names.push(`${mission.id} ${localize(mission.name, lang)}`)
  }

  // Back home: drive into the launch area and signal the end of the run.
  path.goTo(start)
  path.add({ op: 'beep', note: 72, seconds: 0.2 })

  // The route of the robot's center must not cross forbidden zones.
  for (const zone of season.forbiddenZones) {
    const poly = zonePolygon(zone)
    if (path.trace.some((p, i) => i > 0 && segmentHitsPolygon(path.trace[i - 1], p, poly))) warnings.push({ kind: 'forbidden_zone', zoneId: zone.id })
  }

  return {
    program: { title: run.name.slice(0, 60) || 'FLL', description: names.join(' → ').slice(0, 400), steps: path.steps },
    start,
    trace: path.trace,
    points,
    warnings,
  }
}
