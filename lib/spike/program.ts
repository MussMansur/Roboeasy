/**
 * RoboEasy block program: the small, validated vocabulary the AI is allowed
 * to produce in "blocks" mode. Every step maps 1:1 to a LEGO SPIKE App 3
 * word block (see ./scratch.ts) and to SPIKE 3 MicroPython (see ./python.ts).
 *
 * The AI output is untrusted: `sanitizeProgram` whitelists ops and enum
 * values, clamps numbers and limits size, so whatever reaches the file
 * generator is always a structurally valid program.
 */

export const PORTS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export type Port = (typeof PORTS)[number]

export type MoveUnit = 'cm' | 'inches' | 'rotations' | 'degrees' | 'seconds'
export type MotorUnit = 'rotations' | 'degrees' | 'seconds'
export type Comparator = '<' | '>' | '='
export type MotorDirection = 'clockwise' | 'counterclockwise'

/** Colors the SPIKE color sensor reports, with their SPIKE App field values. */
export const SENSOR_COLORS = {
  black: '0',
  violet: '1',
  blue: '3',
  azure: '4',
  green: '6',
  yellow: '7',
  red: '9',
  white: '10',
  none: '-1',
} as const
export type SensorColor = keyof typeof SENSOR_COLORS

/** Colors of the hub's power-button light (same numbering as the sensor). */
export const LIGHT_COLORS = {
  off: '0',
  violet: '1',
  blue: '3',
  azure: '4',
  green: '6',
  yellow: '7',
  orange: '8',
  red: '9',
  white: '10',
} as const
export type LightColor = keyof typeof LIGHT_COLORS

/** Named 5x5 images (brightness 0-9 per pixel, row by row). */
export const IMAGES = {
  smile: '9909999099000009000909990',
  sad: '9909999099000000999090009',
  heart: '0909099999999990999000900',
  heart_small: '0000009090099900090000000',
  surprised: '0909000000009000909000900',
  arrow_up: '0090009990909090090000900',
  arrow_down: '0090000900909090999000900',
  arrow_left: '0090009000999990900000900',
  arrow_right: '0090000090999990009000900',
  yes: '0000000009000909090009000',
  no: '9000909090009000909090009',
  square: '9999990009900099000999999',
  diamond: '0090009090900090909000900',
} as const
export type ImageName = keyof typeof IMAGES

export type Condition =
  | { sensor: 'distance'; port: Port; comparator: Comparator; value: number; unit: 'cm' | 'inches' | '%' }
  | { sensor: 'color'; port: Port; color: SensorColor }
  | { sensor: 'reflection'; port: Port; comparator: Comparator; value: number }
  | { sensor: 'force'; port: Port; state: 'pressed' | 'released' | 'hardpressed' }
  | { sensor: 'button'; button: 'left' | 'right'; state: 'pressed' | 'released' }

export type Step =
  | { op: 'move'; direction: 'forward' | 'back'; value: number; unit: MoveUnit }
  | { op: 'turn'; direction: 'left' | 'right'; degrees: number }
  | { op: 'steer'; steering: number; value: number; unit: MoveUnit }
  | { op: 'start_move'; direction: 'forward' | 'back' | 'left' | 'right' }
  | { op: 'start_steer'; steering: number }
  | { op: 'stop_move' }
  | { op: 'set_speed'; speed: number }
  | { op: 'motor_run'; port: Port; direction: MotorDirection; value: number; unit: MotorUnit }
  | { op: 'motor_start'; port: Port; direction: MotorDirection }
  | { op: 'motor_stop'; port: Port }
  | { op: 'motor_speed'; port: Port; speed: number }
  | { op: 'show_image'; image: string; seconds?: number }
  | { op: 'write'; text: string }
  | { op: 'clear_display' }
  | { op: 'beep'; note: number; seconds: number }
  | { op: 'button_light'; color: LightColor }
  | { op: 'wait'; seconds: number }
  | { op: 'wait_until'; condition: Condition }
  | { op: 'repeat'; times: number; steps: Step[] }
  | { op: 'forever'; steps: Step[] }
  | { op: 'repeat_until'; condition: Condition; steps: Step[] }
  | { op: 'if'; condition: Condition; then: Step[]; else?: Step[] }

export type StepOp = Step['op']

export interface Program {
  title: string
  description: string
  steps: Step[]
}

export interface RobotConfig {
  leftMotor: Port
  rightMotor: Port
  distanceSensor: Port
  colorSensor: Port
  forceSensor: Port
  /** Wheel diameter in cm (SPIKE Prime standard wheel: 5.6). */
  wheelDiameter: number
  /** Distance between the two drive wheels in cm. */
  trackWidth: number
}

export const DEFAULT_ROBOT: RobotConfig = {
  leftMotor: 'A',
  rightMotor: 'B',
  distanceSensor: 'C',
  colorSensor: 'D',
  forceSensor: 'E',
  wheelDiameter: 5.6,
  trackWidth: 11.2,
}

/** SPIKE's own default for "set 1 motor rotation to … cm moved". */
export const SPIKE_DEFAULT_CM_PER_ROTATION = 17.5

export const LIMITS = {
  maxSteps: 60,
  maxDepth: 4,
  maxTitle: 60,
  maxDescription: 400,
  maxText: 40,
}

export const MOVE_UNITS: readonly MoveUnit[] = ['cm', 'inches', 'rotations', 'degrees', 'seconds']
export const MOTOR_UNITS: readonly MotorUnit[] = ['rotations', 'degrees', 'seconds']

/** Ops that run the drive base; used to decide whether to emit the motor-pair setup. */
export const MOVEMENT_OPS: ReadonlySet<StepOp> = new Set(['move', 'turn', 'steer', 'start_move', 'start_steer', 'stop_move', 'set_speed'])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function cmPerRotation(robot: RobotConfig): number {
  return Math.round(Math.PI * robot.wheelDiameter * 10) / 10
}

/**
 * Distance per wheel rotation the program actually uses: SPIKE's default
 * (17.5 cm) unless the wheel is noticeably different, in which case the
 * block program sets it explicitly. Python uses the same value.
 */
export function effectiveCmPerRotation(robot: RobotConfig): number {
  const cm = cmPerRotation(robot)
  return Math.abs(cm - SPIKE_DEFAULT_CM_PER_ROTATION) < 0.2 ? SPIKE_DEFAULT_CM_PER_ROTATION : cm
}

/** Motor degrees each wheel must turn for the robot to spin `angle` degrees in place. */
export function spinTurnDegrees(angle: number, robot: RobotConfig): number {
  return Math.max(1, Math.round((angle * robot.trackWidth) / robot.wheelDiameter))
}

export function imagePixels(image: string): string {
  return image in IMAGES ? IMAGES[image as ImageName] : image
}

export function countSteps(steps: Step[]): number {
  let n = 0
  for (const step of steps) {
    n += 1
    for (const child of childLists(step)) n += countSteps(child)
  }
  return n
}

export function childLists(step: Step): Step[][] {
  switch (step.op) {
    case 'repeat':
    case 'forever':
    case 'repeat_until':
      return [step.steps]
    case 'if':
      return step.else ? [step.then, step.else] : [step.then]
    default:
      return []
  }
}

export function usesOp(steps: Step[], predicate: (step: Step) => boolean): boolean {
  return steps.some((s) => predicate(s) || childLists(s).some((c) => usesOp(c, predicate)))
}

export function conditionsOf(steps: Step[]): Condition[] {
  const out: Condition[] = []
  const walk = (list: Step[]) => {
    for (const s of list) {
      if (s.op === 'wait_until' || s.op === 'repeat_until' || s.op === 'if') out.push(s.condition)
      childLists(s).forEach(walk)
    }
  }
  walk(steps)
  return out
}

// ---------------------------------------------------------------------------
// Sanitizing untrusted input
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

function num(v: unknown, fallback: number, min: number, max: number, decimals = 2): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v.replace(',', '.')) : Number.NaN
  if (!Number.isFinite(n)) return fallback
  const f = 10 ** decimals
  return Math.min(max, Math.max(min, Math.round(n * f) / f))
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback
  const s = v.trim().toLowerCase()
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback
}

function port(v: unknown, fallback: Port): Port {
  return typeof v === 'string' && PORTS.includes(v.trim().toUpperCase() as Port) ? (v.trim().toUpperCase() as Port) : fallback
}

function text(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ә: 'a', ғ: 'g', қ: 'q', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i',
}

/** The hub's 5x5 display only has Latin glyphs, so Cyrillic text is transliterated. */
export function toMatrixText(s: string): string {
  let out = ''
  for (const ch of s) {
    const lower = ch.toLowerCase()
    const mapped = CYRILLIC_TO_LATIN[lower]
    if (mapped === undefined) out += ch
    else out += ch === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1)
  }
  // Keep printable ASCII only.
  return out.replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim()
}

const MOVE_RANGES: Record<MoveUnit, [number, number, number]> = {
  cm: [0.5, 500, 10],
  inches: [0.2, 200, 4],
  rotations: [0.05, 50, 1],
  degrees: [5, 18000, 360],
  seconds: [0.1, 60, 1],
}

const MOTOR_RANGES: Record<MotorUnit, [number, number, number]> = {
  rotations: [0.05, 50, 1],
  degrees: [1, 18000, 90],
  seconds: [0.1, 60, 1],
}

function moveValue(v: unknown, unit: MoveUnit): number {
  const [min, max, fallback] = MOVE_RANGES[unit]
  return num(v, fallback, min, max)
}

function motorValue(v: unknown, unit: MotorUnit): number {
  const [min, max, fallback] = MOTOR_RANGES[unit]
  return num(v, fallback, min, max)
}

function normalizeImage(v: unknown): string {
  if (typeof v !== 'string') return 'smile'
  const s = v.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (s in IMAGES) return s
  const digits = v.replace(/\D/g, '')
  if (digits.length === 25) return digits
  return 'smile'
}

const COMPARATORS: readonly Comparator[] = ['<', '>', '=']

function comparator(v: unknown): Comparator {
  if (typeof v !== 'string') return '<'
  const s = v.trim()
  if (s === '==' || s === 'equals') return '='
  if (s === 'less' || s === 'less_than' || s === 'closer') return '<'
  if (s === 'greater' || s === 'greater_than' || s === 'farther') return '>'
  return (COMPARATORS as readonly string[]).includes(s) ? (s as Comparator) : '<'
}

export function sanitizeCondition(raw: unknown, robot: RobotConfig): Condition | null {
  if (!isObject(raw)) return null
  switch (raw.sensor) {
    case 'distance': {
      const unit = pick(raw.unit, ['cm', 'inches', '%'] as const, 'cm')
      const max = unit === 'cm' ? 200 : unit === 'inches' ? 79 : 100
      return { sensor: 'distance', port: port(raw.port, robot.distanceSensor), comparator: comparator(raw.comparator), value: num(raw.value, 10, 0, max, 1), unit }
    }
    case 'color':
      return { sensor: 'color', port: port(raw.port, robot.colorSensor), color: pick(raw.color, Object.keys(SENSOR_COLORS) as SensorColor[], 'black') }
    case 'reflection':
      return { sensor: 'reflection', port: port(raw.port, robot.colorSensor), comparator: comparator(raw.comparator), value: num(raw.value, 50, 0, 100, 0) }
    case 'force':
      return { sensor: 'force', port: port(raw.port, robot.forceSensor), state: pick(raw.state, ['pressed', 'released', 'hardpressed'] as const, 'pressed') }
    case 'button':
      return { sensor: 'button', button: pick(raw.button, ['left', 'right'] as const, 'left'), state: pick(raw.state, ['pressed', 'released'] as const, 'pressed') }
    default:
      return null
  }
}

interface SanitizeState {
  budget: number
}

function sanitizeSteps(raw: unknown, robot: RobotConfig, depth: number, state: SanitizeState): Step[] {
  if (!Array.isArray(raw)) return []
  const out: Step[] = []
  for (const item of raw) {
    if (state.budget <= 0) break
    const step = sanitizeStep(item, robot, depth, state)
    if (!step) continue
    out.push(step)
    // "forever" is a cap block in Scratch: nothing can be attached below it.
    if (step.op === 'forever') break
  }
  return out
}

function sanitizeStep(raw: unknown, robot: RobotConfig, depth: number, state: SanitizeState): Step | null {
  if (!isObject(raw) || typeof raw.op !== 'string') return null
  state.budget -= 1
  const nested = (v: unknown) => (depth >= LIMITS.maxDepth ? [] : sanitizeSteps(v, robot, depth + 1, state))

  switch (raw.op) {
    case 'move': {
      const unit = pick(raw.unit, MOVE_UNITS, 'cm')
      return { op: 'move', direction: raw.direction === 'back' || raw.direction === 'backward' ? 'back' : 'forward', value: moveValue(raw.value, unit), unit }
    }
    case 'turn':
      return { op: 'turn', direction: pick(raw.direction, ['left', 'right'] as const, 'right'), degrees: num(raw.degrees, 90, 1, 3600, 0) }
    case 'steer': {
      const unit = pick(raw.unit, MOVE_UNITS, 'cm')
      return { op: 'steer', steering: num(raw.steering, 0, -100, 100, 0), value: moveValue(raw.value, unit), unit }
    }
    case 'start_move':
      return { op: 'start_move', direction: pick(raw.direction, ['forward', 'back', 'left', 'right'] as const, 'forward') }
    case 'start_steer':
      return { op: 'start_steer', steering: num(raw.steering, 0, -100, 100, 0) }
    case 'stop_move':
      return { op: 'stop_move' }
    case 'set_speed':
      return { op: 'set_speed', speed: num(raw.speed, 50, 5, 100, 0) }
    case 'motor_run': {
      const unit = pick(raw.unit, MOTOR_UNITS, 'rotations')
      return { op: 'motor_run', port: port(raw.port, 'C'), direction: pick(raw.direction, ['clockwise', 'counterclockwise'] as const, 'clockwise'), value: motorValue(raw.value, unit), unit }
    }
    case 'motor_start':
      return { op: 'motor_start', port: port(raw.port, 'C'), direction: pick(raw.direction, ['clockwise', 'counterclockwise'] as const, 'clockwise') }
    case 'motor_stop':
      return { op: 'motor_stop', port: port(raw.port, 'C') }
    case 'motor_speed':
      return { op: 'motor_speed', port: port(raw.port, 'C'), speed: num(raw.speed, 75, 5, 100, 0) }
    case 'show_image': {
      const step: Step = { op: 'show_image', image: normalizeImage(raw.image) }
      if (raw.seconds !== undefined && raw.seconds !== null) step.seconds = num(raw.seconds, 2, 0.1, 60)
      return step
    }
    case 'write': {
      const t = toMatrixText(text(raw.text, LIMITS.maxText))
      return t ? { op: 'write', text: t } : null
    }
    case 'clear_display':
      return { op: 'clear_display' }
    case 'beep':
      return { op: 'beep', note: num(raw.note, 60, 36, 96, 0), seconds: num(raw.seconds, 0.2, 0.05, 10) }
    case 'button_light':
      return { op: 'button_light', color: pick(raw.color, Object.keys(LIGHT_COLORS) as LightColor[], 'green') }
    case 'wait':
      return { op: 'wait', seconds: num(raw.seconds, 1, 0.05, 300) }
    case 'wait_until': {
      const condition = sanitizeCondition(raw.condition, robot)
      return condition ? { op: 'wait_until', condition } : null
    }
    case 'repeat':
      return { op: 'repeat', times: num(raw.times, 2, 1, 100, 0), steps: nested(raw.steps) }
    case 'forever':
      return { op: 'forever', steps: nested(raw.steps) }
    case 'repeat_until': {
      const condition = sanitizeCondition(raw.condition, robot)
      return condition ? { op: 'repeat_until', condition, steps: nested(raw.steps) } : null
    }
    case 'if': {
      const condition = sanitizeCondition(raw.condition, robot)
      if (!condition) return null
      const step: Step = { op: 'if', condition, then: nested(raw.then) }
      const otherwise = nested(raw.else)
      if (otherwise.length) step.else = otherwise
      return step
    }
    default:
      state.budget += 1
      return null
  }
}

export function sanitizeRobot(raw: unknown): RobotConfig {
  const r = isObject(raw) ? raw : {}
  return {
    leftMotor: port(r.leftMotor, DEFAULT_ROBOT.leftMotor),
    rightMotor: port(r.rightMotor, DEFAULT_ROBOT.rightMotor),
    distanceSensor: port(r.distanceSensor, DEFAULT_ROBOT.distanceSensor),
    colorSensor: port(r.colorSensor, DEFAULT_ROBOT.colorSensor),
    forceSensor: port(r.forceSensor, DEFAULT_ROBOT.forceSensor),
    wheelDiameter: num(r.wheelDiameter, DEFAULT_ROBOT.wheelDiameter, 2, 20, 1),
    trackWidth: num(r.trackWidth, DEFAULT_ROBOT.trackWidth, 4, 40, 1),
  }
}

export function sanitizeProgram(raw: unknown, robot: RobotConfig = DEFAULT_ROBOT): Program {
  const r = isObject(raw) ? raw : {}
  const state: SanitizeState = { budget: LIMITS.maxSteps }
  return {
    title: text(r.title, LIMITS.maxTitle) || 'RoboEasy',
    description: text(r.description, LIMITS.maxDescription),
    steps: sanitizeSteps(r.steps, robot, 1, state),
  }
}

/** Short human-readable summary of which ports/sensors a program touches. */
export function hardwareUsed(program: Program, robot: RobotConfig) {
  const motors = new Set<Port>()
  let drive = false
  const walk = (steps: Step[]) => {
    for (const s of steps) {
      if (MOVEMENT_OPS.has(s.op)) drive = true
      if (s.op === 'motor_run' || s.op === 'motor_start' || s.op === 'motor_stop' || s.op === 'motor_speed') motors.add(s.port)
      childLists(s).forEach(walk)
    }
  }
  walk(program.steps)
  const sensors = new Map<string, Port | null>()
  for (const c of conditionsOf(program.steps)) {
    sensors.set(c.sensor, c.sensor === 'button' ? null : c.port)
  }
  return { drive: drive ? ([robot.leftMotor, robot.rightMotor] as const) : null, motors: [...motors], sensors: [...sensors.entries()] }
}
