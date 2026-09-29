/**
 * SPIKE App 3 MicroPython: a deterministic block-program → Python translator
 * (so every block program also has an exact Python version to learn from)
 * and the checks applied to Python written by the AI.
 *
 * API reference: SPIKE 3 hub modules — hub, runloop, motor, motor_pair,
 * distance_sensor, color_sensor, force_sensor, color.
 */

import {
  type Condition,
  type Program,
  type RobotConfig,
  type Step,
  DEFAULT_ROBOT,
  MOVEMENT_OPS,
  effectiveCmPerRotation,
  conditionsOf,
  imagePixels,
  spinTurnDegrees,
  usesOp,
} from './program'

const COLOR_CONST: Record<string, string> = {
  black: 'BLACK',
  violet: 'MAGENTA',
  blue: 'BLUE',
  azure: 'AZURE',
  green: 'GREEN',
  yellow: 'YELLOW',
  orange: 'ORANGE',
  red: 'RED',
  white: 'WHITE',
  none: 'UNKNOWN',
  off: 'BLACK',
}

const fmt = (n: number) => String(Math.round(n * 100) / 100)

/** Movement speed in % → velocity in degrees per second (100% ≈ 1000 °/s). */
const velocity = (percent: number) => Math.round(percent * 10)

/** MIDI note → frequency in Hz, like SPIKE's beep block. */
export function noteToHz(note: number): number {
  return Math.round(440 * 2 ** ((note - 69) / 12))
}

function pyString(s: string): string {
  return JSON.stringify(s)
}

interface Ctx {
  robot: RobotConfig
  cm: number
  lines: string[]
}

function conditionExpr(c: Condition): string {
  switch (c.sensor) {
    case 'distance': {
      const unit = c.unit === 'cm' ? 'distance_cm' : c.unit === 'inches' ? 'distance_inches' : 'distance_percent'
      const op = c.comparator === '=' ? '==' : c.comparator
      return `${unit}(port.${c.port}) ${op} ${fmt(c.value)}`
    }
    case 'color':
      return `color_sensor.color(port.${c.port}) == color.${COLOR_CONST[c.color]}`
    case 'reflection': {
      const op = c.comparator === '=' ? '==' : c.comparator
      return `color_sensor.reflection(port.${c.port}) ${op} ${fmt(c.value)}`
    }
    case 'force':
      if (c.state === 'released') return `not force_sensor.pressed(port.${c.port})`
      if (c.state === 'hardpressed') return `force_sensor.force(port.${c.port}) > 80`
      return `force_sensor.pressed(port.${c.port})`
    case 'button': {
      const b = `button.pressed(button.${c.button.toUpperCase()})`
      return c.state === 'released' ? `${b} == 0` : `${b} > 0`
    }
  }
}

function moveDegrees(value: number, unit: string, ctx: Ctx): number {
  switch (unit) {
    case 'cm':
      return Math.round((value / ctx.cm) * 360)
    case 'inches':
      return Math.round(((value * 2.54) / ctx.cm) * 360)
    case 'rotations':
      return Math.round(value * 360)
    default:
      return Math.round(value)
  }
}

function emit(steps: Step[], depth: number, ctx: Ctx) {
  const pad = '    '.repeat(depth)
  const line = (s: string) => ctx.lines.push(pad + s)
  const block = (body: Step[], loop: boolean) => {
    const before = ctx.lines.length
    emit(body, depth + 1, ctx)
    if (ctx.lines.length === before) ctx.lines.push('    '.repeat(depth + 1) + (loop ? 'await runloop.sleep_ms(10)' : 'pass'))
    else if (loop) ctx.lines.push('    '.repeat(depth + 1) + 'await runloop.sleep_ms(10)')
  }

  for (const s of steps) {
    switch (s.op) {
      case 'move': {
        const v = s.direction === 'back' ? '-speed' : 'speed'
        if (s.unit === 'seconds') line(`await motor_pair.move_for_time(motor_pair.PAIR_1, ${Math.round(s.value * 1000)}, 0, velocity=${v})`)
        else line(`await motor_pair.move_for_degrees(motor_pair.PAIR_1, ${moveDegrees(s.value, s.unit, ctx)}, 0, velocity=${v})`)
        break
      }
      case 'turn': {
        const steering = s.direction === 'right' ? 100 : -100
        line(`# ${s.direction === 'right' ? '↻' : '↺'} ${fmt(s.degrees)}°`)
        line(`await motor_pair.move_for_degrees(motor_pair.PAIR_1, ${spinTurnDegrees(s.degrees, ctx.robot)}, ${steering}, velocity=speed)`)
        break
      }
      case 'steer':
        if (s.unit === 'seconds') line(`await motor_pair.move_for_time(motor_pair.PAIR_1, ${Math.round(s.value * 1000)}, ${fmt(s.steering)}, velocity=speed)`)
        else line(`await motor_pair.move_for_degrees(motor_pair.PAIR_1, ${moveDegrees(s.value, s.unit, ctx)}, ${fmt(s.steering)}, velocity=speed)`)
        break
      case 'start_move': {
        const steering = s.direction === 'left' ? -100 : s.direction === 'right' ? 100 : 0
        line(`motor_pair.move(motor_pair.PAIR_1, ${steering}, velocity=${s.direction === 'back' ? '-speed' : 'speed'})`)
        break
      }
      case 'start_steer':
        line(`motor_pair.move(motor_pair.PAIR_1, ${fmt(s.steering)}, velocity=speed)`)
        break
      case 'stop_move':
        line('motor_pair.stop(motor_pair.PAIR_1)')
        break
      case 'set_speed':
        line(`speed = ${velocity(s.speed)}  # ${fmt(s.speed)}%`)
        break
      case 'motor_run': {
        const v = `${s.direction === 'counterclockwise' ? '-' : ''}motor_speed['${s.port}']`
        if (s.unit === 'seconds') line(`await motor.run_for_time(port.${s.port}, ${Math.round(s.value * 1000)}, ${v})`)
        else line(`await motor.run_for_degrees(port.${s.port}, ${Math.round(s.unit === 'rotations' ? s.value * 360 : s.value)}, ${v})`)
        break
      }
      case 'motor_start':
        line(`motor.run(port.${s.port}, ${s.direction === 'counterclockwise' ? '-' : ''}motor_speed['${s.port}'])`)
        break
      case 'motor_stop':
        line(`motor.stop(port.${s.port})`)
        break
      case 'motor_speed':
        line(`motor_speed['${s.port}'] = ${velocity(s.speed)}  # ${fmt(s.speed)}%`)
        break
      case 'show_image': {
        const px = imagePixels(s.image)
          .split('')
          .map((d) => Math.round((Number(d) * 100) / 9))
        if (s.image.length !== 25) line(`# ${s.image}`)
        line('light_matrix.show([')
        for (let r = 0; r < 5; r++) line(`    ${px.slice(r * 5, r * 5 + 5).join(', ')},`)
        line('])')
        if (s.seconds !== undefined) {
          line(`await runloop.sleep_ms(${Math.round(s.seconds * 1000)})`)
          line('light_matrix.clear()')
        }
        break
      }
      case 'write':
        line(`await light_matrix.write(${pyString(s.text)})`)
        break
      case 'clear_display':
        line('light_matrix.clear()')
        break
      case 'beep':
        line(`await sound.beep(${noteToHz(s.note)}, ${Math.round(s.seconds * 1000)}, 100)`)
        break
      case 'button_light':
        line(`light.color(light.POWER, color.${COLOR_CONST[s.color]})`)
        break
      case 'wait':
        line(`await runloop.sleep_ms(${Math.round(s.seconds * 1000)})`)
        break
      case 'wait_until':
        line(`await runloop.until(lambda: ${conditionExpr(s.condition)})`)
        break
      case 'repeat':
        line(`for _ in range(${s.times}):`)
        block(s.steps, false)
        break
      case 'forever':
        line('while True:')
        block(s.steps, true)
        break
      case 'repeat_until':
        line(`while not (${conditionExpr(s.condition)}):`)
        block(s.steps, true)
        break
      case 'if':
        line(`if ${conditionExpr(s.condition)}:`)
        block(s.then, false)
        if (s.else?.length) {
          line('else:')
          block(s.else, false)
        }
        break
    }
  }
}

/** Translates a block program to SPIKE App 3 MicroPython. */
export function programToPython(program: Program, robot: RobotConfig = DEFAULT_ROBOT): string {
  const ctx: Ctx = { robot, cm: effectiveCmPerRotation(robot), lines: [] }
  const drive = usesOp(program.steps, (s) => MOVEMENT_OPS.has(s.op))
  const has = (op: Step['op'] | Step['op'][]) => usesOp(program.steps, (s) => (Array.isArray(op) ? op.includes(s.op) : s.op === op))
  const sensors = new Set(conditionsOf(program.steps).map((c) => c.sensor))
  const motorPorts = new Set<string>()
  const collect = (steps: Step[]) => {
    for (const s of steps) {
      if (s.op === 'motor_run' || s.op === 'motor_start' || s.op === 'motor_stop' || s.op === 'motor_speed') motorPorts.add(s.port)
      if (s.op === 'repeat' || s.op === 'forever' || s.op === 'repeat_until') collect(s.steps)
      if (s.op === 'if') {
        collect(s.then)
        if (s.else) collect(s.else)
      }
    }
  }
  collect(program.steps)

  const hubImports = ['port']
  if (has(['show_image', 'write', 'clear_display'])) hubImports.push('light_matrix')
  if (has('beep')) hubImports.push('sound')
  if (has('button_light')) hubImports.push('light')
  if (sensors.has('button')) hubImports.push('button')

  const modules = ['runloop']
  if (drive) modules.push('motor_pair')
  if (motorPorts.size) modules.push('motor')
  if (sensors.has('distance')) modules.push('distance_sensor')
  if (sensors.has('color') || sensors.has('reflection')) modules.push('color_sensor')
  if (sensors.has('color') || has('button_light')) modules.push('color')
  if (sensors.has('force')) modules.push('force_sensor')

  const out: string[] = []
  out.push(`# ${program.title}`)
  if (program.description) out.push(`# ${program.description}`)
  out.push('# RoboEasy AI · LEGO SPIKE App 3 (Python)')
  out.push('')
  out.push(`from hub import ${hubImports.join(', ')}`)
  out.push(`import ${modules.join(', ')}`)
  out.push('')

  if (sensors.has('distance')) {
    out.push('')
    out.push('def distance_mm(p):')
    out.push('    d = distance_sensor.distance(p)')
    out.push('    return 2000 if d < 0 else d  # -1 = nothing in sight')
    out.push('')
    out.push('def distance_cm(p):')
    out.push('    return distance_mm(p) / 10')
    out.push('')
    out.push('def distance_inches(p):')
    out.push('    return distance_mm(p) / 25.4')
    out.push('')
    out.push('def distance_percent(p):')
    out.push('    return min(100, distance_mm(p) / 20)')
    out.push('')
  }

  out.push('')
  out.push('async def main():')
  // A leading "set speed" becomes the initial value instead of a second assignment.
  const lead = program.steps[0]?.op === 'set_speed' ? program.steps[0] : null
  const steps = lead ? program.steps.slice(1) : program.steps
  if (drive) {
    out.push(`    motor_pair.pair(motor_pair.PAIR_1, port.${robot.leftMotor}, port.${robot.rightMotor})`)
    const percent = lead?.op === 'set_speed' ? lead.speed : 50
    out.push(`    speed = ${velocity(percent)}  # ${fmt(percent)}%, degrees per second`)
  }
  if (motorPorts.size) out.push(`    motor_speed = {${[...motorPorts].map((p) => `'${p}': 750`).join(', ')}}  # 75%`)

  emit(steps, 1, ctx)
  out.push(...ctx.lines)
  if (!ctx.lines.length && !drive && !motorPorts.size) out.push('    pass')

  out.push('')
  out.push('')
  out.push('runloop.run(main())')
  out.push('')
  return out.join('\n')
}

// ---------------------------------------------------------------------------
// Python written by the AI
// ---------------------------------------------------------------------------

/** Removes Markdown fences and normalizes line endings/indentation. */
export function cleanPython(code: string): string {
  let c = code.replace(/\r\n?/g, '\n')
  const fenced = c.match(/```(?:python|py)?\s*\n([\s\S]*?)```/i)
  if (fenced) c = fenced[1]
  c = c.replace(/\t/g, '    ')
  return c.replace(/[ \t]+$/gm, '').trim() + '\n'
}

/** Finds problems that would stop the code from running on a SPIKE App 3 hub. */
export function checkPython(code: string): string[] {
  const issues: string[] = []
  const legacy = [
    [/\bfrom\s+spike\b|\bimport\s+spike\b/, 'uses the SPIKE 2 `spike` module'],
    [/\bfrom\s+mindstorms\b|\bimport\s+mindstorms\b/, 'uses the MINDSTORMS `mindstorms` module'],
    [/\bPrimeHub\s*\(|\bMotorPair\s*\(/, 'uses SPIKE 2 classes (PrimeHub/MotorPair)'],
    [/\bhub\.port\.[A-F]\b/, 'uses the legacy `hub.port.X` API'],
  ] as const
  for (const [re, message] of legacy) if (re.test(code)) issues.push(message)
  if (!/runloop\.run\s*\(/.test(code)) issues.push('does not start the program with runloop.run(...)')
  if (!/\basync\s+def\s+\w+\s*\(/.test(code)) issues.push('has no async main function')
  if (/\binput\s*\(/.test(code)) issues.push('uses input(), which is not available on the hub')
  if (/\btime\.sleep\s*\(/.test(code)) issues.push('uses time.sleep, which blocks the hub; use await runloop.sleep_ms')

  let depth = 0
  const stripped = code.replace(/#.*$/gm, '').replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/g, '""')
  for (const ch of stripped) {
    if ('([{'.includes(ch)) depth++
    else if (')]}'.includes(ch)) depth--
    if (depth < 0) break
  }
  if (depth !== 0) issues.push('has unbalanced brackets')
  return issues
}
