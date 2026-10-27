/**
 * Robot maze: program the robot with forward / left / right and loops
 * ("repeat N"), collect every gem and stop on the finish.
 *
 * A program is a flat list of tokens: 'F', 'L', 'R', 'x2'…'x5' (a loop
 * start) and 'end' (loop end). Stars: as short as our solution (`par`,
 * counted without the 'end' tokens) gives 3, up to 2 longer gives 2.
 */

import type { LearnState } from '../state'

export type Dir = 0 | 1 | 2 | 3 // N E S W
export type Move = 'F' | 'L' | 'R'
export type Token = Move | 'x2' | 'x3' | 'x4' | 'x5' | 'end'
export const LOOP_TOKENS = ['x2', 'x3', 'x4', 'x5'] as const

export interface MazeLevel {
  id: number
  /** '#' wall, '.' floor, '*' gem, 'G' finish, start: '^' '>' 'v' '<' (facing). */
  rows: string[]
  /** Our solution (also checked by the tests). */
  solution: string
  par: number
}

export const MAZE_LEVELS: MazeLevel[] = [
  { id: 1, rows: ['#######', '#>...G#', '#######'], solution: 'F F F F', par: 4 },
  { id: 2, rows: ['#####', '#>..#', '###.#', '###G#', '#####'], solution: 'F F R F F', par: 5 },
  { id: 3, rows: ['######', '#G####', '#.####', '#...<#', '######'], solution: 'F F F R F F', par: 6 },
  { id: 4, rows: ['#######', '#>.*..#', '####.##', '####G##', '#######'], solution: 'F F F R F F', par: 6 },
  { id: 5, rows: ['#########', '#>......#', '#######.#', '#######G#', '#########'], solution: 'x3 F F end R x2 F end', par: 6 },
  { id: 6, rows: ['#######', '#>.####', '##..###', '###..##', '####.G#', '#######'], solution: 'F x3 R F L F end', par: 6 },
  { id: 7, rows: ['#######', '#*...*#', '#.###.#', '#.###.#', '#^###G#', '#######'], solution: 'x3 F end R x4 F end R x3 F end', par: 8 },
  { id: 8, rows: ['########', '#>.....#', '#.####.#', '#.#..#.#', '#....*.#', '######G#', '########'], solution: 'R x3 F end L x5 F end R F', par: 8 },
  { id: 9, rows: ['#######', '#>.#..#', '#.##.##', '#....G#', '#######'], solution: 'R x2 F end L x4 F end', par: 6 },
  { id: 10, rows: ['########', '#*....*#', '#.####.#', '#^####G#', '########'], solution: 'x2 F end R x5 F end R x2 F end', par: 8 },
  { id: 11, rows: ['#######', '#>....#', '#.###.#', '#.#G#.#', '#.#.#.#', '#.....#', '#######'], solution: 'R x4 F end x2 L x2 F end end', par: 7 },
  { id: 12, rows: ['########', '#>..*..#', '#.####.#', '#.....*#', '######G#', '########'], solution: 'x5 F end R x3 F end', par: 5 },
]

export interface Pos {
  x: number
  y: number
  d: Dir
}

export interface ParsedMaze {
  w: number
  h: number
  walls: Set<string>
  gems: string[]
  start: Pos
  goal: { x: number; y: number }
}

const DIRS: Record<string, Dir> = { '^': 0, '>': 1, v: 2, '<': 3 }
const STEP: Record<Dir, [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] }
export const cell = (x: number, y: number) => `${x},${y}`

export function parseMaze(rows: string[]): ParsedMaze {
  const walls = new Set<string>()
  const gems: string[] = []
  let start: Pos = { x: 0, y: 0, d: 1 }
  let goal = { x: 0, y: 0 }
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '#') walls.add(cell(x, y))
      else if (ch === '*') gems.push(cell(x, y))
      else if (ch === 'G') goal = { x, y }
      else if (ch in DIRS) start = { x, y, d: DIRS[ch] }
    }),
  )
  return { w: Math.max(...rows.map((r) => r.length)), h: rows.length, walls, gems, start, goal }
}

/** Tokens → flat moves; null if the loops do not match. Long programs are cut at `limit` moves. */
export function expand(tokens: Token[], limit = 400): Move[] | null {
  const stack: { n: number; body: Move[] }[] = [{ n: 1, body: [] }]
  for (const t of tokens) {
    if (t === 'end') {
      if (stack.length < 2) return null
      const loop = stack.pop()!
      const top = stack[stack.length - 1].body
      for (let i = 0; i < loop.n && top.length < limit; i++) top.push(...loop.body)
    } else if (t.startsWith('x')) stack.push({ n: Number(t.slice(1)), body: [] })
    else stack[stack.length - 1].body.push(t as Move)
  }
  return stack.length === 1 ? stack[0].body.slice(0, limit) : null
}

export function parseSolution(s: string): Token[] {
  return s.split(/\s+/).filter(Boolean) as Token[]
}

/** Blocks the learner placed (loop ends are part of the loop block). */
export function blockCount(tokens: Token[]): number {
  return tokens.filter((t) => t !== 'end').length
}

export type MazeOutcome = 'win' | 'crash' | 'gems' | 'short' | 'loops'

export interface MazeRun {
  outcome: MazeOutcome
  /** Robot after each move (starts with the start position). */
  trace: Pos[]
  /** Gems collected by each trace point. */
  collected: number[]
}

export function runMaze(maze: ParsedMaze, tokens: Token[]): MazeRun {
  const moves = expand(tokens)
  let p = { ...maze.start }
  const trace: Pos[] = [p]
  const got = new Set<string>()
  const collected = [0]
  if (!moves) return { outcome: 'loops', trace, collected }
  for (const m of moves) {
    if (m === 'L') p = { ...p, d: ((p.d + 3) % 4) as Dir }
    else if (m === 'R') p = { ...p, d: ((p.d + 1) % 4) as Dir }
    else {
      const [dx, dy] = STEP[p.d]
      const nx = p.x + dx
      const ny = p.y + dy
      if (maze.walls.has(cell(nx, ny)) || nx < 0 || ny < 0 || nx >= maze.w || ny >= maze.h) {
        trace.push({ ...p })
        collected.push(got.size)
        return { outcome: 'crash', trace, collected }
      }
      p = { ...p, x: nx, y: ny }
      if (maze.gems.includes(cell(nx, ny))) got.add(cell(nx, ny))
    }
    trace.push(p)
    collected.push(got.size)
  }
  const atGoal = p.x === maze.goal.x && p.y === maze.goal.y
  return { outcome: !atGoal ? 'short' : got.size < maze.gems.length ? 'gems' : 'win', trace, collected }
}

export function mazeStars(level: MazeLevel, tokens: Token[]): number {
  const n = blockCount(tokens)
  return n <= level.par ? 3 : n <= level.par + 2 ? 2 : 1
}

/** Shortest plain program (no loops) by breadth-first search; the maze hint uses it. */
export function shortestMoves(maze: ParsedMaze): Move[] | null {
  const gemIndex = new Map(maze.gems.map((g, i) => [g, i]))
  const all = (1 << maze.gems.length) - 1
  type Node = { p: Pos; mask: number; path: Move[] }
  const key = (n: Node) => `${n.p.x},${n.p.y},${n.p.d},${n.mask}`
  const queue: Node[] = [{ p: maze.start, mask: 0, path: [] }]
  const seen = new Set([key(queue[0])])
  while (queue.length) {
    const n = queue.shift()!
    if (n.p.x === maze.goal.x && n.p.y === maze.goal.y && n.mask === all) return n.path
    const nexts: Node[] = [
      { p: { ...n.p, d: ((n.p.d + 3) % 4) as Dir }, mask: n.mask, path: [...n.path, 'L'] },
      { p: { ...n.p, d: ((n.p.d + 1) % 4) as Dir }, mask: n.mask, path: [...n.path, 'R'] },
    ]
    const [dx, dy] = STEP[n.p.d]
    const c = cell(n.p.x + dx, n.p.y + dy)
    if (!maze.walls.has(c)) {
      const gi = gemIndex.get(c)
      nexts.push({ p: { ...n.p, x: n.p.x + dx, y: n.p.y + dy }, mask: gi === undefined ? n.mask : n.mask | (1 << gi), path: [...n.path, 'F'] })
    }
    for (const x of nexts) {
      const k = key(x)
      if (seen.has(k)) continue
      seen.add(k)
      queue.push(x)
    }
  }
  return null
}

export function bestStarsOf(state: LearnState): Map<number, number> {
  const best = new Map<number, number>()
  for (const e of state.events) if (e.kind === 'game_done' && e.game === 'maze') best.set(e.level, Math.max(best.get(e.level) ?? 0, e.stars))
  return best
}
