'use client'

import { useEffect, useRef, useState } from 'react'
import { Timer, Zap } from 'lucide-react'

import { GameHeader, type Reward, RewardLine, Stars, finishRound } from '@/components/learn/games/game-kit'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { fill } from '@/lib/i18n/config'
import type { PlayText } from '@/lib/i18n/play'
import { BLITZ_SECONDS, type BlitzQuestion, type LessonChoice, blitzQuestions, blitzStars } from '@/lib/learn/games/quiz'
import { SENSOR_BLITZ_SECONDS } from '@/lib/learn/shop'
import { useProgress } from '@/lib/learn/use-progress'
import { cn } from '@/lib/utils'

type Lang = 'ru' | 'kk' | 'en'

export function BlitzGame({ lang, t, lessons }: { lang: Lang; t: PlayText; lessons: LessonChoice[] }) {
  const p = useProgress()
  const bonus = SENSOR_BLITZ_SECONDS[p.ledger.tiers.sensor] ?? 0
  const [questions, setQuestions] = useState<BlitzQuestion[] | null>(null)
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [left, setLeft] = useState(BLITZ_SECONDS)
  const [flash, setFlash] = useState<{ i: number; ok: boolean } | null>(null)
  const [result, setResult] = useState<{ stars: number; reward: Reward; score: number } | null>(null)
  const scoreRef = useRef(0)

  const start = () => {
    setQuestions(blitzQuestions(lang, Math.floor(Math.random() * 1e9), lessons, 60))
    setIndex(0)
    setScore(0)
    scoreRef.current = 0
    setCombo(0)
    setLeft(BLITZ_SECONDS + bonus)
    setFlash(null)
    setResult(null)
  }

  // The clock.
  useEffect(() => {
    if (!questions || result) return
    if (left <= 0) {
      const s = scoreRef.current
      setResult({ score: s, stars: blitzStars(s), reward: finishRound('blitz', 0, blitzStars(s), s, BLITZ_SECONDS + bonus) })
      return
    }
    const timer = setTimeout(() => setLeft((x) => x - 1), 1000)
    return () => clearTimeout(timer)
  }, [questions, left, result, bonus])

  const answer = (i: number) => {
    if (!questions || flash || result) return
    const ok = i === questions[index].correct
    if (ok) {
      scoreRef.current += 1
      setScore(scoreRef.current)
      setCombo((c) => c + 1)
    } else setCombo(0)
    setFlash({ i, ok })
    setTimeout(
      () => {
        setFlash(null)
        setIndex((x) => (x + 1) % questions.length)
      },
      ok ? 250 : 700,
    )
  }

  const q = questions?.[index]
  return (
    <div className="container grid max-w-3xl gap-5 py-6 md:py-10">
      <GameHeader lang={lang} t={t} title={t.play.games.blitz.title} />

      {!questions || result ? (
        <Card className="items-start gap-3">
          {result ? (
            <>
              <p className="alert alert-ok m-0" role="status">
                {t.blitz.over} {fill(t.blitz.result, { n: result.score })}
              </p>
              <Stars n={result.stars} className="text-3xl" label={fill(t.game.stars, { n: result.stars })} />
              <RewardLine reward={result.reward} t={t} />
            </>
          ) : (
            <p className="m-0 text-lg">{t.blitz.lead}</p>
          )}
          {bonus > 0 && <p className="m-0 text-sm font-bold text-success">{fill(t.blitz.bonus, { n: bonus })}</p>}
          <button type="button" className={buttonVariants({ variant: 'primary', size: 'lg' })} onClick={start}>
            <Zap aria-hidden="true" />
            {result ? t.game.again : t.blitz.start}
          </button>
        </Card>
      ) : (
        q && (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 font-display text-xl font-extrabold">
              <span className={cn('inline-flex items-center gap-1.5', left <= 10 && 'text-destructive')} aria-live="off">
                <Timer className="size-6" aria-hidden="true" />
                {fill(t.blitz.time, { n: left })}
              </span>
              <span aria-live="polite">{fill(t.blitz.score, { n: score })}</span>
              {combo >= 3 && (
                <span className="rounded-full border-(length:--stroke-thin) border-outline bg-primary px-3 py-0.5 text-base text-primary-foreground">
                  {fill(t.blitz.combo, { n: combo })}
                </span>
              )}
            </div>
            <div className="h-3 overflow-hidden rounded-full border-(length:--stroke-thin) border-outline bg-surface-2" aria-hidden="true">
              <div
                className="h-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                style={{ width: `${(left / (BLITZ_SECONDS + bonus)) * 100}%` }}
              />
            </div>
            <Card className="gap-4">
              <h2 className="m-0 text-xl leading-snug md:text-2xl" key={q.key}>
                {q.prompt}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((o, i) => (
                  <button
                    key={`${q.key}-${i}`}
                    type="button"
                    onClick={() => answer(i)}
                    className={cn(
                      buttonVariants({ size: 'lg', className: 'h-auto min-h-14 justify-start py-2 text-left whitespace-normal' }),
                      flash && i === q.correct && 'bg-(--ok-bg)',
                      flash && !flash.ok && flash.i === i && 'bg-[#ffd9d2]',
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )
      )}
    </div>
  )
}
