'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Radio } from 'lucide-react'

import { CLOUD_CONFIGURED, loadCloud } from '@/components/learn/use-cloud'
import { buttonVariants } from '@/components/ui/button'
import { fill } from '@/lib/i18n/config'
import type { LearnAppText } from '@/lib/i18n/learn-app'
import { findLessonRef } from '@/lib/learn/course'

type Lang = 'ru' | 'kk' | 'en'

function storedSession(): boolean {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch {
    return false
  }
}

/** "Your teacher is running a lesson" on the learner's home, for signed-in class members. */
export function ClassLive({ lang, app }: { lang: Lang; app: LearnAppText }) {
  const [live, setLive] = useState<{ lesson: string; className: string } | null>(null)
  useEffect(() => {
    if (!CLOUD_CONFIGURED || !storedSession()) return
    let alive = true
    const check = async () => {
      const m = await loadCloud()
      const user = await m.currentUser()
      if (!user) return
      const classes = await m.myClasses().catch(() => [])
      const c = classes.find((x) => x.teacher_id !== user.id && x.live_lesson)
      if (alive) setLive(c?.live_lesson ? { lesson: c.live_lesson, className: c.name } : null)
    }
    void check()
    const id = setInterval(() => void check(), 30_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  if (!live) return null
  const ref = findLessonRef(live.lesson)
  if (!ref) return null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-(--radius-md) border-(length:--stroke) border-outline bg-primary p-3 text-primary-foreground shadow-(--shadow-hard-sm)" role="status">
      <Radio className="size-5 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      <span className="flex-1 font-bold">
        {live.className}: {fill(app.classes.live, { lesson: ref.ref.title[lang] })}
      </span>
      <Link className={buttonVariants({ size: 'sm' })} href={`/${lang}/learn/${ref.track.id}/${live.lesson}`}>
        {app.classes.liveJoin}
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  )
}
