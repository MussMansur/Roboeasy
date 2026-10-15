'use client'

import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'

export interface Step {
  title: ReactNode
  description?: ReactNode
  /** Extra content under the current (or any) step. */
  content?: ReactNode
}

/**
 * Numbered steps (a guide or a wizard). Steps before `current` are done,
 * `current` is highlighted (aria-current="step"). Optional click to jump.
 */
export function Stepper({
  steps,
  current,
  onSelect,
  orientation = 'vertical',
  className,
  label,
}: {
  steps: Step[]
  current: number
  onSelect?: (index: number) => void
  orientation?: 'vertical' | 'horizontal'
  className?: string
  /** Accessible name of the list. */
  label?: string
}) {
  return (
    <ol
      aria-label={label}
      className={cn('m-0 grid list-none gap-0 p-0', orientation === 'horizontal' && 'grid-flow-col auto-cols-fr gap-3', className)}
      data-orientation={orientation}
    >
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        const marker = (
          <span
            className={cn(
              'relative grid size-9 shrink-0 place-items-center rounded-full border-(length:--stroke) border-outline font-display text-[0.9375rem] font-extrabold',
              state === 'done' && 'bg-success text-background',
              state === 'current' && 'bg-primary text-primary-foreground shadow-(--shadow-press)',
              state === 'todo' && 'bg-card text-muted-foreground',
            )}
          >
            {state === 'done' ? (
              <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }} className="grid">
                <Check className="size-[18px]" strokeWidth={3} aria-hidden="true" />
              </motion.span>
            ) : (
              i + 1
            )}
          </span>
        )
        return (
          <li
            key={i}
            aria-current={state === 'current' ? 'step' : undefined}
            data-state={state}
            className={cn('relative flex gap-3', orientation === 'vertical' && 'pb-5 last:pb-0')}
          >
            {orientation === 'vertical' && i < steps.length - 1 && (
              <span aria-hidden="true" className={cn('absolute top-10 bottom-1 left-[17px] w-[2.5px] rounded-full', i < current ? 'bg-success' : 'bg-border')} />
            )}
            {onSelect ? (
              <button type="button" onClick={() => onSelect(i)} className="h-fit cursor-pointer rounded-full border-0 bg-transparent p-0">
                {marker}
                <span className="sr-only">{typeof step.title === 'string' ? step.title : `${i + 1}`}</span>
              </button>
            ) : (
              marker
            )}
            <div className="grid min-w-0 gap-1 pt-1.5">
              <div className={cn('font-display font-bold', state === 'todo' && 'text-muted-foreground')}>{step.title}</div>
              {step.description && <div className="text-sm text-muted-foreground">{step.description}</div>}
              {step.content}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
