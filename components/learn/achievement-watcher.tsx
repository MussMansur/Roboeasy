'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import type { LearnAppText } from '@/lib/i18n/learn-app'
import { ACHIEVEMENTS, newAchievements } from '@/lib/learn/achievements'
import { COURSE } from '@/lib/learn/course'
import { record, useLearn } from '@/lib/learn/store'

const AchievementDialog = dynamic(() => import('@/components/learn/achievement-dialog'), { ssr: false })

type Lang = 'ru' | 'kk' | 'en'

/**
 * Records achievements as soon as they are earned and shows them one by
 * one. Mounted on every learner page (AppShell, lesson player); the dialog
 * and its animation load only when something is earned.
 */
export function AchievementWatcher({ lang, app }: { lang: Lang; app: LearnAppText }) {
  const learn = useLearn()
  const [queue, setQueue] = useState<string[]>([])

  useEffect(() => {
    if (!learn.events.length) return
    const fresh = newAchievements(learn, COURSE)
    if (!fresh.length) return
    record(fresh.map((achievement) => ({ kind: 'achievement' as const, achievement })))
    setQueue((q) => [...q, ...fresh.filter((id) => !q.includes(id))])
  }, [learn])

  if (!queue.length) return null
  return <AchievementDialog current={ACHIEVEMENTS.find((a) => a.id === queue[0])} lang={lang} app={app} onClose={() => setQueue((q) => q.slice(1))} />
}
