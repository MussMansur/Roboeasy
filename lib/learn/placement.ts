/**
 * Placement test: 11 questions in three levels. A level counts when at most
 * one answer in it is wrong and the levels before it counted; its lessons
 * are then marked as known (event `known`). Questions are quiz and predict
 * steps of the lessons themselves, so they stay in sync with the content.
 */

import type { Skill } from './schema'

export interface PlacementLevel {
  id: string
  lessons: string[]
  skills: Skill[]
  items: string[]
}

export const PLACEMENT: PlacementLevel[] = [
  {
    id: 'robot',
    lessons: ['start-01', 'start-02', 'start-03', 'start-04', 'start-05'],
    skills: ['robot-basics'],
    items: ['start-01/after-end', 'start-02/plug', 'start-03/half', 'start-04/line-sensor'],
  },
  {
    id: 'drive',
    lessons: ['start-06', 'start-07', 'start-08'],
    skills: ['motion', 'turns'],
    items: ['start-06/predict-back', 'start-06/how-far', 'start-07/which-way'],
  },
  {
    id: 'sequence',
    lessons: ['blocks-01', 'blocks-02', 'blocks-03', 'blocks-04', 'blocks-05', 'blocks-06'],
    skills: ['sequence'],
    items: ['blocks-01/predict-order', 'blocks-02/time', 'blocks-03/degrees', 'blocks-04/two-waits'],
  },
]

export const PLACEMENT_ITEMS = PLACEMENT.flatMap((l) => l.items)

/** Levels passed, in order, given the set of correctly answered item keys. */
export function placementResult(correct: Set<string>): { passed: PlacementLevel[]; lessons: string[]; skills: Skill[] } {
  const passed: PlacementLevel[] = []
  for (const level of PLACEMENT) {
    const wrong = level.items.filter((k) => !correct.has(k)).length
    if (wrong > 1) break
    passed.push(level)
  }
  return { passed, lessons: passed.flatMap((l) => l.lessons), skills: [...new Set(passed.flatMap((l) => l.skills))] }
}

/** "I already know this" unit test: pass with at least 80 % right. */
export const UNIT_TEST_PASS = 0.8
export const UNIT_TEST_MAX = 6
