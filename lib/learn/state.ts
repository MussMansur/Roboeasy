/**
 * The learner's state: a profile and an append-only event log, kept in this
 * browser until accounts exist. Everything else (XP, streak, skills,
 * achievements) is computed from the events, so replays are idempotent:
 * an event id that already exists is ignored.
 */

import { z } from 'zod'

import { SKILLS } from './schema'

export const AGE_RANGES = ['under-10', '10-12', '13-15', '16-plus'] as const
export type AgeRange = (typeof AGE_RANGES)[number]

export const profileSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  ageRange: z.enum(AGE_RANGES),
  timezone: z.string().min(1),
  /** Daily goal: number of lessons, or minutes of practice. */
  goal: z.discriminatedUnion('kind', [z.object({ kind: z.literal('lessons'), n: z.union([z.literal(1), z.literal(2)]) }), z.object({ kind: z.literal('minutes'), n: z.literal(15) })]),
  skipWeekends: z.boolean().default(false),
  reminders: z.object({ enabled: z.boolean(), time: z.string().regex(/^\d{2}:\d{2}$/) }).default({ enabled: false, time: '18:00' }),
  cosmetics: z.object({ color: z.string().default('sun'), sticker: z.string().default('none'), wheels: z.string().default('classic'), sound: z.string().default('beep') }).default({ color: 'sun', sticker: 'none', wheels: 'classic', sound: 'beep' }),
  /** Grown-up confirmed for under-16 learners (see docs/privacy.md). */
  parentConsent: z.boolean().default(false),
  createdAt: z.number(),
  /** Anonymous id for A/B buckets and, later, linking to an account. */
  anonId: z.string().min(8),
  tour: z.boolean().default(false),
})
export type Profile = z.infer<typeof profileSchema>

const skill = z.enum(SKILLS)

export const eventSchema = z.discriminatedUnion('kind', [
  /** A step finished. `firstTry`: solved without failed checks or hints. */
  z.object({ id: z.string(), at: z.number(), kind: z.literal('step_done'), lesson: z.string(), step: z.string(), stepType: z.string(), firstTry: z.boolean(), hints: z.number().int().nonnegative(), blocks: z.number().optional(), referenceBlocks: z.number().optional(), skill: skill.optional() }),
  /** A failed check or a wrong answer (feeds review and the "where students get stuck" stats). */
  z.object({ id: z.string(), at: z.number(), kind: z.literal('mistake'), lesson: z.string(), step: z.string(), skill: skill.optional() }),
  z.object({ id: z.string(), at: z.number(), kind: z.literal('lesson_done'), lesson: z.string(), track: z.string(), unit: z.string(), project: z.boolean(), seconds: z.number().nonnegative() }),
  z.object({ id: z.string(), at: z.number(), kind: z.literal('real_robot'), lesson: z.string(), step: z.string() }),
  /** Active practice time (for the "15 minutes a day" goal). */
  z.object({ id: z.string(), at: z.number(), kind: z.literal('time'), seconds: z.number().nonnegative() }),
  /** Lessons and units marked as known (placement or "I know this" test). */
  z.object({ id: z.string(), at: z.number(), kind: z.literal('known'), lessons: z.array(z.string()), skills: z.array(skill) }),
  z.object({ id: z.string(), at: z.number(), kind: z.literal('review_done'), skills: z.array(skill), correct: z.number().int(), total: z.number().int() }),
  z.object({ id: z.string(), at: z.number(), kind: z.literal('challenge_done'), week: z.string() }),
  z.object({ id: z.string(), at: z.number(), kind: z.literal('certificate'), track: z.string(), code: z.string() }),
])
export type LearnEvent = z.infer<typeof eventSchema>
export type EventKind = LearnEvent['kind']

export const stateSchema = z.object({
  version: z.literal(1),
  profile: profileSchema.nullable(),
  events: z.array(eventSchema),
})
export type LearnState = z.infer<typeof stateSchema>

export const EMPTY_STATE: LearnState = { version: 1, profile: null, events: [] }

/** Distributes Omit over the union, so each event kind keeps its own fields. */
export type NewEvent = LearnEvent extends infer E ? (E extends LearnEvent ? Omit<E, 'id' | 'at'> & { id?: string; at?: number } : never) : never

export function randomId(prefix = 'e'): string {
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Stable ids make the "earn once" events idempotent: completing a lesson
 * twice is still one `lesson_done`.
 */
export function eventId(e: NewEvent): string {
  switch (e.kind) {
    case 'step_done':
      return `step:${e.lesson}:${e.step}`
    case 'lesson_done':
      return `lesson:${e.lesson}`
    case 'real_robot':
      return `robot:${e.lesson}:${e.step}`
    case 'challenge_done':
      return `challenge:${e.week}`
    case 'certificate':
      return `cert:${e.track}`
    default:
      return randomId(e.kind)
  }
}

/** Appends events; ids that already exist are ignored (idempotent). */
export function appendEvents(state: LearnState, events: NewEvent[], now = Date.now()): LearnState {
  const seen = new Set(state.events.map((e) => e.id))
  const added: LearnEvent[] = []
  for (const e of events) {
    const id = e.id ?? eventId(e)
    if (seen.has(id)) continue
    seen.add(id)
    added.push({ ...e, id, at: e.at ?? now } as LearnEvent)
  }
  return added.length ? { ...state, events: [...state.events, ...added] } : state
}

export function parseState(raw: unknown): LearnState {
  const r = stateSchema.safeParse(raw)
  return r.success ? r.data : EMPTY_STATE
}

export function completedLessons(state: LearnState): Set<string> {
  const done = new Set<string>()
  for (const e of state.events) {
    if (e.kind === 'lesson_done') done.add(e.lesson)
    if (e.kind === 'known') e.lessons.forEach((l) => done.add(l))
  }
  return done
}

export function doneSteps(state: LearnState, lesson: string): Set<string> {
  return new Set(state.events.filter((e) => e.kind === 'step_done' && e.lesson === lesson).map((e) => (e.kind === 'step_done' ? e.step : '')))
}
