/**
 * Experience points and levels, computed from the event log. Each event is
 * counted once (ids are unique), so XP cannot grow by repeating a lesson.
 * The same rules will run on the server once accounts exist.
 */

import type { LearnEvent, LearnState } from './state'

export const XP_RULES = {
  lesson: 10,
  /** Extra for a code/debug/predict/quiz step solved first try without hints. */
  firstTry: 2,
  project: 20,
  review: 5,
  realRobot: 10,
  challenge: 25,
} as const

export function xpForEvent(e: LearnEvent): number {
  switch (e.kind) {
    case 'lesson_done':
      return XP_RULES.lesson + (e.project ? XP_RULES.project : 0)
    case 'step_done':
      return e.firstTry && e.hints === 0 && ['code', 'debug', 'predict', 'quiz', 'project'].includes(e.stepType) ? XP_RULES.firstTry : 0
    case 'review_done':
      return XP_RULES.review
    case 'real_robot':
      return XP_RULES.realRobot
    case 'challenge_done':
      return XP_RULES.challenge
    default:
      return 0
  }
}

export function totalXp(state: LearnState): number {
  const seen = new Set<string>()
  let xp = 0
  for (const e of state.events) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    xp += xpForEvent(e)
  }
  return xp
}

export const LEVELS = [
  { min: 0, title: { ru: 'Новичок', kk: 'Жаңадан бастаушы', en: 'Beginner' } },
  { min: 100, title: { ru: 'Конструктор', kk: 'Құрастырушы', en: 'Builder' } },
  { min: 300, title: { ru: 'Программист', kk: 'Бағдарламашы', en: 'Programmer' } },
  { min: 700, title: { ru: 'Инженер', kk: 'Инженер', en: 'Engineer' } },
  { min: 1500, title: { ru: 'Капитан команды', kk: 'Команда капитаны', en: 'Team captain' } },
] as const

export interface LevelInfo {
  index: number
  title: { ru: string; kk: string; en: string }
  xp: number
  /** XP at the start of this level and of the next one (null at the top). */
  from: number
  to: number | null
  progress: number
}

export function levelFor(xp: number): LevelInfo {
  let index = 0
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) index = i
  const from = LEVELS[index].min
  const to = index + 1 < LEVELS.length ? LEVELS[index + 1].min : null
  return { index, title: LEVELS[index].title, xp, from, to, progress: to === null ? 1 : (xp - from) / (to - from) }
}
