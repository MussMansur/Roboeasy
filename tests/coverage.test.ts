import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'

import { matchLocale } from '../lib/i18n/config'
import { rateLimit } from '../lib/rate-limit'
import { type Step, type StepOp, sanitizeProgram } from '../lib/spike/program'
import { checkPython, programToPython } from '../lib/spike/python'
import { buildProject } from '../lib/spike/scratch'

const require = createRequire(import.meta.url)
const scratchParser: (input: string, isSprite: boolean, cb: (err: unknown) => void) => void = require('scratch-parser')

/** One example of every step type and every condition the AI may use. */
const EVERY_STEP: Step[] = [
  { op: 'set_speed', speed: 30 },
  { op: 'move', direction: 'back', value: 2, unit: 'seconds' },
  { op: 'move', direction: 'forward', value: 3, unit: 'inches' },
  { op: 'turn', direction: 'left', degrees: 180 },
  { op: 'steer', steering: -40, value: 1.5, unit: 'rotations' },
  { op: 'start_move', direction: 'right' },
  { op: 'start_steer', steering: 25 },
  { op: 'stop_move' },
  { op: 'motor_speed', port: 'C', speed: 60 },
  { op: 'motor_run', port: 'C', direction: 'clockwise', value: 1, unit: 'seconds' },
  { op: 'motor_start', port: 'F', direction: 'counterclockwise' },
  { op: 'motor_stop', port: 'F' },
  { op: 'show_image', image: 'heart' },
  { op: 'show_image', image: '9000009000009000009000009', seconds: 1 },
  { op: 'write', text: 'Go!' },
  { op: 'clear_display' },
  { op: 'beep', note: 60, seconds: 0.2 },
  { op: 'button_light', color: 'orange' },
  { op: 'wait', seconds: 0.5 },
  { op: 'wait_until', condition: { sensor: 'force', port: 'E', state: 'hardpressed' } },
  { op: 'repeat_until', condition: { sensor: 'button', button: 'right', state: 'pressed' }, steps: [{ op: 'beep', note: 72, seconds: 0.1 }] },
  {
    op: 'if',
    condition: { sensor: 'reflection', port: 'D', comparator: '>', value: 60 },
    then: [{ op: 'start_steer', steering: 30 }],
    else: [{ op: 'start_steer', steering: -30 }],
  },
  { op: 'if', condition: { sensor: 'distance', port: 'C', comparator: '=', value: 50, unit: '%' }, then: [] },
  { op: 'repeat', times: 2, steps: [{ op: 'wait_until', condition: { sensor: 'color', port: 'D', color: 'none' } }] },
  { op: 'forever', steps: [{ op: 'wait_until', condition: { sensor: 'force', port: 'E', state: 'released' } }] },
]

const ALL_OPS: StepOp[] = [
  'move', 'turn', 'steer', 'start_move', 'start_steer', 'stop_move', 'set_speed', 'motor_run', 'motor_start', 'motor_stop',
  'motor_speed', 'show_image', 'write', 'clear_display', 'beep', 'button_light', 'wait', 'wait_until', 'repeat', 'forever',
  'repeat_until', 'if',
]

describe('every step type', () => {
  const program = sanitizeProgram({ title: 'All', steps: EVERY_STEP })

  it('survives sanitizing unchanged', () => {
    assert.deepEqual(program.steps, EVERY_STEP)
    assert.deepEqual([...new Set(EVERY_STEP.map((s) => s.op))].sort(), [...ALL_OPS].sort())
  })

  it('builds schema-valid SPIKE blocks', async () => {
    await new Promise<void>((resolve, reject) =>
      scratchParser(JSON.stringify(buildProject(program)), false, (err) => (err ? reject(new Error(JSON.stringify(err).slice(0, 1500))) : resolve())),
    )
  })

  it('translates to Python without issues', () => {
    const code = programToPython(program)
    assert.deepEqual(checkPython(code), [])
    for (const snippet of [
      'await motor_pair.move_for_time(motor_pair.PAIR_1, 2000, 0, velocity=-speed)',
      'motor_pair.move(motor_pair.PAIR_1, 100, velocity=speed)',
      'motor_pair.move(motor_pair.PAIR_1, 25, velocity=speed)',
      "await motor.run_for_time(port.C, 1000, motor_speed['C'])",
      "motor.run(port.F, -motor_speed['F'])",
      'await light_matrix.write("Go!")',
      'light.color(light.POWER, color.ORANGE)',
      'await runloop.until(lambda: force_sensor.force(port.E) > 80)',
      'while not (button.pressed(button.RIGHT) > 0):',
      'if color_sensor.reflection(port.D) > 60:',
      'if distance_percent(port.C) == 50:',
      'await runloop.until(lambda: color_sensor.color(port.D) == color.UNKNOWN)',
      'await runloop.until(lambda: not force_sensor.pressed(port.E))',
    ]) {
      assert.ok(code.includes(snippet), `missing: ${snippet}`)
    }
    // Empty branches still produce valid Python.
    assert.match(code, /if distance_percent\(port\.C\) == 50:\n {8}pass/)
  })
})

describe('rateLimit', () => {
  it('allows bursts up to the limit, then asks to wait', () => {
    const key = `test-${Math.random()}`
    for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, 3, 60_000, 1_000 + i).ok, true)
    const blocked = rateLimit(key, 3, 60_000, 2_000)
    assert.equal(blocked.ok, false)
    assert.equal(blocked.retryAfterSeconds, 59)
    assert.equal(rateLimit(key, 3, 60_000, 61_001).ok, true)
  })
})

describe('matchLocale', () => {
  it('picks the best supported language', () => {
    assert.equal(matchLocale('kk-KZ,ru;q=0.9'), 'kk')
    assert.equal(matchLocale('en-US,en;q=0.9,ru;q=0.8'), 'en')
    assert.equal(matchLocale('de-DE,ru;q=0.5'), 'ru')
    assert.equal(matchLocale('fr'), 'ru')
    assert.equal(matchLocale(null), 'ru')
  })
})
