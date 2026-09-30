/**
 * Builds the Scratch 3 `project.json` that the LEGO SPIKE App 3 stores inside
 * `scratch.sb3` for word-block projects.
 *
 * Opcodes, input/field names, shadow blocks and menu values follow the
 * SPIKE App 3 block definitions (`flippermove_*`, `flippermotor_*`, …) and
 * the layout of projects saved by the app itself. Custom SPIKE fields are
 * always a shadow block `<extension>_<field-type>` holding a single field
 * `field_<that opcode>`.
 */

import {
  type Condition,
  type Program,
  type RobotConfig,
  type Step,
  DEFAULT_ROBOT,
  LIGHT_COLORS,
  MOVEMENT_OPS,
  SENSOR_COLORS,
  SPIKE_DEFAULT_CM_PER_ROTATION,
  effectiveCmPerRotation,
  imagePixels,
  spinTurnDegrees,
  usesOp,
} from './program'

/** The asset SPIKE writes for its empty costume/backdrop (md5 of an empty file). */
export const EMPTY_SVG_ASSET = 'd41d8cd98f00b204e9800998ecf8427e'

type Primitive = [number, string]
type Input = [1, string | Primitive] | [2, string] | [3, string, Primitive]

export interface ScratchBlock {
  opcode: string
  next: string | null
  parent: string | null
  inputs: Record<string, Input>
  fields: Record<string, [string, null]>
  shadow: boolean
  topLevel: boolean
  x?: number
  y?: number
}

export interface ScratchProject {
  targets: Record<string, unknown>[]
  monitors: unknown[]
  extensions: string[]
  meta: { semver: string; vm: string; agent: string }
}

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function randomId(length = 20): string {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  let id = ''
  for (const b of bytes) id += ID_CHARS[b % ID_CHARS.length]
  return id
}

/** Scratch stores numbers as strings; keep them short and without float noise. */
export function numStr(n: number): string {
  return String(Math.round(n * 100) / 100)
}

const NUMBER = 4
const POSITIVE_NUMBER = 5
const WHOLE_NUMBER = 6
const TEXT = 10

class Builder {
  blocks: Record<string, ScratchBlock> = {}
  private count = 0

  constructor(private robot: RobotConfig) {}

  /** Block ids only need to be unique within the project: a counter can never collide. */
  private nextId(): string {
    this.count += 1
    return `rb${this.count.toString().padStart(4, '0')}`
  }

  add(opcode: string, parent: string | null, extra: Partial<ScratchBlock> = {}): string {
    const id = this.nextId()
    this.blocks[id] = { opcode, next: null, parent, inputs: {}, fields: {}, shadow: false, topLevel: false, ...extra }
    return id
  }

  /** A custom SPIKE field lives in its own shadow block. */
  shadow(parent: string, opcode: string, value: string): Input {
    const id = this.nextId()
    this.blocks[id] = {
      opcode,
      next: null,
      parent,
      inputs: {},
      fields: { [`field_${opcode}`]: [value, null] },
      shadow: true,
      topLevel: false,
    }
    return [1, id]
  }

  /** Chains steps under `parent`; returns the id of the first block (or null). */
  stack(steps: Step[], parent: string): string | null {
    let first: string | null = null
    let prev: string | null = null
    for (const step of steps) {
      const id = this.step(step, prev ?? parent)
      if (prev) this.blocks[prev].next = id
      first ??= id
      prev = id
    }
    return first
  }

  substack(block: string, name: 'SUBSTACK' | 'SUBSTACK2', steps: Step[]) {
    const first = this.stack(steps, block)
    if (first) this.blocks[block].inputs[name] = [2, first]
  }

  condition(block: string, condition: Condition) {
    this.blocks[block].inputs.CONDITION = [2, this.bool(condition, block)]
  }

  bool(c: Condition, parent: string): string {
    switch (c.sensor) {
      case 'distance': {
        const id = this.add('flippersensors_isDistance', parent)
        const b = this.blocks[id]
        b.inputs.PORT = this.shadow(id, 'flippersensors_distance-sensor-selector', c.port)
        b.inputs.VALUE = [1, [NUMBER, numStr(c.value)]]
        b.fields.COMPARATOR = [c.comparator, null]
        b.fields.UNIT = [c.unit, null]
        return id
      }
      case 'color': {
        const id = this.add('flippersensors_isColor', parent)
        const b = this.blocks[id]
        b.inputs.PORT = this.shadow(id, 'flippersensors_color-sensor-selector', c.port)
        b.inputs.VALUE = this.shadow(id, 'flippersensors_color-selector', SENSOR_COLORS[c.color])
        return id
      }
      case 'reflection': {
        const id = this.add('flippersensors_isReflectivity', parent)
        const b = this.blocks[id]
        b.inputs.PORT = this.shadow(id, 'flippersensors_color-sensor-selector', c.port)
        b.inputs.VALUE = [1, [NUMBER, numStr(c.value)]]
        b.fields.COMPARATOR = [c.comparator, null]
        return id
      }
      case 'force': {
        const id = this.add('flippersensors_isPressed', parent)
        const b = this.blocks[id]
        b.inputs.PORT = this.shadow(id, 'flippersensors_force-sensor-selector', c.port)
        b.fields.OPTION = [c.state, null]
        return id
      }
      case 'button': {
        const id = this.add('flippersensors_buttonIsPressed', parent)
        const b = this.blocks[id]
        b.fields.BUTTON = [c.button, null]
        b.fields.EVENT = [c.state, null]
        return id
      }
    }
  }

  /** Adds the block for one step (with its inputs and nested stacks) and returns its id. */
  step(s: Step, parent: string): string {
    switch (s.op) {
      case 'move': {
        const id = this.add('flippermove_move', parent)
        const b = this.blocks[id]
        b.inputs.DIRECTION = this.shadow(id, 'flippermove_custom-icon-direction', s.direction)
        b.inputs.VALUE = [1, [NUMBER, numStr(s.value)]]
        b.fields.UNIT = [s.unit, null]
        return id
      }
      case 'turn': {
        // Spin in place: steering ±100 for the wheel rotation that turns the robot by `degrees`.
        const id = this.add('flippermove_steer', parent)
        const b = this.blocks[id]
        b.inputs.STEERING = this.shadow(id, 'flippermove_rotation-wheel', s.direction === 'right' ? '100' : '-100')
        b.inputs.VALUE = [1, [NUMBER, numStr(spinTurnDegrees(s.degrees, this.robot))]]
        b.fields.UNIT = ['degrees', null]
        return id
      }
      case 'steer': {
        const id = this.add('flippermove_steer', parent)
        const b = this.blocks[id]
        b.inputs.STEERING = this.shadow(id, 'flippermove_rotation-wheel', numStr(s.steering))
        b.inputs.VALUE = [1, [NUMBER, numStr(s.value)]]
        b.fields.UNIT = [s.unit, null]
        return id
      }
      case 'start_move': {
        if (s.direction === 'forward' || s.direction === 'back') {
          const id = this.add('flippermove_startMove', parent)
          this.blocks[id].inputs.DIRECTION = this.shadow(id, 'flippermove_custom-icon-direction', s.direction)
          return id
        }
        const id = this.add('flippermove_startSteer', parent)
        this.blocks[id].inputs.STEERING = this.shadow(id, 'flippermove_rotation-wheel', s.direction === 'right' ? '100' : '-100')
        return id
      }
      case 'start_steer': {
        const id = this.add('flippermove_startSteer', parent)
        this.blocks[id].inputs.STEERING = this.shadow(id, 'flippermove_rotation-wheel', numStr(s.steering))
        return id
      }
      case 'stop_move':
        return this.add('flippermove_stopMove', parent)
      case 'set_speed': {
        const id = this.add('flippermove_movementSpeed', parent)
        this.blocks[id].inputs.SPEED = [1, [NUMBER, numStr(s.speed)]]
        return id
      }
      case 'motor_run': {
        const id = this.add('flippermotor_motorTurnForDirection', parent)
        const b = this.blocks[id]
        b.inputs.PORT = this.shadow(id, 'flippermotor_multiple-port-selector', s.port)
        b.inputs.DIRECTION = this.shadow(id, 'flippermotor_custom-icon-direction', s.direction)
        b.inputs.VALUE = [1, [NUMBER, numStr(s.value)]]
        b.fields.UNIT = [s.unit, null]
        return id
      }
      case 'motor_start': {
        const id = this.add('flippermotor_motorStartDirection', parent)
        const b = this.blocks[id]
        b.inputs.PORT = this.shadow(id, 'flippermotor_multiple-port-selector', s.port)
        b.inputs.DIRECTION = this.shadow(id, 'flippermotor_custom-icon-direction', s.direction)
        return id
      }
      case 'motor_stop': {
        const id = this.add('flippermotor_motorStop', parent)
        this.blocks[id].inputs.PORT = this.shadow(id, 'flippermotor_multiple-port-selector', s.port)
        return id
      }
      case 'motor_speed': {
        const id = this.add('flippermotor_motorSetSpeed', parent)
        const b = this.blocks[id]
        b.inputs.PORT = this.shadow(id, 'flippermotor_multiple-port-selector', s.port)
        b.inputs.SPEED = [1, [NUMBER, numStr(s.speed)]]
        return id
      }
      case 'show_image': {
        const timed = s.seconds !== undefined
        const id = this.add(timed ? 'flipperlight_lightDisplayImageOnForTime' : 'flipperlight_lightDisplayImageOn', parent)
        const b = this.blocks[id]
        b.inputs.MATRIX = this.shadow(id, 'flipperlight_matrix-5x5-brightness-image', imagePixels(s.image))
        if (timed) b.inputs.VALUE = [1, [NUMBER, numStr(s.seconds ?? 2)]]
        return id
      }
      case 'write': {
        const id = this.add('flipperlight_lightDisplayText', parent)
        this.blocks[id].inputs.TEXT = [1, [TEXT, s.text]]
        return id
      }
      case 'clear_display':
        return this.add('flipperlight_lightDisplayOff', parent)
      case 'beep': {
        const id = this.add('flippersound_beepForTime', parent)
        const b = this.blocks[id]
        b.inputs.NOTE = this.shadow(id, 'flippersound_custom-piano', numStr(s.note))
        b.inputs.DURATION = [1, [NUMBER, numStr(s.seconds)]]
        return id
      }
      case 'button_light': {
        const id = this.add('flipperlight_centerButtonLight', parent)
        this.blocks[id].inputs.COLOR = this.shadow(id, 'flipperlight_color-selector-vertical', LIGHT_COLORS[s.color])
        return id
      }
      case 'wait': {
        const id = this.add('control_wait', parent)
        this.blocks[id].inputs.DURATION = [1, [POSITIVE_NUMBER, numStr(s.seconds)]]
        return id
      }
      case 'wait_until': {
        const id = this.add('control_wait_until', parent)
        this.condition(id, s.condition)
        return id
      }
      case 'repeat': {
        const id = this.add('control_repeat', parent)
        this.blocks[id].inputs.TIMES = [1, [WHOLE_NUMBER, numStr(s.times)]]
        this.substack(id, 'SUBSTACK', s.steps)
        return id
      }
      case 'forever': {
        const id = this.add('control_forever', parent)
        this.substack(id, 'SUBSTACK', s.steps)
        return id
      }
      case 'repeat_until': {
        const id = this.add('control_repeat_until', parent)
        this.condition(id, s.condition)
        this.substack(id, 'SUBSTACK', s.steps)
        return id
      }
      case 'if': {
        const id = this.add(s.else?.length ? 'control_if_else' : 'control_if', parent)
        this.condition(id, s.condition)
        this.substack(id, 'SUBSTACK', s.then)
        if (s.else?.length) this.substack(id, 'SUBSTACK2', s.else)
        return id
      }
    }
  }

}

/** Prefix of an opcode = the Scratch extension that defines it. */
export function extensionsOf(blocks: Record<string, ScratchBlock>): string[] {
  const core = new Set(['control', 'operator', 'data', 'event', 'procedures', 'argument', 'sensing', 'motion', 'looks', 'sound'])
  const ids = new Set<string>()
  for (const b of Object.values(blocks)) {
    const ext = b.opcode.split('_')[0]
    if (!core.has(ext)) ids.add(ext)
  }
  return [...ids].sort()
}

export function buildProject(program: Program, robot: RobotConfig = DEFAULT_ROBOT): ScratchProject {
  const b = new Builder(robot)
  const hat = b.add('flipperevents_whenProgramStarts', null, { topLevel: true, x: -130, y: 120 })

  let tail = hat
  const append = (id: string) => {
    b.blocks[id].parent = tail
    b.blocks[tail].next = id
    tail = id
  }

  // Configure the drive base first, as SPIKE's own templates do.
  if (usesOp(program.steps, (s) => MOVEMENT_OPS.has(s.op))) {
    const pair = b.add('flippermove_setMovementPair', tail)
    b.blocks[pair].inputs.PAIR = b.shadow(pair, 'flippermove_movement-port-selector', `${robot.leftMotor}${robot.rightMotor}`)
    append(pair)

    const cm = effectiveCmPerRotation(robot)
    if (cm !== SPIKE_DEFAULT_CM_PER_ROTATION) {
      const dist = b.add('flippermove_setDistance', tail)
      b.blocks[dist].inputs.DISTANCE = [1, [NUMBER, numStr(cm)]]
      b.blocks[dist].fields.UNIT = ['cm', null]
      append(dist)
    }
  }

  const first = b.stack(program.steps, tail)
  if (first) {
    b.blocks[tail].next = first
    b.blocks[first].parent = tail
  }

  const costume = (name: string, x: number, y: number) => ({
    assetId: EMPTY_SVG_ASSET,
    name,
    bitmapResolution: 1,
    md5ext: `${EMPTY_SVG_ASSET}.svg`,
    dataFormat: 'svg',
    rotationCenterX: x,
    rotationCenterY: y,
  })

  const extensions = extensionsOf(b.blocks)

  return {
    targets: [
      {
        isStage: true,
        name: 'Stage',
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: {},
        comments: {},
        currentCostume: 0,
        costumes: [costume('backdrop1', 47, 55)],
        sounds: [],
        volume: 0,
        tempo: 60,
        videoTransparency: 50,
        videoState: 'on',
        textToSpeechLanguage: null,
      },
      {
        isStage: false,
        name: randomId(),
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: b.blocks,
        comments: {},
        currentCostume: 0,
        costumes: [costume(randomId(), 240, 180)],
        sounds: [],
        volume: 100,
        visible: true,
        x: 0,
        y: 0,
        size: 100,
        direction: 90,
        draggable: false,
        rotationStyle: 'all around',
      },
    ],
    monitors: [],
    extensions,
    meta: { semver: '3.0.0', vm: '0.2.0', agent: 'RoboEasy' },
  }
}
