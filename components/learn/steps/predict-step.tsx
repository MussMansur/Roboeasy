'use client'

import { useMemo, useState } from 'react'
import { Check, Play, X } from 'lucide-react'

import { BlockStack } from '@/components/block-stack'
import { RichText } from '@/components/learn/rich-text'
import { shuffled } from '@/components/learn/steps/quiz-step'
import { SimView } from '@/components/sim/sim-view'
import { buttonVariants } from '@/components/ui/button'
import { DEFAULT_ROBOT } from '@/lib/dsl/types'
import type { Dictionary } from '@/lib/i18n/ru'
import type { LearnText } from '@/lib/i18n/learn'
import type { PredictStep as Predict } from '@/lib/learn/schema'
import { type SimResult, simulate } from '@/lib/sim/interpreter'
import { cn } from '@/lib/utils'

import type { StepDone } from './simple-steps'

type Lang = 'ru' | 'kk' | 'en'
const COLORS = ['#e8442e', '#2560d8', '#b26ef0', '#ff9f1c']

export function PredictStep({ step, lang, t, blocksT, robotColor, done, onDone, onMistake }: { step: Predict; lang: Lang; t: LearnText; blocksT: Dictionary['blocks']; robotColor: string; done: boolean; onDone: (d: StepDone) => void; onMistake: () => void }) {
  const paths = useMemo(() => step.options.map((o) => simulate(o.steps, step.field).trace.map((p) => ({ x: p.x, y: p.y }))), [step])
  const actual = useMemo(() => simulate(step.program, step.field), [step])
  const [choice, setChoice] = useState<number | null>(done ? step.correct : null)
  const [result, setResult] = useState<SimResult | null>(null)
  const [revealed, setRevealed] = useState(done)
  // Display position of each option (authored order puts the right one anywhere).
  const order = useMemo(() => shuffled(step.options.map((_, i) => i), `${step.id}:options`, true), [step])
  const pos = (i: number) => order.indexOf(i)

  const run = () => {
    if (choice === null) return
    setResult(actual)
    setRevealed(true)
    const right = choice === step.correct
    if (!right) onMistake()
    onDone({ firstTry: right, hints: 0 })
  }

  const label = (i: number) => String.fromCharCode(65 + pos(i))
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div className="grid gap-3">
        <h2 className="m-0 text-2xl">{step.title[lang]}</h2>
        <RichText text={step.question[lang]} className="text-lg" />
        <div className="canvas">
          <BlockStack program={{ steps: step.program }} labels={blocksT} robot={DEFAULT_ROBOT} />
        </div>
      </div>
      <div className="grid gap-3">
        <SimView
          field={step.field}
          result={result}
          lang={lang}
          robotColor={robotColor}
          labels={t.sim}
          paths={step.options.map((o, i) => ({ points: paths[i], color: COLORS[pos(i) % COLORS.length], label: label(i), active: revealed ? i === step.correct : choice === null || choice === i }))}
        />
        <div role="radiogroup" aria-label={t.lesson.choosePath} className="flex flex-wrap gap-2">
          {order.map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={choice === i}
              disabled={revealed}
              onClick={() => setChoice(i)}
              className={cn(
                'flex min-h-12 items-center gap-2 rounded-(--radius-sm) border-(length:--stroke) border-outline bg-card px-3 font-bold shadow-(--shadow-press)',
                choice === i && 'ring-3 ring-(--focus)',
                revealed && i === step.correct && 'bg-(--ok-bg)',
              )}
            >
              <span className="grid size-7 place-items-center rounded-full font-display font-extrabold text-white" style={{ background: COLORS[pos(i) % COLORS.length] }}>
                {label(i)}
              </span>
              {step.options[i].label[lang]}
            </button>
          ))}
        </div>
        {!revealed ? (
          <button type="button" className={buttonVariants({ variant: 'primary', size: 'lg', className: 'justify-self-start' })} disabled={choice === null} onClick={run}>
            <Play aria-hidden="true" />
            {t.lesson.runToSee}
          </button>
        ) : (
          <div className={cn('alert m-0 grid gap-1', choice === step.correct && 'alert-ok')} role="status" aria-live="polite">
            <span className="flex items-center gap-2 font-extrabold">
              {choice === step.correct ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
              {choice === step.correct ? t.lesson.correct : `${t.lesson.answer}: ${label(step.correct)}`}
            </span>
            <RichText text={step.explanation[lang]} className="font-medium text-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}
