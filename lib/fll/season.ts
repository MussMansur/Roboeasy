/**
 * FLL season data — one schema for every year, so a new season is only data
 * (data/seasons/*.json), never code.
 *
 * Coordinates: mm from the bottom-left corner of the mat (x to the right,
 * y away from the team's side). Angles: degrees, 0 = +x, counterclockwise.
 * Shapes are stored in their owner's local frame (centered on the owner,
 * unrotated); lib/fll/geometry.ts places them on the field.
 */

import { z } from 'zod'

export const SEASON_SCHEMA_VERSION = 2

export const MISSION_ACTIONS = ['push', 'pull', 'lift', 'deliver', 'collect', 'flip'] as const
export type MissionAction = (typeof MISSION_ACTIONS)[number]

export const PLATFORMS = ['spike', 'csai'] as const
export type Platform = (typeof PLATFORMS)[number]

export const SEASON_STATUSES = ['current', 'archived'] as const
export const EDITIONS = ['founders', 'future'] as const

/** Text in every UI language (Kazakh falls back to Russian when missing). */
const localized = z.object({ ru: z.string(), en: z.string(), kk: z.string().optional() })
export type Localized = z.infer<typeof localized>

const point = z.object({ x: z.number(), y: z.number() })
export type Point = z.infer<typeof point>

const pose = point.extend({ headingDeg: z.number() })
export type Pose = z.infer<typeof pose>

/** A rectangle (centered) or a polygon, in the owner's local frame. */
const shape = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('rect'), width: z.number().positive(), height: z.number().positive() }),
  z.object({ kind: z.literal('polygon'), points: z.array(point).min(3) }),
])
export type Shape = z.infer<typeof shape>

/** A shape placed on the field. */
const zone = z.object({
  id: z.string().min(1),
  name: localized.optional(),
  x: z.number(),
  y: z.number(),
  rotationDeg: z.number().default(0),
  shape,
})
export type Zone = z.infer<typeof zone>

const launchArea = zone.extend({
  name: localized,
  /** Where the robot's center starts and which way it faces. */
  start: pose,
})
export type LaunchArea = z.infer<typeof launchArea>

const mission = z.object({
  /** Stable id used by plans, e.g. "M03". */
  id: z.string().min(1),
  /** Mission number from the Robot Game Rulebook. */
  number: z.number().int().nonnegative(),
  name: localized,
  /** Center of the mission model and its rotation. */
  x: z.number(),
  y: z.number(),
  rotationDeg: z.number().default(0),
  /** Footprint of the model (collisions, drawing). */
  outline: shape,
  /** Where the robot must be to do the mission, relative to the model center, in the model frame. */
  actionZone: z.object({ dx: z.number(), dy: z.number(), rotationDeg: z.number().default(0), shape }),
  points: z.number().int().nonnegative(),
  action: z.enum(MISSION_ACTIONS),
  notes: localized.optional(),
  /** Hints for route planning. */
  plan: z
    .object({
      /** Robot heading during the action; default: facing the model from the action zone. */
      headingDeg: z.number().optional(),
      /** How far the robot drives during the action (push, pull, deliver, collect). */
      actionMm: z.number().nonnegative().default(60),
      /** Attachment motor travel for lift/pull/flip/deliver/collect, in degrees. */
      attachmentDeg: z.number().positive().default(90),
      /** Intermediate points to drive around other models. */
      via: z.array(point).default([]),
    })
    .default({ actionMm: 60, attachmentDeg: 90, via: [] }),
  todo: z.boolean().optional(),
})
export type Mission = z.infer<typeof mission>

export const seasonSchema = z.object({
  schemaVersion: z.literal(SEASON_SCHEMA_VERSION),
  id: z.string().regex(/^[a-z0-9-]+$/, 'id: lowercase letters, digits and dashes'),
  name: localized,
  years: z.string(),
  status: z.enum(SEASON_STATUSES),
  edition: z.enum(EDITIONS),
  platform: z.enum(PLATFORMS),
  todo: z.string().optional(),
  field: z.object({ widthMm: z.number().positive(), heightMm: z.number().positive(), todo: z.string().optional() }),
  launchAreas: z.array(launchArea),
  forbiddenZones: z.array(zone).default([]),
  missions: z.array(mission),
})
export type Season = z.infer<typeof seasonSchema>
/** The JSON form (defaults may be omitted). */
export type SeasonInput = z.input<typeof seasonSchema>

export function localize(text: Localized | undefined, lang: 'ru' | 'kk' | 'en'): string {
  if (!text) return ''
  return lang === 'kk' ? text.kk || text.ru : text[lang]
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

/**
 * v1 (first FLL helper): launch areas were corner-based rectangles, missions
 * had a heading and an approach distance instead of outlines and zones.
 */
function migrateV1(raw: Json): Json {
  const areas = Array.isArray(raw.launchAreas) ? raw.launchAreas.filter(isObj) : []
  const missions = Array.isArray(raw.missions) ? raw.missions.filter(isObj) : []
  return {
    schemaVersion: 2,
    id: raw.id,
    name: raw.name,
    years: '',
    status: 'archived',
    edition: 'founders',
    platform: 'spike',
    todo: raw.todo,
    field: raw.field,
    launchAreas: areas.map((a) => ({
      id: a.id,
      name: a.name,
      x: num(a.x) + num(a.width) / 2,
      y: num(a.y) + num(a.height) / 2,
      rotationDeg: 0,
      shape: { kind: 'rect', width: num(a.width, 300), height: num(a.height, 300) },
      start: a.start,
    })),
    forbiddenZones: [],
    missions: missions.map((m, i) => ({
      id: m.id,
      number: i + 1,
      name: m.name,
      x: m.x,
      y: m.y,
      // The model frame's +x is the direction the robot faced, so it stands behind the model.
      rotationDeg: num(m.headingDeg),
      outline: { kind: 'rect', width: 120, height: 120 },
      actionZone: { dx: -num(m.approachMm, 120), dy: 0, rotationDeg: 0, shape: { kind: 'rect', width: 150, height: 150 } },
      points: m.points,
      action: m.action,
      notes: m.notes,
      plan: { headingDeg: num(m.headingDeg), actionMm: num(m.actionMm, 60), attachmentDeg: num(m.attachmentDeg, 90), via: Array.isArray(m.via) ? m.via : [] },
      todo: m.todo,
    })),
  }
}

export type SeasonParseResult = { ok: true; season: Season; migrated: boolean } | { ok: false; error: string }

/** Validates season JSON, migrating older schema versions first. */
export function safeParseSeason(raw: unknown): SeasonParseResult {
  if (!isObj(raw)) return { ok: false, error: 'season must be a JSON object' }
  const version = raw.schemaVersion ?? 1
  const migrated = version === 1
  const input = migrated ? migrateV1(raw) : raw
  const parsed = seasonSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: z.prettifyError(parsed.error) }
  const season = parsed.data
  for (const [label, list] of [
    ['mission', season.missions],
    ['launch area', season.launchAreas],
    ['forbidden zone', season.forbiddenZones],
  ] as const) {
    const ids = list.map((x) => x.id)
    const dupe = ids.find((id, i) => ids.indexOf(id) !== i)
    if (dupe) return { ok: false, error: `duplicate ${label} id ${dupe}` }
  }
  return { ok: true, season, migrated }
}

export function parseSeason(raw: unknown): Season {
  const r = safeParseSeason(raw)
  if (!r.ok) throw new Error(`Invalid season data: ${r.error}`)
  return r.season
}
