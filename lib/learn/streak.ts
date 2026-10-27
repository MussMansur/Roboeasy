/**
 * Daily goal and streak, in the learner's own time zone.
 *
 * - A day counts when the daily goal is met: 1 or 2 lessons (a review counts
 *   as a lesson) or 15 minutes of practice.
 * - Every 7 counted days in a row earn a freeze (at most 2, more with the
 *   battery upgrade). A missed day
 *   uses a freeze instead of ending the streak.
 * - With "skip weekends", Saturday and Sunday never break a streak (they
 *   still count when the goal is met).
 * - Today is never a missed day: it is not over yet.
 */

import type { LearnState, Profile } from './state'

export const MAX_FREEZES = 2
export const DEFAULT_GOAL: Profile['goal'] = { kind: 'lessons', n: 1 }
export const FREEZE_EVERY = 7

export type DayStatus = 'met' | 'frozen' | 'missed' | 'rest' | 'today'

export interface StreakInfo {
  current: number
  best: number
  freezes: number
  today: { key: string; lessons: number; minutes: number; met: boolean; progress: number }
  /** Status of every day from the first activity until today. */
  days: Map<string, DayStatus>
}

/** YYYY-MM-DD of a moment in a time zone (invalid zones fall back to UTC). */
export function dayKey(at: number, timeZone: string): string {
  return dayKeyer(timeZone)(at)
}

/** dayKey with the formatter made once (for loops over the whole log). */
export function dayKeyer(timeZone: string): (at: number) => string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    return (at) => fmt.format(at)
  } catch {
    return (at) => new Date(at).toISOString().slice(0, 10)
  }
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function isWeekend(key: string): boolean {
  const wd = new Date(`${key}T00:00:00Z`).getUTCDay()
  return wd === 0 || wd === 6
}

type Goal = Profile['goal']

export function dailyActivity(state: LearnState, timeZone: string): Map<string, { lessons: number; seconds: number }> {
  const days = new Map<string, { lessons: number; seconds: number }>()
  const keyOf = dayKeyer(timeZone)
  const day = (at: number) => {
    const key = keyOf(at)
    let d = days.get(key)
    if (!d) days.set(key, (d = { lessons: 0, seconds: 0 }))
    return d
  }
  for (const e of state.events) {
    if (e.kind === 'lesson_done' || e.kind === 'review_done') day(e.at).lessons++
    if (e.kind === 'time') day(e.at).seconds += e.seconds
  }
  return days
}

export function goalProgress(goal: Goal, a: { lessons: number; seconds: number } | undefined): number {
  if (!a) return 0
  return goal.kind === 'lessons' ? Math.min(1, a.lessons / goal.n) : Math.min(1, a.seconds / 60 / goal.n)
}

/** `maxFreezes`: 2, more with the battery upgrade (lib/learn/shop.ts). */
export function streakInfo(state: LearnState, now = Date.now(), maxFreezes = MAX_FREEZES): StreakInfo {
  const profile = state.profile
  const tz = profile?.timezone ?? 'UTC'
  const goal = profile?.goal ?? DEFAULT_GOAL
  const skipWeekends = profile?.skipWeekends ?? false
  const activity = dailyActivity(state, tz)
  const todayKey = dayKey(now, tz)
  const todayActivity = activity.get(todayKey)
  const todayProgress = goalProgress(goal, todayActivity)
  const today = {
    key: todayKey,
    lessons: todayActivity?.lessons ?? 0,
    minutes: Math.floor((todayActivity?.seconds ?? 0) / 60),
    met: todayProgress >= 1,
    progress: todayProgress,
  }

  const days = new Map<string, DayStatus>()
  const keys = [...activity.keys()].filter((k) => k <= todayKey).sort()
  let current = 0
  let best = 0
  let freezes = 0
  if (keys.length) {
    for (let key = keys[0]; key <= todayKey; key = addDays(key, 1)) {
      const met = goalProgress(goal, activity.get(key)) >= 1
      if (met) {
        current++
        best = Math.max(best, current)
        if (current % FREEZE_EVERY === 0) freezes = Math.min(maxFreezes, freezes + 1)
        days.set(key, 'met')
      } else if (key === todayKey) days.set(key, 'today')
      else if (skipWeekends && isWeekend(key)) days.set(key, 'rest')
      else if (current > 0 && freezes > 0) {
        freezes--
        days.set(key, 'frozen')
      } else {
        current = 0
        days.set(key, 'missed')
      }
    }
  }
  return { current, best, freezes, today, days }
}

/** The ISO week of a day key, like 2026-W43 (weekly challenges). */
export function isoWeek(key: string): string {
  const d = new Date(`${key}T00:00:00Z`)
  const wd = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - wd)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Which weekly challenge a week gets (the list repeats). */
export function challengeIndex(week: string, count: number): number {
  const m = /^(\d{4})-W(\d{2})$/.exec(week)
  if (!m || count <= 0) return 0
  return (Number(m[1]) * 53 + Number(m[2])) % count
}

/** The device's time zone, for a new profile. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
