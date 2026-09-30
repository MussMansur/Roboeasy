import { describe, expect, it } from 'vitest'

import { matchLocale } from '../lib/i18n/config'
import { rateLimit } from '../lib/rate-limit'

describe('rateLimit', () => {
  it('allows bursts up to the limit, then asks to wait', () => {
    const key = `test-${Math.random()}`
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000, 1_000 + i).ok).toBe(true)
    expect(rateLimit(key, 3, 60_000, 2_000)).toEqual({ ok: false, retryAfterSeconds: 59 })
    expect(rateLimit(key, 3, 60_000, 61_001).ok).toBe(true)
  })
})

describe('matchLocale', () => {
  it('picks the best supported language', () => {
    expect(matchLocale('kk-KZ,ru;q=0.9')).toBe('kk')
    expect(matchLocale('en-US,en;q=0.9,ru;q=0.8')).toBe('en')
    expect(matchLocale('de-DE,ru;q=0.5')).toBe('ru')
    expect(matchLocale('fr')).toBe('ru')
    expect(matchLocale(null)).toBe('ru')
  })
})
