/**
 * Best-effort in-memory rate limiter (sliding window per key).
 * On serverless platforms each instance keeps its own counters, so this
 * protects against bursts from one client, not against distributed abuse.
 */

/** Each bucket remembers its own window, so minute and day limits can share the map. */
const buckets = new Map<string, { hits: number[]; windowMs: number }>()
let lastSweep = Date.now()

export interface RateLimitResult {
  ok: boolean
  retryAfterSeconds: number
  /** Requests left in the window after this one. */
  remaining: number
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (!b.hits.length || now - b.hits[b.hits.length - 1] > b.windowMs) buckets.delete(k)
    lastSweep = now
  }
  const hits = (buckets.get(key)?.hits ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, { hits, windowMs })
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)), remaining: 0 }
  }
  hits.push(now)
  buckets.set(key, { hits, windowMs })
  return { ok: true, retryAfterSeconds: 0, remaining: limit - hits.length }
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers.get('x-real-ip') || 'local'
}
