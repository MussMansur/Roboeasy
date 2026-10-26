import { describe, expect, it } from 'vitest'

import type { Step } from '../lib/dsl/types'
import { parseField } from '../lib/sim/field'
import { DEFAULT_MOVE_SPEED, MAX_SPEED_MM_S, displayAt, poseAt, simulate, stepAt } from '../lib/sim/interpreter'

const open = parseField({ width: 1500, height: 1000, start: { x: 300, y: 300, heading: 0 } })

describe('simulator: driving', () => {
  it('drives the exact distance at the default speed', () => {
    const r = simulate([{ op: 'move', direction: 'forward', value: 30, unit: 'cm' }], open)
    expect(r.final.x).toBeCloseTo(600, 0)
    expect(r.final.y).toBeCloseTo(300, 0)
    // 300 mm at 50 % of the top speed
    expect(r.final.t).toBeCloseTo(300 / ((DEFAULT_MOVE_SPEED / 100) * MAX_SPEED_MM_S), 1)
    expect(r.collisions).toBe(0)
    expect(r.timedOut).toBe(false)
  })

  it('converts rotations with the wheel circumference', () => {
    const r = simulate([{ op: 'move', direction: 'back', value: 1, unit: 'rotations' }], open)
    expect(300 - r.final.x).toBeCloseTo(Math.PI * 56, 0)
  })

  it('turns by the gyro angle in both directions', () => {
    expect(simulate([{ op: 'turn', direction: 'left', degrees: 90 }], open).final.heading).toBeCloseTo(90, 1)
    expect(simulate([{ op: 'turn', direction: 'right', degrees: 45 }], open).final.heading).toBeCloseTo(-45, 1)
  })

  it('comes back to the start after a square', () => {
    const square: Step[] = [{ op: 'repeat', times: 4, steps: [{ op: 'move', direction: 'forward', value: 30, unit: 'cm' }, { op: 'turn', direction: 'left', degrees: 90 }] }]
    const r = simulate(square, open)
    expect(r.final.x).toBeCloseTo(300, 0)
    expect(r.final.y).toBeCloseTo(300, 0)
    expect(r.distanceTravelled).toBeGreaterThan(1199)
  })

  it('steers along an arc', () => {
    const r = simulate([{ op: 'steer', steering: 30, value: 20, unit: 'cm' }], open)
    expect(r.final.heading).toBeLessThan(-10)
    expect(r.final.y).toBeLessThan(300)
  })
})

describe('simulator: walls and sensors', () => {
  const walled = parseField({ width: 1500, height: 1000, start: { x: 300, y: 500, heading: 0 }, walls: [{ x: 900, y: 300, w: 40, h: 400 }] })

  it('stops at a wall, counts one collision and gives up after a stall', () => {
    const r = simulate([{ op: 'move', direction: 'forward', value: 100, unit: 'cm' }], walled)
    expect(r.collisions).toBe(1)
    expect(r.final.x).toBeLessThan(900 - 85 + 1)
    expect(r.timedOut).toBe(false)
    expect(r.events.some((e) => e.kind === 'bump')).toBe(true)
  })

  it('stops 10 cm before the wall with the distance sensor', () => {
    const r = simulate(
      [
        { op: 'start_move', direction: 'forward' },
        { op: 'wait_until', condition: { sensor: 'distance', port: 'C', comparator: '<', value: 10, unit: 'cm' } },
        { op: 'stop_move' },
      ],
      walled,
    )
    const gap = 900 - (r.final.x + 85)
    expect(gap).toBeGreaterThan(90)
    expect(gap).toBeLessThan(105)
    expect(r.collisions).toBe(0)
    expect(r.sensorsUsed).toContain('distance')
    expect(r.events.some((e) => e.kind === 'sensor' && e.sensor === 'distance')).toBe(true)
  })

  it('stops on a black line with the colour sensor', () => {
    const lined = parseField({ width: 1500, height: 1000, start: { x: 300, y: 500, heading: 0 }, lines: [{ points: [[800, 200], [800, 800]], width: 20 }] })
    const r = simulate(
      [
        { op: 'start_move', direction: 'forward' },
        { op: 'wait_until', condition: { sensor: 'color', port: 'D', color: 'black' } },
        { op: 'stop_move' },
      ],
      lined,
    )
    // The sensor (70 mm ahead of the axle) is on the line.
    expect(Math.abs(r.final.x + 70 - 800)).toBeLessThanOrEqual(12)
  })

  it('reads the force sensor when the bumper touches a wall', () => {
    const r = simulate(
      [
        { op: 'start_move', direction: 'forward' },
        { op: 'wait_until', condition: { sensor: 'force', port: 'E', state: 'pressed' } },
        { op: 'stop_move' },
        { op: 'move', direction: 'back', value: 10, unit: 'cm' },
      ],
      walled,
    )
    expect(r.timedOut).toBe(false)
    expect(r.final.x).toBeLessThan(900 - 85 - 90)
  })
})

describe('simulator: hub and motors', () => {
  it('turns a single motor by degrees and records display and sound', () => {
    const r = simulate(
      [
        { op: 'motor_run', port: 'C', direction: 'clockwise', value: 1, unit: 'rotations' },
        { op: 'show_image', image: 'heart' },
        { op: 'beep', note: 60, seconds: 0.5 },
      ],
      open,
    )
    expect(r.motorAngles.C).toBeCloseTo(360, 5)
    expect(r.events.filter((e) => e.kind === 'beep')).toHaveLength(1)
    expect(displayAt(r.events, r.final.t).pixels).toBe('0909099999999990999000900')
    // The robot did not move.
    expect(r.final.x).toBe(300)
  })

  it('waits for the given time and holds still while waiting', () => {
    const r = simulate([{ op: 'move', direction: 'forward', value: 10, unit: 'cm' }, { op: 'wait', seconds: 2 }, { op: 'move', direction: 'forward', value: 10, unit: 'cm' }], open)
    const pause = r.events.find((e) => e.kind === 'wait')!
    expect(poseAt(r.trace, pause.t + 1).x).toBeCloseTo(400, 0)
    expect(r.final.t).toBeGreaterThan(2.7)
    expect(stepAt(r.events, pause.t + 1)).toBe('1')
  })

  it('stops "forever" programs at the time limit', () => {
    const r = simulate([{ op: 'forever', steps: [{ op: 'show_image', image: 'smile' }] }], open, { maxTime: 2 })
    expect(r.timedOut).toBe(true)
  })

  it('is deterministic, also with noise for a given seed', () => {
    const prog: Step[] = [{ op: 'move', direction: 'forward', value: 50, unit: 'cm' }]
    expect(simulate(prog, open).final).toEqual(simulate(prog, open).final)
    const a = simulate(prog, open, { noise: 1, seed: 7 }).final.x
    expect(simulate(prog, open, { noise: 1, seed: 7 }).final.x).toBe(a)
    expect(simulate(prog, open, { noise: 1, seed: 8 }).final.x).not.toBe(a)
  })
})
