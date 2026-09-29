/**
 * Best-effort in-memory rate limiter (sliding window per key).
 * On serverless platforms each instance keeps its own counters, so this
 * protects against bursts from one client, not against distributed abuse.
 */

const buckets = new Map<string, number[]>()
let lastSweep = Date.now()

export interface RateLimitResult {
  ok: boolean
  retryAfterSeconds: number
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (now - lastSweep > 60_000) {
    for (const [k, hits] of buckets) if (!hits.length || now - hits[hits.length - 1] > windowMs) buckets.delete(k)
    lastSweep = now
  }
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) }
  }
  hits.push(now)
  buckets.set(key, hits)
  return { ok: true, retryAfterSeconds: 0 }
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers.get('x-real-ip') || 'local'
}
