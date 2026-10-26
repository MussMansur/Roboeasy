'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Flame, Repeat, Snowflake, Star, Target, Trophy } from 'lucide-react'

import { ProgressBar } from '@/components/learn/learn-map'
import { ClassLive } from '@/components/learn/class-live'
import { Onboarding } from '@/components/learn/onboarding'
import { SkillRadar } from '@/components/learn/skill-radar'
import { TrackIcon } from '@/components/learn/track-icon'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fill } from '@/lib/i18n/config'
import type { LearnAppText } from '@/lib/i18n/learn-app'
import { variantFor } from '@/lib/flags'
import { ACHIEVEMENTS, recordedAchievements } from '@/lib/learn/achievements'
import { COURSE } from '@/lib/learn/course'
import { nextLesson, skillRadar, trackHasContent, trackProgress } from '@/lib/learn/progress'
import { useHydrated } from '@/lib/learn/store'
import { MAX_FREEZES, challengeIndex, isoWeek } from '@/lib/learn/streak'
import { LEVELS } from '@/lib/learn/xp'
import { useProgress } from '@/lib/learn/use-progress'

type Lang = 'ru' | 'kk' | 'en'

export function Ring({ value, children, label }: { value: number; children: React.ReactNode; label: string }) {
  const r = 34
  const len = 2 * Math.PI * r
  return (
    <div className="relative grid size-24 shrink-0 place-items-center" role="img" aria-label={label}>
      <svg viewBox="0 0 80 80" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--outline)" strokeWidth="11" strokeOpacity="0.12" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--success)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${len * Math.min(1, value)} ${len}`} />
      </svg>
      <span className="relative text-center font-display text-lg leading-tight font-extrabold">{children}</span>
    </div>
  )
}

/** /path: the learner's home. Shows onboarding first. */
export function PathHome({ lang, app, challengeTitles }: { lang: Lang; app: LearnAppText; challengeTitles: string[] }) {
  const hydrated = useHydrated()
  const p = useProgress()
  const [joining, setJoining] = useState(false)
  const t = app.path

  if (!hydrated)
    return (
      <div className="container grid gap-4 py-10">
        <Skeleton className="h-12 max-w-md" />
        <Skeleton className="h-40" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )

  if (!p.state.profile || joining) return <Onboarding lang={lang} app={app} onSaved={() => setJoining(true)} onDone={() => setJoining(false)} />

  const profile = p.state.profile
  const next = nextLesson(p.done, COURSE)
  const nextLevel = p.level.to !== null ? LEVELS[p.level.index + 1] : null
  const week = isoWeek(p.streak.today.key)
  const challengeDone = p.state.events.some((e) => e.kind === 'challenge_done' && e.week === week)
  const earned = recordedAchievements(p.state)
  const recent = ACHIEVEMENTS.filter((a) => earned.has(a.id))
    .sort((a, b) => (earned.get(b.id) ?? 0) - (earned.get(a.id) ?? 0))
    .slice(0, 4)
  const tracks = COURSE.tracks.filter((tr) => trackHasContent(tr) && trackProgress(p.done, tr, COURSE).unlocked)
  const goal = profile.goal
  const goalText = goal.kind === 'lessons' ? fill(t.goalLessons, { done: Math.min(p.streak.today.lessons, goal.n), n: goal.n }) : fill(t.goalMinutes, { done: Math.min(p.streak.today.minutes, goal.n), n: goal.n })

  return (
    <div className="container grid gap-6 py-8 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="m-0 text-4xl md:text-5xl">{fill(t.hello, { name: profile.nickname })}</h1>
          <p className="m-0 font-bold text-muted-foreground">
            {fill(t.level, { n: p.level.index + 1, title: p.level.title[lang] })} · {p.xp} XP
          </p>
        </div>
        <div className="grid w-full max-w-xs gap-1">
          <ProgressBar value={p.level.progress} label={t.level} />
          <span className="text-sm font-bold text-muted-foreground">{nextLevel ? fill(t.toNext, { title: nextLevel.title[lang], xp: (p.level.to ?? 0) - p.xp }) : t.maxLevel}</span>
        </div>
      </header>

      <ClassLive lang={lang} app={app} />

      {/* Continue */}
      <Card className="flex-col items-start gap-4 bg-primary text-primary-foreground sm:flex-row sm:items-center sm:gap-5">
        {next ? (
          <>
            <TrackIcon icon={next.track.icon} color={next.track.color} className="size-16 bg-card [&_svg]:size-8" />
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-extrabold uppercase opacity-80">
                {t.nextUp} · {next.track.title[lang]}
              </p>
              <h2 className="m-0 text-3xl">{next.title[lang]}</h2>
            </div>
            <Link className={buttonVariants({ variant: 'secondary', size: 'lg' })} href={`/${lang}/learn/${next.track.id}/${next.id}`}>
              {p.done.size === 0 ? t.startFirst : variantFor('path-cta', profile.anonId) === 'lesson-name' ? fill(app.placement.startFrom, { lesson: next.title[lang] }) : t.continue}
              <ArrowRight aria-hidden="true" />
            </Link>
          </>
        ) : (
          <p className="m-0 text-lg font-bold">{t.allDone}</p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Streak */}
        <Card className="gap-3">
          <CardTitle>
            <Flame className="size-5 text-[#e8442e]" aria-hidden="true" />
            {t.streak}
          </CardTitle>
          <p className="m-0 font-display text-4xl font-extrabold">{fill(t.streakDays, { n: p.streak.current })}</p>
          <p className="m-0 text-sm text-muted-foreground">{p.streak.current === 0 ? (p.streak.best > 0 ? t.streakNoGuilt : t.streakZero) : fill(t.streakBest, { n: p.streak.best })}</p>
          <p className="m-0 flex items-center gap-2 text-sm font-bold" title={t.freezesHint}>
            <Snowflake className="size-4 text-link" aria-hidden="true" />
            {fill(t.freezes, { n: p.streak.freezes, max: MAX_FREEZES })}
          </p>
        </Card>

        {/* Daily goal */}
        <Card className="gap-3">
          <CardTitle>
            <Target className="size-5" aria-hidden="true" />
            {t.goal}
          </CardTitle>
          <div className="flex items-center gap-4">
            <Ring value={p.streak.today.progress} label={goalText}>
              {Math.round(p.streak.today.progress * 100)}%
            </Ring>
            <p className="m-0 font-bold">{p.streak.today.met ? t.goalDone : goalText}</p>
          </div>
        </Card>

        {/* Review */}
        <Card className="gap-3">
          <CardTitle>
            <Repeat className="size-5" aria-hidden="true" />
            {t.review}
          </CardTitle>
          <p className="m-0 font-bold">{p.due.length ? fill(t.reviewDue, { n: p.due.length }) : t.reviewNone}</p>
          <Link className={buttonVariants({ variant: p.due.length ? 'primary' : 'secondary', size: 'sm', className: 'mt-auto justify-self-start' })} href={`/${lang}/review`}>
            {t.reviewCta}
          </Link>
        </Card>

        {/* Weekly challenge */}
        <Card className="gap-3">
          <CardTitle>
            <Star className="size-5 text-[#c98a00]" aria-hidden="true" />
            {t.challenge}
          </CardTitle>
          <p className="m-0 font-bold">{challengeDone ? t.challengeDone : challengeTitles[challengeIndex(week, challengeTitles.length)]}</p>
          {!challengeDone && (
            <Link className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-auto justify-self-start' })} href={`/${lang}/path/challenge`}>
              {t.challengeCta}
            </Link>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card className="gap-2">
          <CardTitle>{t.skills}</CardTitle>
          <SkillRadar label={t.skills} axes={skillRadar(p.done, COURSE).map((a) => ({ ...a, title: a.title[lang] }))} />
        </Card>
        <div className="grid content-start gap-4">
          <Card className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{t.tracks}</CardTitle>
              <Link className="font-bold text-link underline underline-offset-4" href={`/${lang}/learn`}>
                {t.allTracks}
              </Link>
            </div>
            <ul className="m-0 grid list-none gap-3 p-0">
              {tracks.map((tr) => {
                const tp = trackProgress(p.done, tr, COURSE)
                return (
                  <li key={tr.id}>
                    <Link href={`/${lang}/learn/${tr.id}`} className="flex items-center gap-3 rounded-(--radius-sm) p-1 hover:bg-surface-2">
                      <TrackIcon icon={tr.icon} color={tr.color} className="size-10 [&_svg]:size-5" />
                      <span className="grid min-w-0 flex-1 gap-1">
                        <span className="flex justify-between gap-2 font-bold">
                          {tr.title[lang]}
                          <span className="text-sm text-muted-foreground">{fill(app.map.progress, { done: tp.done, total: tp.total })}</span>
                        </span>
                        <ProgressBar value={tp.total ? tp.done / tp.total : 0} label={tr.title[lang]} />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>
          <Card className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>
                <Trophy className="size-5" aria-hidden="true" />
                {t.achievements}
              </CardTitle>
              <Link className="font-bold text-link underline underline-offset-4" href={`/${lang}/profile#achievements`}>
                {t.allAchievements}
              </Link>
            </div>
            {recent.length ? (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {recent.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-full border-(length:--stroke-thin) border-outline bg-surface-2 py-1 pr-3 pl-1 font-bold">
                    <span className="grid size-8 place-items-center rounded-full bg-card text-lg" aria-hidden="true">
                      {a.icon}
                    </span>
                    {a.title[lang]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-muted-foreground">{ACHIEVEMENTS[0].description[lang]}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
