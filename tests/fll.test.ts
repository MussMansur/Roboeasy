import { describe, expect, it } from 'vitest'

import { buildProject } from '../lib/dsl/compile-blocks'
import { programToPython, checkPython } from '../lib/dsl/compile-python'
import { parseProgram } from '../lib/dsl/schema'
import { DEFAULT_ROBOT, type RobotProfile, type Step } from '../lib/dsl/types'
import { CALIBRATION, applyCalibration, distanceTestProgram, turnTestProgram } from '../lib/fll/calibration'
import { PathBuilder, approachPoint, headingTo, normalizeDeg } from '../lib/fll/path'
import { fallbackPlan, parsePlan, planJsonSchema } from '../lib/fll/plan'
import { buildRun } from '../lib/fll/run'
import { type Season, parseSeason } from '../lib/fll/season'
import { SEASONS } from '../lib/fll/seasons'
import { expectLinked, spriteBlocks, validateSb3 } from './helpers'

const season: Season = parseSeason({
  id: 'test',
  name: { ru: 'Тест', en: 'Test' },
  field: { widthMm: 2000, heightMm: 1000 },
  launchAreas: [
    { id: 'left', name: { ru: 'Л', en: 'L' }, x: 0, y: 0, width: 300, height: 300, start: { x: 100, y: 100, headingDeg: 0 } },
    { id: 'right', name: { ru: 'П', en: 'R' }, x: 1700, y: 0, width: 300, height: 300, start: { x: 1900, y: 100, headingDeg: 180 } },
  ],
  missions: [
    { id: 'A', name: { ru: 'А', en: 'A' }, x: 600, y: 100, headingDeg: 0, points: 20, action: 'push', approachMm: 100, actionMm: 50 },
    { id: 'B', name: { ru: 'Б', en: 'B' }, x: 500, y: 700, headingDeg: 90, points: 30, action: 'lift', approachMm: 100 },
    { id: 'C', name: { ru: 'В', en: 'C' }, x: 1500, y: 500, headingDeg: 0, points: 10, action: 'deliver', approachMm: 100, actionMm: 40 },
  ],
})

const armRobot: RobotProfile = { ...DEFAULT_ROBOT, attachments: [{ port: 'C', kind: 'lift', name: 'Arm' }] }

describe('geometry', () => {
  it('normalizes angles and computes headings', () => {
    expect(normalizeDeg(270)).toBe(-90)
    expect(normalizeDeg(-180)).toBe(180)
    expect(normalizeDeg(540)).toBe(180)
    expect(headingTo({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe(90)
    expect(approachPoint(season.missions[1])).toEqual({ x: 500, y: 600 })
  })

  it('turns the short way and tracks the pose with rounded commands', () => {
    const path = new PathBuilder({ x: 0, y: 0, headingDeg: 0 })
    path.goTo({ x: 0, y: 500 })
    path.goTo({ x: 300, y: 500 })
    path.turnTo(180)
    expect(path.steps).toEqual<Step[]>([
      { op: 'turn', direction: 'left', degrees: 90 },
      { op: 'move', direction: 'forward', value: 50, unit: 'cm' },
      { op: 'turn', direction: 'right', degrees: 90 },
      { op: 'move', direction: 'forward', value: 30, unit: 'cm' },
      { op: 'turn', direction: 'left', degrees: 180 },
    ])
    expect(path.pose.x).toBeCloseTo(300)
    expect(path.pose.y).toBeCloseTo(500)
    expect(path.trace).toHaveLength(3)
  })

  it('skips tiny moves and turns', () => {
    const path = new PathBuilder({ x: 10, y: 10, headingDeg: 45 })
    path.goTo({ x: 12, y: 11 })
    path.turnTo(45.3)
    expect(path.steps).toEqual([])
  })
})

describe('buildRun', () => {
  it('drives to each approach point, faces the model, does the action and returns home', () => {
    const run = buildRun(season, { name: 'Run 1', launchAreaId: 'left', missions: [{ id: 'A' }, { id: 'B', attachment: 'C' }], explanation: '' }, armRobot, 'en')
    expect(run.points).toBe(50)
    expect(run.warnings).toEqual([])
    expect(run.program.description).toBe('A A → B B')
    const ops = run.program.steps.map((s) => s.op)
    expect(ops[0]).toBe('set_speed')
    expect(ops.at(-1)).toBe('beep')
    // Mission A is straight ahead: drive 40 cm to the approach point, push 5 cm and back.
    expect(run.program.steps.slice(1, 4)).toEqual([
      { op: 'move', direction: 'forward', value: 40, unit: 'cm' },
      { op: 'move', direction: 'forward', value: 5, unit: 'cm' },
      { op: 'move', direction: 'back', value: 5, unit: 'cm' },
    ])
    expect(run.program.steps).toContainEqual({ op: 'motor_run', port: 'C', direction: 'clockwise', value: 90, unit: 'degrees' })
    // Turns are whole degrees, so each leg ends within ~1% of its length; errors do not accumulate.
    const last = run.trace.at(-1)!
    expect(Math.hypot(last.x - 100, last.y - 100)).toBeLessThan(10)
  })

  it('compiles runs into valid blocks and Python', async () => {
    const run = buildRun(season, { name: 'Run', launchAreaId: 'right', missions: [{ id: 'C' }, { id: 'B' }], explanation: '' }, armRobot, 'ru')
    const project = buildProject(run.program, armRobot)
    await validateSb3(project)
    expectLinked(spriteBlocks(project))
    expect(checkPython(programToPython(run.program, armRobot))).toEqual([])
  })

  it('warns about missing attachments and unknown ids', () => {
    const run = buildRun(season, { name: 'x', launchAreaId: 'moon', missions: [{ id: 'B' }, { id: 'Z' }], explanation: '' }, DEFAULT_ROBOT, 'ru')
    expect(run.warnings).toEqual([
      { kind: 'unknown_launch_area', launchAreaId: 'moon' },
      { kind: 'no_attachment', missionId: 'B' },
      { kind: 'unknown_mission', missionId: 'Z' },
    ])
  })
})

describe('calibration', () => {
  it('test programs are valid DSL', () => {
    expect(parseProgram(distanceTestProgram('d')).ok).toBe(true)
    expect(parseProgram(turnTestProgram('t')).ok).toBe(true)
  })

  it('corrects factors from measured results and compounds with previous calibration', () => {
    const once = applyCalibration(DEFAULT_ROBOT, { distanceCm: 48, turnDeg: 375 })
    expect(once.distanceFactor).toBe(1.042)
    expect(once.turnFactor).toBe(0.96)
    expect(applyCalibration(once, { distanceCm: CALIBRATION.distanceCm }).distanceFactor).toBe(1.042)
    expect(applyCalibration(DEFAULT_ROBOT, { distanceCm: 5 }).distanceFactor).toBe(2)
  })
})

describe('plan', () => {
  const ids = ['A', 'B', 'C']

  it('accepts a complete plan and rejects duplicates, missing and unknown missions', () => {
    const run = (missions: string[], area = 'left') => ({ name: 'R', launchAreaId: area, missions: missions.map((id) => ({ id })), explanation: 'e' })
    expect(parsePlan({ summary: 's', runs: [run(['A', 'B']), run(['C'], 'right')], tips: [] }, season, ids).ok).toBe(true)
    const errorOf = (raw: unknown) => {
      const r = parsePlan(raw, season, ids)
      return r.ok ? '' : r.error
    }
    expect(errorOf({ summary: 's', runs: [run(['A', 'A', 'B', 'C'])], tips: [] })).toMatch(/more than once: A/)
    expect(errorOf({ summary: 's', runs: [run(['A'])], tips: [] })).toMatch(/not planned: B, C/)
    expect(errorOf({ summary: 's', runs: [run(['A', 'B', 'X'])], tips: [] })).toMatch(/id/)
    expect(errorOf({ summary: 's', runs: [run(['A', 'B', 'C'], 'moon')], tips: [] })).toMatch(/launchAreaId/)
  })

  it('offers the real ids as enums to the AI', () => {
    const schema = JSON.stringify(planJsonSchema(season, ids))
    expect(schema).toContain('"enum":["left","right"]')
    expect(schema).toContain('"enum":["A","B","C"]')
  })

  it('fallback plans every mission once from the nearest launch area', () => {
    const plan = fallbackPlan(season, ids, armRobot, 'ru')
    expect(parsePlan(plan, season, ids).ok).toBe(true)
    const areaOf = Object.fromEntries(plan.runs.flatMap((r) => r.missions.map((m) => [m.id, r.launchAreaId])))
    expect(areaOf).toEqual({ A: 'left', B: 'left', C: 'right' })
    expect(plan.runs.flatMap((r) => r.missions).find((m) => m.id === 'B')?.attachment).toBe('C')
  })
})

describe('season data', () => {
  it('the template season parses and every example mission is marked TODO', () => {
    const template = SEASONS.template
    expect(template.field).toEqual({ widthMm: 2362, heightMm: 1143 })
    expect(template.missions.length).toBeGreaterThanOrEqual(2)
    expect(template.missions.every((m) => m.todo)).toBe(true)
  })

  it('rejects duplicate mission ids', () => {
    const dup = { ...season, missions: [season.missions[0], season.missions[0]] }
    expect(() => parseSeason(dup)).toThrow(/duplicate mission id A/)
  })
})
