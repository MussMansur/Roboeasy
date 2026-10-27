'use client'

import { useEffect, useMemo, useState } from 'react'

import { COURSE } from './course'
import { ledger } from './economy'
import { dueSkills } from './progress'
import { questStatus } from './quests'
import { DEFAULT_COSMETICS, completedLessons } from './state'
import { useLearn } from './store'
import { dayKeyer, streakInfo } from './streak'
import { levelFor } from './xp'

/** Current time, refreshed every minute (streak days roll over at midnight). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Everything the path, map, garage and profile show, computed from the event log. */
export function useProgress() {
  const state = useLearn()
  const now = useNow()
  return useMemo(() => {
    const money = ledger(state)
    const streak = streakInfo(state, now, money.maxFreezes)
    const keyOf = dayKeyer(state.profile?.timezone ?? 'UTC')
    const todayEvents = state.events.filter((e) => keyOf(e.at) === streak.today.key)
    const profile = state.profile
    return {
      state,
      now,
      done: completedLessons(state),
      xp: money.xp,
      coins: money.coins,
      ledger: money,
      level: levelFor(money.xp),
      streak,
      quests: questStatus(streak.today.key, todayEvents),
      due: dueSkills(state, COURSE, now),
      looks: { ...DEFAULT_COSMETICS, ...profile?.cosmetics, model: profile?.buddy.model ?? 'rover' },
    }
  }, [state, now])
}
