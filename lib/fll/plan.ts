/**
 * FLL run planning. The AI decides the strategy (which missions go in which
 * run, their order, the launch area and the attachment); this module
 * validates that decision and provides a simple deterministic plan when the
 * AI is unavailable. Geometry is never taken from the AI (see path.ts).
 */

import { z } from 'zod'

import { PORTS, type RobotProfile } from '../dsl/types'
import type { FllPlan, PlannedRun } from './run'
import { NEEDS_ATTACHMENT, approachPoint } from './path'
import { type Season, localize } from './season'

export type Lang = 'ru' | 'kk' | 'en'

/** Why a fallback plan was returned instead of the AI's. */
export type PlanNotice = 'not_configured' | 'ai_busy' | 'ai_failed'

export type PlanResponse =
  | { ok: true; plan: FllPlan; source: 'ai' | 'fallback'; notice?: PlanNotice }
  | { ok: false; error: 'bad_request' | 'rate_limited'; retryAfter?: number }

const LANG_NAME: Record<Lang, string> = { ru: 'Russian', kk: 'Kazakh', en: 'English' }
export const MAX_SELECTED = 30

/** JSON Schema for Gemini with the actual mission and launch area ids as enums. */
export function planJsonSchema(season: Season, missionIds: string[]): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      runs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            launchAreaId: { type: 'string', enum: season.launchAreas.map((a) => a.id) },
            missions: {
              type: 'array',
              items: {
                type: 'object',
                properties: { id: { type: 'string', enum: missionIds }, attachment: { type: 'string', enum: [...PORTS] } },
                required: ['id'],
              },
            },
            explanation: { type: 'string' },
          },
          required: ['name', 'launchAreaId', 'missions', 'explanation'],
        },
      },
      tips: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'runs', 'tips'],
  }
}

const text = (max: number) => z.string().transform((s) => s.replace(/\s+/g, ' ').trim().slice(0, max))

/** Validates the AI plan: known ids only, every selected mission exactly once. */
export function parsePlan(raw: unknown, season: Season, missionIds: string[]): { ok: true; plan: FllPlan } | { ok: false; error: string } {
  const selected = z.enum(missionIds as [string, ...string[]])
  const schema = z
    .object({
      summary: text(600),
      runs: z
        .array(
          z.object({
            name: text(60),
            launchAreaId: z.enum(season.launchAreas.map((a) => a.id) as [string, ...string[]]),
            missions: z.array(z.object({ id: selected, attachment: z.enum(PORTS).optional() })).min(1),
            explanation: text(600),
          }),
        )
        .min(1)
        .max(8),
      tips: z.array(text(300)).max(6),
    })
    .superRefine((plan, ctx) => {
      const seen = plan.runs.flatMap((r) => r.missions.map((m) => m.id))
      const dupes = seen.filter((id, i) => seen.indexOf(id) !== i)
      if (dupes.length) ctx.addIssue({ code: 'custom', path: ['runs'], message: `missions used more than once: ${[...new Set(dupes)].join(', ')}` })
      const missing = missionIds.filter((id) => !seen.includes(id))
      if (missing.length) ctx.addIssue({ code: 'custom', path: ['runs'], message: `missions not planned: ${missing.join(', ')}` })
    })
  const parsed = schema.safeParse(raw)
  return parsed.success ? { ok: true, plan: parsed.data } : { ok: false, error: z.prettifyError(parsed.error).slice(0, 1500) }
}

export function planSystemPrompt(lang: Lang): string {
  return `You are a coach helping a FIRST LEGO League (FLL) team plan robot runs for the Robot Game.
You decide the STRATEGY only. RoboEasy computes all distances, angles and paths from the field coordinates, so never give numbers for driving.

Decide:
- how to group the selected missions into runs (a run leaves a launch area and returns; usually 2-4 missions per run, 1-6 runs),
- the launch area of each run (the one closest to its missions),
- the order of missions in a run: short paths, no zig-zag across the field, finish near home,
- for missions whose action is pull, lift, deliver, collect or flip: the attachment port from the robot's attachments (omit "attachment" if the robot has none).

Explain each run in 1-3 sentences in ${LANG_NAME[lang]}: why these missions go together, why this order, what the team should test first.
"tips": 2-4 short coaching questions or suggestions in ${LANG_NAME[lang]} (alternatives to try, risks, what to measure). The team makes the final decisions and builds the robot themselves; talk to them as a helpful coach, not as someone who does the work for them.
"summary": 1-2 sentences in ${LANG_NAME[lang]}.
Use every selected mission exactly once. Answer with JSON only.`
}

export function planUserMessage(season: Season, missionIds: string[], robot: RobotProfile, lang: Lang): string {
  const data = {
    field: season.field,
    launchAreas: season.launchAreas.map((a) => ({ id: a.id, name: localize(a.name, lang), start: a.start })),
    missions: season.missions
      .filter((m) => missionIds.includes(m.id))
      .map((m) => ({ id: m.id, name: localize(m.name, lang), x: m.x, y: m.y, headingDeg: m.headingDeg, points: m.points, action: m.action, notes: localize(m.notes, lang) })),
    robot: { attachments: robot.attachments, driveMotors: [robot.leftMotor, robot.rightMotor] },
  }
  return `Coordinates are in mm from the bottom-left corner of the mat.\n${JSON.stringify(data)}`
}

// ---------------------------------------------------------------------------
// Fallback: a simple plan without the AI
// ---------------------------------------------------------------------------

const FALLBACK_TEXT: Record<Lang, { run: string; summary: string; explanation: string; tips: string[] }> = {
  ru: {
    run: 'Заезд',
    summary: 'Простой план без ИИ: миссии отнесены к ближайшей зоне старта и упорядочены по расстоянию.',
    explanation: 'Миссии рядом друг с другом, порядок — от ближней к дальней. Проверьте, не задевает ли маршрут модели на поле.',
    tips: ['Какие миссии дают больше всего очков за время заезда?', 'Можно ли объединить соседние заезды, чтобы сэкономить время на смене насадок?'],
  },
  kk: {
    run: 'Заезд',
    summary: 'ЖИ-сіз қарапайым жоспар: миссиялар ең жақын старт аймағына бөлінді және қашықтық бойынша реттелді.',
    explanation: 'Миссиялар бір-біріне жақын, реті — жақыннан алысқа. Маршрут алаңдағы модельдерге тимейтінін тексеріңіз.',
    tips: ['Қай миссиялар заезд уақытына шаққанда ең көп ұпай береді?', 'Саптаманы ауыстыру уақытын үнемдеу үшін көрші заездерді біріктіруге бола ма?'],
  },
  en: {
    run: 'Run',
    summary: 'A simple plan without the AI: missions go to the nearest launch area, ordered by distance.',
    explanation: 'Missions close to each other, from the nearest to the farthest. Check that the route does not hit models on the field.',
    tips: ['Which missions give the most points for the time they take?', 'Could neighbouring runs be merged to save time on attachment changes?'],
  },
}

const MAX_PER_RUN = 3

export function fallbackPlan(season: Season, missionIds: string[], robot: RobotProfile, lang: Lang): FllPlan {
  const t = FALLBACK_TEXT[lang]
  const missions = season.missions.filter((m) => missionIds.includes(m.id))
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

  const runs: PlannedRun[] = []
  for (const area of season.launchAreas) {
    // Missions whose approach point is closest to this launch area.
    let left = missions.filter((m) => {
      const p = approachPoint(m)
      const nearest = season.launchAreas.reduce((best, a) => (dist(a.start, p) < dist(best.start, p) ? a : best))
      return nearest.id === area.id
    })
    while (left.length) {
      const chunk: typeof missions = []
      let from: { x: number; y: number } = area.start
      while (left.length && chunk.length < MAX_PER_RUN) {
        const next = left.reduce((best, m) => (dist(from, approachPoint(m)) < dist(from, approachPoint(best)) ? m : best))
        chunk.push(next)
        from = approachPoint(next)
        left = left.filter((m) => m !== next)
      }
      runs.push({
        name: `${t.run} ${runs.length + 1}`,
        launchAreaId: area.id,
        missions: chunk.map((m) => ({ id: m.id, attachment: NEEDS_ATTACHMENT.has(m.action) ? robot.attachments[0]?.port : undefined })),
        explanation: t.explanation,
      })
    }
  }
  return { summary: t.summary, runs, tips: t.tips }
}
