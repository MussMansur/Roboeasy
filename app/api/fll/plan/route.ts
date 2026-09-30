import type { NextRequest } from 'next/server'

import { parseRobot } from '@/lib/dsl/schema'
import { askGemini, createGemini, retryMessage } from '@/lib/gemini'
import { type Lang, MAX_SELECTED, type PlanNotice, type PlanResponse, fallbackPlan, parsePlan, planJsonSchema, planSystemPrompt, planUserMessage } from '@/lib/fll/plan'
import { getSeason } from '@/lib/fll/seasons'
import { clientKey, rateLimit } from '@/lib/rate-limit'

export const maxDuration = 60

const TOTAL_TIMEOUT_MS = 55_000
const MAX_BODY_BYTES = 32_000
const RATE_LIMIT = { requests: 6, windowMs: 60_000 }

function reply(body: PlanResponse, status = 200) {
  return Response.json(body, { status })
}

export async function POST(req: NextRequest) {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return reply({ ok: false, error: 'bad_request' }, 413)
  let body: Record<string, unknown>
  try {
    const raw: unknown = await req.json()
    if (typeof raw !== 'object' || raw === null) throw new Error('not an object')
    body = raw as Record<string, unknown>
  } catch {
    return reply({ ok: false, error: 'bad_request' }, 400)
  }

  const season = typeof body.seasonId === 'string' ? getSeason(body.seasonId) : null
  const lang: Lang = body.lang === 'kk' || body.lang === 'en' ? body.lang : 'ru'
  const known = new Set(season?.missions.map((m) => m.id))
  const missionIds = Array.isArray(body.missionIds) ? [...new Set(body.missionIds.filter((id): id is string => typeof id === 'string' && known.has(id)))] : []
  if (!season || !missionIds.length || missionIds.length > MAX_SELECTED) return reply({ ok: false, error: 'bad_request' }, 400)
  const robot = parseRobot(body.robot)

  const limit = rateLimit(`fll:${clientKey(req.headers)}`, RATE_LIMIT.requests, RATE_LIMIT.windowMs)
  if (!limit.ok) return reply({ ok: false, error: 'rate_limited', retryAfter: limit.retryAfterSeconds }, 429)

  const fallback = (notice: PlanNotice) => reply({ ok: true, plan: fallbackPlan(season, missionIds, robot, lang), source: 'fallback', notice })

  const ai = createGemini()
  if (!ai) return fallback('not_configured')

  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(TOTAL_TIMEOUT_MS)])
  const system = planSystemPrompt(lang)
  const message = planUserMessage(season, missionIds, robot, lang)
  const schema = planJsonSchema(season, missionIds)
  try {
    let parsed = parsePlan(await askGemini(ai, system, message, schema, signal), season, missionIds)
    if (!parsed.ok) {
      console.warn('[fll] invalid plan, retrying:', parsed.error)
      parsed = parsePlan(await askGemini(ai, system, retryMessage(message, parsed.error), schema, signal), season, missionIds)
    }
    if (!parsed.ok) {
      console.error('[fll] invalid plan after retry:', parsed.error)
      return fallback('ai_failed')
    }
    return reply({ ok: true, plan: parsed.plan, source: 'ai' })
  } catch (error) {
    console.error('[fll] plan failed:', error instanceof Error ? error.message : error)
    return fallback('ai_busy')
  }
}
