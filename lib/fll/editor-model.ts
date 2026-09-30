/**
 * Pure editing operations for the season editor: add / change / remove
 * objects, undo history and data checks. The UI only calls these.
 */

import { actionZonePolygon, missionOutline, zonePolygon } from './geometry'
import { type LaunchArea, type Mission, type Point, type Season, type Shape, type Zone, safeParseSeason } from './season'

export type ItemKind = 'mission' | 'launch' | 'forbidden'
export interface Selection {
  kind: ItemKind
  id: string
}

export type ItemOf<K extends ItemKind> = K extends 'mission' ? Mission : K extends 'launch' ? LaunchArea : Zone

const LIST = { mission: 'missions', launch: 'launchAreas', forbidden: 'forbiddenZones' } as const

export function listOf(season: Season, kind: ItemKind): { id: string }[] {
  return season[LIST[kind]]
}

export function getItem<K extends ItemKind>(season: Season, kind: K, id: string): ItemOf<K> | undefined {
  return listOf(season, kind).find((x) => x.id === id) as ItemOf<K> | undefined
}

export function updateItem<K extends ItemKind>(season: Season, kind: K, id: string, fn: (item: ItemOf<K>) => ItemOf<K>): Season {
  const map = <T extends { id: string }>(list: T[]): T[] => list.map((x) => (x.id === id ? (fn(x as unknown as ItemOf<K>) as unknown as T) : x))
  switch (kind) {
    case 'mission':
      return { ...season, missions: map(season.missions) }
    case 'launch':
      return { ...season, launchAreas: map(season.launchAreas) }
    default:
      return { ...season, forbiddenZones: map(season.forbiddenZones) }
  }
}

export function removeItem(season: Season, sel: Selection): Season {
  const keep = <T extends { id: string }>(list: T[]) => list.filter((x) => x.id !== sel.id)
  if (sel.kind === 'mission') return { ...season, missions: keep(season.missions) }
  if (sel.kind === 'launch') return { ...season, launchAreas: keep(season.launchAreas) }
  return { ...season, forbiddenZones: keep(season.forbiddenZones) }
}

/** Renames an item; returns null when the id is empty or taken. */
export function renameItem(season: Season, sel: Selection, id: string): Season | null {
  const clean = id.trim()
  if (!clean || (clean !== sel.id && listOf(season, sel.kind).some((x) => x.id === clean))) return null
  return updateItem(season, sel.kind, sel.id, (item) => ({ ...item, id: clean }))
}

export function uniqueId(prefix: string, taken: readonly string[], digits = 2): string {
  for (let i = 1; ; i++) {
    const id = `${prefix}${String(i).padStart(digits, '0')}`
    if (!taken.includes(id)) return id
  }
}

export const snap = (v: number, grid: number) => (grid > 0 ? Math.round(v / grid) * grid : Math.round(v))
export const snapPoint = (p: Point, grid: number): Point => ({ x: snap(p.x, grid), y: snap(p.y, grid) })

const rect = (width: number, height: number): Shape => ({ kind: 'rect', width, height })
const emptyName = () => ({ ru: '', en: '' })

/** New mission: placeholder data marked todo — real names and points come from the rulebook. */
export function addMission(season: Season, at: Point): [Season, Selection] {
  const id = uniqueId('M', season.missions.map((m) => m.id))
  const number = season.missions.reduce((n, m) => Math.max(n, m.number), 0) + 1
  const mission: Mission = {
    id,
    number,
    name: emptyName(),
    x: at.x,
    y: at.y,
    rotationDeg: 0,
    outline: rect(150, 150),
    actionZone: { dx: -220, dy: 0, rotationDeg: 0, shape: rect(120, 120) },
    points: 0,
    action: 'push',
    plan: { actionMm: 60, attachmentDeg: 90, via: [] },
    todo: true,
  }
  return [{ ...season, missions: [...season.missions, mission] }, { kind: 'mission', id }]
}

export function addLaunchArea(season: Season, at: Point): [Season, Selection] {
  const id = uniqueId('L', season.launchAreas.map((a) => a.id), 1)
  const area: LaunchArea = { id, name: emptyName(), x: at.x, y: at.y, rotationDeg: 0, shape: rect(400, 300), start: { x: at.x, y: at.y, headingDeg: 90 } }
  return [{ ...season, launchAreas: [...season.launchAreas, area] }, { kind: 'launch', id }]
}

export function addForbiddenZone(season: Season, at: Point): [Season, Selection] {
  const id = uniqueId('Z', season.forbiddenZones.map((z) => z.id), 1)
  const zone: Zone = { id, x: at.x, y: at.y, rotationDeg: 0, shape: rect(200, 200) }
  return [{ ...season, forbiddenZones: [...season.forbiddenZones, zone] }, { kind: 'forbidden', id }]
}

export function duplicateItem(season: Season, sel: Selection): [Season, Selection] | null {
  const shift = 60
  if (sel.kind === 'mission') {
    const m = getItem(season, 'mission', sel.id)
    if (!m) return null
    const [next, created] = addMission(season, { x: m.x + shift, y: m.y - shift })
    return [updateItem(next, 'mission', created.id, (c) => ({ ...m, id: c.id, number: c.number, x: c.x, y: c.y, todo: true })), created]
  }
  if (sel.kind === 'launch') {
    const a = getItem(season, 'launch', sel.id)
    if (!a) return null
    const [next, created] = addLaunchArea(season, { x: a.x + shift, y: a.y - shift })
    const start = { ...a.start, x: a.start.x + shift, y: a.start.y - shift }
    return [updateItem(next, 'launch', created.id, (c) => ({ ...a, id: c.id, x: c.x, y: c.y, start })), created]
  }
  const z = getItem(season, 'forbidden', sel.id)
  if (!z) return null
  const [next, created] = addForbiddenZone(season, { x: z.x + shift, y: z.y - shift })
  return [updateItem(next, 'forbidden', created.id, (c) => ({ ...z, id: c.id, x: c.x, y: c.y })), created]
}

/** Moves an item by (dx, dy); a launch area takes its start pose along. */
export function moveItem(season: Season, sel: Selection, dx: number, dy: number): Season {
  if (sel.kind === 'launch')
    return updateItem(season, 'launch', sel.id, (a) => ({ ...a, x: a.x + dx, y: a.y + dy, start: { ...a.start, x: a.start.x + dx, y: a.start.y + dy } }))
  return updateItem(season, sel.kind, sel.id, (item) => ({ ...item, x: item.x + dx, y: item.y + dy }))
}

/** Rect ⇄ polygon (a rect becomes its 4 corners; a polygon becomes its bounding box). */
export function toggleShapeKind(shape: Shape): Shape {
  if (shape.kind === 'rect') {
    const w = shape.width / 2
    const h = shape.height / 2
    return {
      kind: 'polygon',
      points: [
        { x: -w, y: -h },
        { x: w, y: -h },
        { x: w, y: h },
        { x: -w, y: h },
      ],
    }
  }
  const xs = shape.points.map((p) => Math.abs(p.x))
  const ys = shape.points.map((p) => Math.abs(p.y))
  return rect(Math.max(20, 2 * Math.max(...xs)), Math.max(20, 2 * Math.max(...ys)))
}

// ---------------------------------------------------------------------------
// Undo history
// ---------------------------------------------------------------------------

export interface History<T> {
  past: T[]
  present: T
  future: T[]
  /** Consecutive commits with the same key (one drag, typing in one field) are one undo step. */
  key: string | null
}

const MAX_HISTORY = 150

export const initHistory = <T>(present: T): History<T> => ({ past: [], present, future: [], key: null })

export function commit<T>(h: History<T>, next: T, key: string | null = null): History<T> {
  if (next === h.present) return h
  if (key !== null && key === h.key) return { ...h, present: next, future: [] }
  return { past: [...h.past, h.present].slice(-MAX_HISTORY), present: next, future: [], key }
}

export function undo<T>(h: History<T>): History<T> {
  const prev = h.past.at(-1)
  if (prev === undefined) return h
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], key: null }
}

export function redo<T>(h: History<T>): History<T> {
  const [next, ...rest] = h.future
  if (next === undefined) return h
  return { past: [...h.past, h.present], present: next, future: rest, key: null }
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export type EditorIssue = { kind: 'outside' | 'noName'; sel: Selection }

export function seasonIssues(season: Season): EditorIssue[] {
  const { widthMm: W, heightMm: H } = season.field
  const outside = (points: Point[]) => points.some((p) => p.x < -1 || p.y < -1 || p.x > W + 1 || p.y > H + 1)
  const issues: EditorIssue[] = []
  for (const m of season.missions) {
    const sel: Selection = { kind: 'mission', id: m.id }
    if (!m.name.ru.trim() && !m.name.en.trim()) issues.push({ kind: 'noName', sel })
    if (outside(missionOutline(m)) || outside(actionZonePolygon(m))) issues.push({ kind: 'outside', sel })
  }
  for (const a of season.launchAreas) if (outside(zonePolygon(a))) issues.push({ kind: 'outside', sel: { kind: 'launch', id: a.id } })
  for (const z of season.forbiddenZones) if (outside(zonePolygon(z))) issues.push({ kind: 'outside', sel: { kind: 'forbidden', id: z.id } })
  return issues
}

/** Validates the edited season exactly as the app will when the file is in data/seasons. */
export function validateSeason(season: Season): { ok: true } | { ok: false; error: string } {
  const r = safeParseSeason(JSON.parse(JSON.stringify(season)))
  return r.ok ? { ok: true } : { ok: false, error: r.error }
}

export function seasonToJson(season: Season): string {
  return `${JSON.stringify(season, null, 2)}\n`
}
