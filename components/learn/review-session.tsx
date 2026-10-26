'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Repeat, Sparkles } from 'lucide-react'

import { type PracticeAnswer, PracticeRunner } from '@/components/learn/practice-runner'
import { shuffled } from '@/components/learn/steps/quiz-step'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fill } from '@/lib/i18n/config'
import type { LearnText } from '@/lib/i18n/learn'
import type { LearnAppText } from '@/lib/i18n/learn-app'
import type { Dictionary } from '@/lib/i18n/ru'
import type { PracticeItem } from '@/lib/learn/content'
import { COURSE } from '@/lib/learn/course'
import { skillMemory } from '@/lib/learn/progress'
import type { Skill } from '@/lib/learn/schema'
import { record, useHydrated } from '@/lib/learn/store'
import { useProgress } from '@/lib/learn/use-progress'
import { XP_RULES } from '@/lib/learn/xp'

type Lang = 'ru' | 'kk' | 'en'
const SESSION = 6

/** Picks up to 6 questions from finished lessons, taking due skills in turn. */
export function pickReview(pool: PracticeItem[], due: Skill[], done: Set<string>, seed: string): { items: PracticeItem[]; skills: Skill[] } {
  const usable = pool.filter((i) => done.has(i.lesson))
  const bySkill = due.map((s) => shuffled(usable.filter((i) => i.skills.includes(s)), `${seed}:${s}`))
  const items: PracticeItem[] = []
  const used = new Set<string>()
  const skills = new Set<Skill>()
  for (let round = 0; items.length < SESSION && bySkill.some((list) => list.length > round); round++)
    bySkill.forEach((list, k) => {
      const item = list[round]
      if (item && !used.has(item.key) && items.length < SESSION) {
        used.add(item.key)
        items.push(item)
        skills.add(due[k])
      }
    })
  return { items, skills: [...skills] }
}

export function ReviewSession({ lang, t, app, blocksT, pool }: { lang: Lang; t: LearnText; app: LearnAppText; blocksT: Dictionary['blocks']; pool: PracticeItem[] }) {
  const hydrated = useHydrated()
  const { state, done, due, now, streak } = useProgress()
  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro')
  const [answers, setAnswers] = useState<PracticeAnswer[]>([])
  const [session, setSession] = useState<{ items: PracticeItem[]; skills: Skill[] } | null>(null)
  const preview = useMemo(() => pickReview(pool, due, done, streak.today.key), [pool, due, done, streak.today.key])
  const nextDue = useMemo(() => {
    const times = [...skillMemory(state, COURSE).values()].map((m) => m.due).filter((d) => d > now)
    return times.length ? Math.min(...times) : null
  }, [state, now])

  const start = () => {
    setSession(preview)
    setPhase('run')
  }
  const finish = (a: PracticeAnswer[]) => {
    setAnswers(a)
    setPhase('result')
    record([{ kind: 'review_done', skills: session?.skills ?? [], correct: a.filter((x) => x.correct).length, total: a.length }])
  }

  const days = nextDue ? Math.max(1, Math.round((nextDue - now) / 86400_000)) : null
  return (
    <div className="container grid max-w-3xl gap-6 py-8 md:py-12">
      <header className="grid gap-2">
        <h1 className="m-0 flex items-center gap-3 text-4xl">
          <Repeat className="size-9" aria-hidden="true" />
          {app.review.title}
        </h1>
        <p className="m-0 text-lg text-muted-foreground">{app.review.lead}</p>
      </header>

      {!hydrated ? (
        <Skeleton className="h-40" />
      ) : phase === 'run' && session ? (
        <PracticeRunner items={session.items} lang={lang} t={t} app={app} blocksT={blocksT} onFinish={finish} />
      ) : phase === 'result' ? (
        <Card className="gap-4 bg-(--ok-bg)" role="status">
          <Sparkles className="size-8" aria-hidden="true" />
          <h2 className="m-0 text-2xl">{app.review.done}</h2>
          <p className="m-0 text-lg font-bold">
            {fill(app.test.score, { correct: answers.filter((a) => a.correct).length, total: answers.length })} · {fill(app.review.xp, { xp: XP_RULES.review })}
          </p>
          <Link className={buttonVariants({ variant: 'primary', className: 'justify-self-start' })} href={`/${lang}/path`}>
            {app.placement.toPath}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Card>
      ) : preview.items.length === 0 ? (
        <Card flat className="gap-2">
          <p className="m-0 text-lg font-bold">{done.size === 0 ? app.review.nothingNew : app.review.nothing}</p>
          {days !== null && (
            <p className="m-0 text-muted-foreground">
              {app.review.soon}: {days === 1 ? app.review.tomorrow : fill(app.review.inDays, { n: days })}
            </p>
          )}
        </Card>
      ) : (
        <Card className="gap-4">
          <h2 className="m-0 text-xl">{app.review.due}</h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {preview.skills.map((s) => (
              <li key={s}>
                <Badge variant="outline">{app.skills[s]}</Badge>
              </li>
            ))}
          </ul>
          <button type="button" className={buttonVariants({ variant: 'primary', size: 'lg', className: 'justify-self-start' })} onClick={start}>
            {app.review.start}
            <ArrowRight aria-hidden="true" />
          </button>
        </Card>
      )}
    </div>
  )
}
