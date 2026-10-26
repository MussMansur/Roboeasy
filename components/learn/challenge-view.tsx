'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'

import { CodeStep } from '@/components/learn/steps/code-step'
import type { StepDone } from '@/components/learn/steps/simple-steps'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fill } from '@/lib/i18n/config'
import type { LearnText } from '@/lib/i18n/learn'
import type { LearnAppText } from '@/lib/i18n/learn-app'
import type { Dictionary } from '@/lib/i18n/ru'
import type { ClientChallenge } from '@/lib/learn/challenge'
import { record, useHydrated } from '@/lib/learn/store'
import { challengeIndex, isoWeek } from '@/lib/learn/streak'
import { useProgress } from '@/lib/learn/use-progress'
import { XP_RULES } from '@/lib/learn/xp'

type Lang = 'ru' | 'kk' | 'en'

/** /path/challenge: this week's task in the full code-step workspace. */
export function ChallengeView({ lang, t, app, blocksT, challenges }: { lang: Lang; t: LearnText; app: LearnAppText; blocksT: Dictionary['blocks']; challenges: ClientChallenge[] }) {
  const hydrated = useHydrated()
  const { state, streak } = useProgress()
  const week = isoWeek(streak.today.key)
  const challenge = challenges[challengeIndex(week, challenges.length)]
  const done = state.events.some((e) => e.kind === 'challenge_done' && e.week === week)
  const cosmetics = state.profile?.cosmetics

  const onDone = useCallback(
    (d: StepDone) => {
      record([
        { kind: 'step_done', lesson: `challenge-${week}`, step: challenge.id, stepType: 'code', firstTry: d.firstTry, hints: d.hints, blocks: d.blocks, referenceBlocks: challenge.referenceBlocks, program: d.program },
        { kind: 'challenge_done', week, challenge: challenge.id },
      ])
    },
    [week, challenge],
  )
  const onMistake = useCallback(() => record([{ kind: 'mistake', lesson: `challenge-${week}`, step: challenge.id }]), [week, challenge])

  return (
    <div className="container grid gap-6 py-8">
      <Link href={`/${lang}/path`} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'justify-self-start' })}>
        <ArrowLeft aria-hidden="true" />
        {app.placement.toPath}
      </Link>
      <header className="grid gap-2">
        <h1 className="m-0 flex items-center gap-3 text-4xl">
          <Star className="size-9 text-[#c98a00]" aria-hidden="true" />
          {app.challenge.title}
        </h1>
        <p className="m-0 text-lg text-muted-foreground">{fill(app.challenge.lead, { xp: XP_RULES.challenge })}</p>
        {hydrated && done && (
          <p className="alert alert-ok m-0" role="status">
            {app.challenge.done}
          </p>
        )}
      </header>
      {hydrated ? (
        <CodeStep
          key={`${week}-${challenge.id}`}
          lessonId={`challenge-${week}`}
          step={challenge}
          lang={lang}
          t={t}
          blocksT={blocksT}
          robotColor={cosmetics?.color ?? 'sun'}
          sticker={cosmetics?.sticker ?? 'none'}
          wheels={cosmetics?.wheels}
          mentor={false}
          done={done}
          onDone={onDone}
          onMistake={onMistake}
        />
      ) : (
        <Skeleton className="h-[480px]" />
      )}
    </div>
  )
}
