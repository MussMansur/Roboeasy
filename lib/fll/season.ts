/**
 * FLL season data: the field, the launch areas and the missions.
 *
 * Coordinates are in millimetres from the bottom-left corner of the mat
 * (x to the right, y away from the team's side). Headings are in degrees,
 * 0 = +x (right), 90 = +y, counterclockwise positive.
 */

import { z } from 'zod'

export const MISSION_ACTIONS = ['push', 'pull', 'lift', 'deliver', 'collect', 'flip'] as const
export type MissionAction = (typeof MISSION_ACTIONS)[number]

/** Text in every UI language (Kazakh falls back to Russian when missing). */
const localized = z.object({ ru: z.string(), en: z.string(), kk: z.string().optional() })
export type Localized = z.infer<typeof localized>

const point = z.object({ x: z.number(), y: z.number() })
export type Point = z.infer<typeof point>

const pose = point.extend({ headingDeg: z.number() })
export type Pose = z.infer<typeof pose>

const launchArea = z.object({
  id: z.string().min(1),
  name: localized,
  /** Rectangle of the area (bottom-left corner + size). */
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  /** Where the robot's center starts and which way it faces. */
  start: pose,
  todo: z.boolean().optional(),
})
export type LaunchArea = z.infer<typeof launchArea>

const mission = z.object({
  id: z.string().min(1),
  name: localized,
  /** Position of the mission model. */
  x: z.number(),
  y: z.number(),
  /** Direction the robot faces while doing the action. */
  headingDeg: z.number(),
  points: z.number().int().nonnegative(),
  action: z.enum(MISSION_ACTIONS),
  /** Distance from the model at which the robot's center stops before the action. */
  approachMm: z.number().nonnegative().default(120),
  /** How far the robot drives during the action (push, pull, deliver, collect). */
  actionMm: z.number().nonnegative().default(60),
  /** Attachment motor travel for lift/pull/flip/deliver/collect, in degrees. */
  attachmentDeg: z.number().positive().default(90),
  /** Intermediate points to drive around other models. */
  via: z.array(point).default([]),
  notes: localized.optional(),
  todo: z.boolean().optional(),
})
export type Mission = z.infer<typeof mission>

export const seasonSchema = z.object({
  id: z.string().min(1),
  name: localized,
  todo: z.string().optional(),
  field: z.object({ widthMm: z.number().positive(), heightMm: z.number().positive() }),
  launchAreas: z.array(launchArea).min(1),
  missions: z.array(mission),
})
export type Season = z.infer<typeof seasonSchema>

export function localize(text: Localized | undefined, lang: 'ru' | 'kk' | 'en'): string {
  if (!text) return ''
  return lang === 'kk' ? (text.kk ?? text.ru) : text[lang]
}

export function parseSeason(raw: unknown): Season {
  const parsed = seasonSchema.safeParse(raw)
  if (!parsed.success) throw new Error(`Invalid season data: ${z.prettifyError(parsed.error)}`)
  const season = parsed.data
  const ids = new Set<string>()
  for (const m of season.missions) {
    if (ids.has(m.id)) throw new Error(`Invalid season data: duplicate mission id ${m.id}`)
    ids.add(m.id)
  }
  return season
}
