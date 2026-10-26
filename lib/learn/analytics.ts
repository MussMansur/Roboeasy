/**
 * Learning analytics computed from event logs: the lesson funnel and where
 * learners get stuck. Pure functions over events, so the same code works on
 * one browser's log today and on all learners' rows once the database
 * exists (TODO(db): feed it server events, grouped by learner).
 */

import type { LearnEvent } from './state'

export interface LessonFunnel {
  lesson: string
  /** Learners (logs) that started / finished the lesson. */
  started: number
  finished: number
  /** Learners that reached each step (by step id, in first-seen order). */
  steps: { step: string; reached: number; mistakes: number; hints: number }[]
  /** Median seconds to finish. */
  medianSeconds: number | null
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** `logs`: one event list per learner. */
export function lessonFunnels(logs: LearnEvent[][]): LessonFunnel[] {
  const map = new Map<string, { started: Set<number>; finished: Set<number>; seconds: number[]; steps: Map<string, { reached: Set<number>; mistakes: number; hints: number }> }>()
  const get = (lesson: string) => {
    let f = map.get(lesson)
    if (!f) map.set(lesson, (f = { started: new Set(), finished: new Set(), seconds: [], steps: new Map() }))
    return f
  }
  const step = (f: ReturnType<typeof get>, id: string) => {
    let s = f.steps.get(id)
    if (!s) f.steps.set(id, (s = { reached: new Set(), mistakes: 0, hints: 0 }))
    return s
  }
  logs.forEach((events, who) => {
    for (const e of events) {
      if (e.kind === 'lesson_start') get(e.lesson).started.add(who)
      if (e.kind === 'lesson_done') {
        const f = get(e.lesson)
        f.started.add(who)
        if (!f.finished.has(who)) f.seconds.push(e.seconds)
        f.finished.add(who)
      }
      if (e.kind === 'step_done') {
        const s = step(get(e.lesson), e.step)
        s.reached.add(who)
        s.hints += e.hints
      }
      if (e.kind === 'mistake') {
        const s = step(get(e.lesson), e.step)
        s.reached.add(who)
        s.mistakes++
      }
    }
  })
  return [...map.entries()]
    .filter(([lesson]) => !lesson.startsWith('challenge-'))
    .map(([lesson, f]) => ({
      lesson,
      started: f.started.size,
      finished: f.finished.size,
      steps: [...f.steps.entries()].map(([id, s]) => ({ step: id, reached: s.reached.size, mistakes: s.mistakes, hints: s.hints })),
      medianSeconds: median(f.seconds),
    }))
}

/** Steps with the most mistakes per learner who reached them ("where students get stuck"). */
export function stuckPoints(funnels: LessonFunnel[], limit = 5): { lesson: string; step: string; mistakesPerLearner: number }[] {
  return funnels
    .flatMap((f) => f.steps.filter((s) => s.reached > 0).map((s) => ({ lesson: f.lesson, step: s.step, mistakesPerLearner: s.mistakes / s.reached })))
    .filter((s) => s.mistakesPerLearner > 0)
    .sort((a, b) => b.mistakesPerLearner - a.mistakesPerLearner)
    .slice(0, limit)
}
