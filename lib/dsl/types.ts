/**
 * RoboEasy block program: the small, validated vocabulary the AI is allowed
 * to produce in "blocks" mode. Every step maps 1:1 to a LEGO SPIKE App 3
 * word block (see ./scratch.ts) and to SPIKE 3 MicroPython (see ./python.ts).
 *
 * The AI output is untrusted: `parseProgram` in ./schema.ts validates it
 * (strict structure, clamped numbers), so whatever reaches the file
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
// Display text
// ---------------------------------------------------------------------------

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
