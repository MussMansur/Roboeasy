'use client'

import { useEffect, useMemo, useState } from 'react'

import { COURSE } from './course'
import { dueSkills } from './progress'
import { completedLessons } from './state'
import { useLearn } from './store'
import { streakInfo } from './streak'
import { levelFor, totalXp } from './xp'

/** Current time, refreshed every minute (streak days roll over at midnight). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Everything the path, map and profile show, computed from the event log. */
export function useProgress() {
  const state = useLearn()
  const now = useNow()
  return useMemo(() => {
    const xp = totalXp(state)
    return {
      state,
      now,
      done: completedLessons(state),
      xp,
      level: levelFor(xp),
      streak: streakInfo(state, now),
      due: dueSkills(state, COURSE, now),
    }
  }, [state, now])
}
