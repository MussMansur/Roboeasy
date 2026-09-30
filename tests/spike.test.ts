import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import JSZip from 'jszip'

import { DEFAULT_ROBOT, type Program, type Step, toMatrixText } from '../lib/dsl/types'
import { PROGRAM_JSON_SCHEMA, PYTHON_JSON_SCHEMA, parseProgram, parseRobot } from '../lib/dsl/schema'
import { buildProject, type ScratchBlock } from '../lib/dsl/compile-blocks'
import { checkPython, cleanPython, programToPython } from '../lib/dsl/compile-python'
import { SPIKE_PROJECT_VERSION, createLlsp3 } from '../lib/spike/llsp3'

const EVERY_OP: Step['op'][] = [
  'move', 'turn', 'steer', 'start_move', 'start_steer', 'stop_move', 'set_speed', 'motor_run', 'motor_start', 'motor_stop',
  'motor_speed', 'show_image', 'write', 'clear_display', 'beep', 'button_light', 'wait', 'wait_until', 'repeat', 'forever',
  'repeat_until', 'if',
]

const require = createRequire(import.meta.url)
// The same validator the SPIKE App runs on scratch.sb3 when a project is opened.
const scratchParser: (input: Buffer | string, isSprite: boolean, cb: (err: unknown, res: unknown) => void) => void = require('scratch-parser')

const sample = {
  title: 'Obstacle patrol',
  description: 'Drives until something is close, then turns.',
  steps: [
    { op: 'set_speed', speed: 60 },
    { op: 'move', direction: 'forward', value: 20, unit: 'cm' },
    { op: 'turn', direction: 'right', degrees: 90 },
    { op: 'repeat', times: 3, steps: [{ op: 'motor_run', port: 'F', direction: 'counterclockwise', value: 1, unit: 'rotations' }] },
    { op: 'write', text: 'Привет' },
    { op: 'button_light', color: 'green' },
    {
      op: 'forever',
      steps: [
        { op: 'start_move', direction: 'forward' },
        { op: 'wait_until', condition: { sensor: 'distance', comparator: '<', value: 10, unit: 'cm' } },
        { op: 'stop_move' },
        { op: 'beep', note: 72, seconds: 0.2 },
        {
          op: 'if',
          condition: { sensor: 'color', color: 'red' },
          then: [{ op: 'show_image', image: 'sad', seconds: 1 }],
          else: [{ op: 'turn', direction: 'left', degrees: 45 }],
        },
      ],
    },
  ],
}

function validateSb3(project: unknown): Promise<void> {
  return new Promise((resolve, reject) =>
    scratchParser(JSON.stringify(project), false, (err) => (err ? reject(new Error(JSON.stringify(err).slice(0, 2000))) : resolve())),
  )
}

/** Every reference between blocks must point at an existing block with a matching parent. */
function assertLinked(blocks: Record<string, ScratchBlock>) {
  for (const [id, b] of Object.entries(blocks)) {
    if (b.next) {
      assert.ok(blocks[b.next], `next of ${b.opcode} exists`)
      assert.equal(blocks[b.next].parent, id, `${blocks[b.next].opcode} parent points back to ${b.opcode}`)
    }
    if (b.parent) assert.ok(blocks[b.parent], `parent of ${b.opcode} exists`)
    for (const [name, input] of Object.entries(b.inputs)) {
      const ref = input[1]
      if (typeof ref === 'string') {
        assert.ok(blocks[ref], `${b.opcode}.${name} references an existing block`)
        assert.equal(blocks[ref].parent, id, `${blocks[ref].opcode} is a child of ${b.opcode}`)
      }
    }
    if (b.shadow) {
      const [field] = Object.keys(b.fields)
      assert.equal(field, `field_${b.opcode}`, 'SPIKE custom fields are named field_<opcode>')
    }
  }
  const tops = Object.values(blocks).filter((b) => b.topLevel)
  assert.equal(tops.length, 1)
  assert.equal(tops[0].opcode, 'flipperevents_whenProgramStarts')
}

/** Parses a program that must be valid and returns it. */
function valid(raw: unknown, robot = DEFAULT_ROBOT): Program {
  const r = parseProgram(raw, robot)
  if (!r.ok) assert.fail(r.error)
  return r.value
}

function invalid(raw: unknown): string {
  const r = parseProgram(raw)
  assert.equal(r.ok, false, 'expected a validation error')
  return r.ok ? '' : r.error
}

describe('parseProgram', () => {
  it('keeps valid steps and fills sensor ports from the robot config', () => {
    const p = valid(sample)
    assert.equal(p.steps.length, 7)
    const forever = p.steps[6]
    assert.equal(forever.op, 'forever')
    if (forever.op !== 'forever') return
    assert.deepEqual(forever.steps[1], { op: 'wait_until', condition: { sensor: 'distance', port: 'C', comparator: '<', value: 10, unit: 'cm' } })
    const custom = valid(sample, { ...DEFAULT_ROBOT, distanceSensor: 'F' }).steps[6]
    assert.ok(
      custom.op === 'forever' &&
        custom.steps[1].op === 'wait_until' &&
        custom.steps[1].condition.sensor === 'distance' &&
        custom.steps[1].condition.port === 'F',
    )
  })

  it('clamps numbers into safe ranges instead of failing', () => {
    const p = valid({
      title: '  x  ',
      description: '',
      steps: [
        { op: 'move', direction: 'back', value: 99999, unit: 'cm' },
        { op: 'move', direction: 'forward', value: 99999, unit: 'seconds' },
        { op: 'set_speed', speed: 250 },
        { op: 'motor_run', port: 'C', direction: 'clockwise', value: -3, unit: 'rotations' },
        { op: 'beep', note: 10, seconds: 0.01234 },
      ],
    })
    assert.deepEqual(p.steps, [
      { op: 'move', direction: 'back', value: 500, unit: 'cm' },
      { op: 'move', direction: 'forward', value: 60, unit: 'seconds' },
      { op: 'set_speed', speed: 100 },
      { op: 'motor_run', port: 'C', direction: 'clockwise', value: 0.05, unit: 'rotations' },
      { op: 'beep', note: 36, seconds: 0.05 },
    ])
    assert.equal(p.title, 'x')
  })

  it('rejects wrong structure with a readable error for the retry prompt', () => {
    const one = (step: unknown) => invalid({ title: 't', description: '', steps: [step] })
    assert.match(one({ op: 'launch_rocket' }), /steps\[0\]\.op/)
    assert.match(one({ op: 'move', direction: 'backward', value: 1, unit: 'cm' }), /"forward"\|"back"/)
    assert.match(one({ op: 'set_speed', speed: '50' }), /speed/)
    assert.match(one({ op: 'wait_until', condition: { sensor: 'lidar' } }), /condition/)
    assert.match(one({ op: 'show_image', image: 'Arrow Up' }), /image/)
    assert.match(invalid({ title: 't', description: '', steps: [] }), /at least one step/)
    invalid({ steps: [{ op: 'stop_move' }] })
  })

  it('limits nesting depth and total size', () => {
    let deep: unknown = { op: 'beep', note: 60, seconds: 0.1 }
    for (let i = 0; i < 3; i++) deep = { op: 'forever', steps: [deep] }
    valid({ title: 't', description: '', steps: [deep] })
    invalid({ title: 't', description: '', steps: [{ op: 'forever', steps: [deep] }] })
    const many = Array.from({ length: 61 }, () => ({ op: 'stop_move' }))
    assert.match(invalid({ title: 't', description: '', steps: many }), /too many steps/)
  })

  it('drops steps after "forever" (a cap block in Scratch)', () => {
    const p = valid({ title: 't', description: '', steps: [{ op: 'forever', steps: [{ op: 'stop_move' }] }, { op: 'stop_move' }] })
    assert.deepEqual(
      p.steps.map((s) => s.op),
      ['forever'],
    )
  })

  it('transliterates display text for the 5x5 matrix', () => {
    assert.equal(toMatrixText('\u041f\u0440\u0438\u0432\u0435\u0442, \u049a\u0430\u0437\u0430\u049b\u0441\u0442\u0430\u043d!'), 'Privet, Qazaqstan!')
    assert.equal(toMatrixText('Hi \u{1F916}'), 'Hi')
    assert.match(invalid({ title: 't', description: '', steps: [{ op: 'write', text: '\u{1F916}' }] }), /Latin/)
  })

  it('parses robot config leniently', () => {
    assert.deepEqual(parseRobot({ leftMotor: 'e', rightMotor: 'F', wheelDiameter: 999, trackWidth: 'x' }), {
      ...DEFAULT_ROBOT,
      leftMotor: 'E',
      rightMotor: 'F',
      wheelDiameter: 20,
    })
    assert.deepEqual(parseRobot('junk'), DEFAULT_ROBOT)
  })
})

describe('Gemini response schemas', () => {
  it('list every step op and stay compact', () => {
    const step = (PROGRAM_JSON_SCHEMA.$defs as Record<string, { properties: { op: { enum: string[] } } }>).Step
    assert.deepEqual([...step.properties.op.enum].sort(), [...EVERY_OP].sort())
    assert.ok(JSON.stringify(PROGRAM_JSON_SCHEMA).length < 4000)
    assert.deepEqual(PYTHON_JSON_SCHEMA.required, ['title', 'description', 'code'])
  })
})

describe('buildProject (SPIKE word blocks)', () => {
  const program = valid(sample)
  const project = buildProject(program, DEFAULT_ROBOT)
  const sprite = project.targets[1] as { blocks: Record<string, ScratchBlock>; sounds: unknown[] }

  it('passes the Scratch 3 schema validation used by the SPIKE App', async () => {
    await validateSb3(project)
  })

  it('links every block correctly', () => {
    assertLinked(sprite.blocks)
  })

  it('uses real SPIKE opcodes, menu values and extensions', () => {
    const blocks = Object.values(sprite.blocks)
    const byOp = (op: string) => blocks.filter((b) => b.opcode === op)
    const field = (op: string) => {
      const b = byOp(op)[0]
      return b.fields[`field_${op}`][0]
    }
    assert.equal(field('flippermove_movement-port-selector'), 'AB')
    assert.equal(field('flippermove_custom-icon-direction'), 'forward')
    assert.deepEqual(byOp('flippermove_steer').map((b) => (b.inputs.VALUE[1] as [number, string])[1]), ['180', '90'])
    assert.deepEqual(byOp('flippersensors_isDistance')[0].fields, { COMPARATOR: ['<', null], UNIT: ['cm', null] })
    assert.equal(field('flippersensors_color-selector'), '9')
    assert.equal(field('flipperlight_matrix-5x5-brightness-image'), '9909999099000000999090009')
    assert.equal(field('flippersound_custom-piano'), '72')
    assert.equal(field('flipperlight_color-selector-vertical'), '6')
    assert.equal(byOp('control_if_else').length, 1)
    assert.deepEqual(byOp('control_repeat')[0].inputs.TIMES, [1, [6, '3']])
    assert.deepEqual(byOp('flipperlight_lightDisplayText')[0].inputs.TEXT, [1, [10, 'Privet']])
    assert.deepEqual(project.extensions, ['flipperevents', 'flipperlight', 'flippermotor', 'flippermove', 'flippersensors', 'flippersound'])
    assert.deepEqual(sprite.sounds, [], 'no sound assets are referenced')
  })

  it('adds a wheel-size block only for non-standard wheels', () => {
    const hasDistance = (robot = DEFAULT_ROBOT) =>
      Object.values((buildProject(program, robot).targets[1] as { blocks: Record<string, ScratchBlock> }).blocks).some((b) => b.opcode === 'flippermove_setDistance')
    assert.equal(hasDistance(), false)
    assert.equal(hasDistance({ ...DEFAULT_ROBOT, wheelDiameter: 8.8 }), true)
  })

  it('validates an empty program and a program without movement', async () => {
    await validateSb3(buildProject({ title: 'e', description: '', steps: [] }))
    const noDrive = buildProject(valid({ title: 'w', description: '', steps: [{ op: 'write', text: 'Hi' }] }))
    await validateSb3(noDrive)
    const ops = Object.values((noDrive.targets[1] as { blocks: Record<string, ScratchBlock> }).blocks).map((b) => b.opcode)
    assert.ok(!ops.includes('flippermove_setMovementPair'))
  })
})

describe('createLlsp3', () => {
  it('packs word blocks like the SPIKE App does', async () => {
    const blob = await createLlsp3('Моя программа', { format: 'blocks', program: valid(sample) })
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    assert.deepEqual(Object.keys(zip.files).sort(), ['icon.svg', 'manifest.json', 'scratch.sb3'])
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    assert.equal(manifest.type, 'word-blocks')
    assert.equal(manifest.version, SPIKE_PROJECT_VERSION)
    assert.equal(manifest.name, 'Моя программа')
    assert.equal(manifest.id.length, 12)
    assert.deepEqual(manifest.hardware, {})
    const sb3 = await JSZip.loadAsync(await zip.file('scratch.sb3')!.async('uint8array'))
    assert.deepEqual(Object.keys(sb3.files).sort(), ['d41d8cd98f00b204e9800998ecf8427e.svg', 'project.json'])
    await validateSb3(JSON.parse(await sb3.file('project.json')!.async('string')))
  })

  it('packs Python with projectbody.json', async () => {
    const code = 'import runloop\n\nasync def main():\n    pass\n\nrunloop.run(main())\n'
    const blob = await createLlsp3('py', { format: 'python', code })
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    assert.deepEqual(Object.keys(zip.files).sort(), ['icon.svg', 'manifest.json', 'projectbody.json'])
    assert.deepEqual(JSON.parse(await zip.file('projectbody.json')!.async('string')), { main: code })
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    assert.equal(manifest.type, 'python')
    assert.deepEqual(manifest.hardware, { python: { type: 'flipper' } })
  })
})

describe('Python', () => {
  it('translates block programs to valid-looking SPIKE 3 Python', () => {
    const code = programToPython(valid(sample))
    assert.deepEqual(checkPython(code), [])
    assert.match(code, /motor_pair\.pair\(motor_pair\.PAIR_1, port\.A, port\.B\)/)
    assert.match(code, /await motor_pair\.move_for_degrees\(motor_pair\.PAIR_1, 411, 0, velocity=speed\)/)
    assert.match(code, /await runloop\.until\(lambda: distance_cm\(port\.C\) < 10\)/)
    assert.match(code, /color_sensor\.color\(port\.D\) == color\.RED/)
    assert.match(code, /await sound\.beep\(523, 200, 100\)/)
    assert.match(code, /await motor\.run_for_degrees\(port\.F, 360, -motor_speed\['F'\]\)/)
    assert.match(code, /while True:\n(?:.*\n)*? {8}await runloop\.sleep_ms\(10\)\n\n\nrunloop/)
    assert.match(code, /runloop\.run\(main\(\)\)\n$/)
  })

  it('flags SPIKE 2 code and cleans Markdown fences', () => {
    assert.deepEqual(checkPython(cleanPython('```python\nfrom spike import PrimeHub\nhub = PrimeHub()\n```')).length > 0, true)
    assert.equal(cleanPython('```py\nprint(1)\r\n```'), 'print(1)\n')
    assert.ok(checkPython('import runloop\nasync def main():\n    x = (1\nrunloop.run(main())').includes('has unbalanced brackets'))
  })
})
