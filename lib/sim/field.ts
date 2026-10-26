/**
 * Lesson fields for the 2D simulator: a flat mat with drawn lines, coloured
 * zones, walls and named points. Units: mm from the bottom-left corner,
 * angles in degrees (0 = +x, counterclockwise), like the FLL seasons.
 */

import { z } from 'zod'

import { SENSOR_COLORS } from '../dsl/types'

const COLORS = Object.keys(SENSOR_COLORS) as [keyof typeof SENSOR_COLORS, ...(keyof typeof SENSOR_COLORS)[]]
export const sensorColor = z.enum(COLORS)

const localized = z.object({ ru: z.string(), kk: z.string(), en: z.string() })

/** An axis-aligned rectangle given by its bottom-left corner. */
const rect = z.object({ x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() })

export const fieldSchema = z.object({
  width: z.number().positive().max(5000),
  height: z.number().positive().max(5000),
  /** Robot start: centre between the wheels and heading. */
  start: z.object({ x: z.number(), y: z.number(), heading: z.number() }),
  /** Walls around the mat (the robot cannot leave it). */
  border: z.boolean().default(true),
  /** Tape lines the colour sensor sees. */
  lines: z.array(z.object({ points: z.array(z.tuple([z.number(), z.number()])).min(2), width: z.number().positive().default(20), color: sensorColor.default('black') })).default([]),
  /** Coloured areas (paint) and named areas used by checks (targets). */
  zones: z
    .array(
      rect.extend({
        id: z.string().min(1),
        kind: z.enum(['target', 'paint', 'start']).default('target'),
        color: sensorColor.optional(),
        label: localized.optional(),
      }),
    )
    .default([]),
  walls: z.array(rect).default([]),
  /** Waypoints for "drive through" checks. */
  points: z.array(z.object({ id: z.string().min(1), x: z.number(), y: z.number(), r: z.number().positive().default(60), label: localized.optional() })).default([]),
})

export type SimField = z.infer<typeof fieldSchema>
export type FieldInput = z.input<typeof fieldSchema>
export type Rect = z.infer<typeof rect>

export { ROBOT_SHAPE } from './robot'

export function parseField(raw: unknown): SimField {
  return fieldSchema.parse(raw)
}
