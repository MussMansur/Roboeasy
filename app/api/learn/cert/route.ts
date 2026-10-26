import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { issueCode } from '@/lib/learn/certificate'
import { COURSE } from '@/lib/learn/course'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const requestSchema = z.object({
  track: z.string().max(40),
  nickname: z.string().trim().min(1).max(24),
  /** Lessons done in this browser; must cover every ready lesson of the track. */
  lessons: z.array(z.string().max(40)).max(400),
  /** The learner's local date, YYYY-MM-DD (the server's date is used if it is far off). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/** Issues a signed certificate code for a finished track (see lib/learn/certificate.ts). */
export async function POST(req: NextRequest) {
  const limit = rateLimit(`cert:${clientKey(req.headers)}`, 10, 60_000)
  if (!limit.ok) return Response.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  const text = await req.text()
  if (text.length > 16_000) return Response.json({ ok: false, error: 'bad_request' }, { status: 413 })
  let parsed
  try {
    parsed = requestSchema.safeParse(JSON.parse(text))
  } catch {
    return Response.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
  if (!parsed.success) return Response.json({ ok: false, error: 'bad_request' }, { status: 400 })
  const { track: trackId, nickname, lessons, date } = parsed.data
  const track = COURSE.tracks.find((t) => t.id === trackId)
  const ready = track?.units.flatMap((u) => u.lessons.filter((l) => l.status === 'ready').map((l) => l.id)) ?? []
  const done = new Set(lessons)
  if (!track || ready.length === 0 || !ready.every((id) => done.has(id))) return Response.json({ ok: false, error: 'not_complete' }, { status: 400 })

  const today = Date.now()
  const day = Math.abs(Date.parse(`${date}T12:00:00Z`) - today) < 2 * 86400_000 ? date : new Date(today).toISOString().slice(0, 10)
  const code = issueCode({ v: 1, n: nickname, t: track.id, d: day, l: ready.length })
  if (!code) return Response.json({ ok: false, error: 'unavailable' }, { status: 503 })
  return Response.json({ ok: true, code })
}
