'use client'

import { useCallback, useState } from 'react'
import { ArrowRight } from 'lucide-react'

import { PredictStep } from '@/components/learn/steps/predict-step'
import { QuizStep } from '@/components/learn/steps/quiz-step'
import type { StepDone } from '@/components/learn/steps/simple-steps'
import { buttonVariants } from '@/components/ui/button'
import { fill } from '@/lib/i18n/config'
import type { LearnText } from '@/lib/i18n/learn'
import type { LearnAppText } from '@/lib/i18n/learn-app'
import type { Dictionary } from '@/lib/i18n/ru'
import type { PracticeItem } from '@/lib/learn/content'
import { useLearn } from '@/lib/learn/store'

type Lang = 'ru' | 'kk' | 'en'

export interface PracticeAnswer {
  key: string
  correct: boolean
}

interface RunnerProps {
  items: PracticeItem[]
  lang: Lang
  t: LearnText
  app: LearnAppText
  blocksT: Dictionary['blocks']
  onFinish: (answers: PracticeAnswer[]) => void
}

/** One question at a time, one attempt each (tests and review). */
export function PracticeRunner({ items, lang, t, app, blocksT, onFinish }: RunnerProps) {
  const learn = useLearn()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<PracticeAnswer[]>([])
  const item = items[index]
  const answered = answers.length > index
  const robotColor = learn.profile?.cosmetics.color ?? 'sun'

  const onDone = useCallback(
    (d: StepDone) => setAnswers((a) => (a.length > index ? a : [...a, { key: item.key, correct: d.firstTry }])),
    [index, item.key],
  )
  const noop = useCallback(() => {}, [])

  const last = index === items.length - 1
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <p className="m-0 text-sm font-bold text-muted-foreground" aria-live="polite">
          {fill(app.test.question, { n: index + 1, total: items.length })}
        </p>
        <div className="flex gap-1" aria-hidden="true">
          {items.map((it, i) => (
            <span
              key={it.key}
              className={
                'h-2 flex-1 rounded-full border-(length:--stroke-thin) border-outline ' +
                (i < answers.length ? (answers[i].correct ? 'bg-success' : 'bg-(--accent)') : i === index ? 'bg-primary' : 'bg-surface-2')
              }
            />
          ))}
        </div>
      </div>

      <div key={item.key}>
        {item.step.type === 'quiz' ? (
          <QuizStep step={item.step} lang={lang} t={t} done={false} once onDone={onDone} onMistake={noop} />
        ) : (
          <PredictStep step={item.step} lang={lang} t={t} blocksT={blocksT} robotColor={robotColor} done={false} onDone={onDone} onMistake={noop} />
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className={buttonVariants({ variant: 'primary', size: 'lg' })}
          disabled={!answered}
          onClick={() => (last ? onFinish(answers) : setIndex((i) => i + 1))}
        >
          {last ? app.test.finish : app.test.next}
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
