'use client'

import { useEffect, useState } from 'react'
import { Check, FileDown, Loader2, Sparkles } from 'lucide-react'

import { BlockStack } from '@/components/block-stack'
import { CodeView } from '@/components/code-view'
import type { Dictionary } from '@/lib/i18n/ru'
import { IMAGES, type Program } from '@/lib/dsl/types'

type Phase = 'typing' | 'building' | 'done'

interface HeroDemoProps {
  t: Dictionary['demo']
  tabs: { blocks: string; python: string }
  labels: Dictionary['blocks']
  program: Program
  python: string
}

const SMILE = IMAGES.smile

export function HeroDemo({ t, tabs, labels, program, python }: HeroDemoProps) {
  const total = program.steps.length
  const [phase, setPhase] = useState<Phase>('typing')
  const [typed, setTyped] = useState(0)
  const [shown, setShown] = useState(0)
  const [tab, setTab] = useState<'blocks' | 'python'>('blocks')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(t.prompt.length)
      setShown(total)
      setPhase('done')
      return
    }
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(() => !cancelled && fn(), ms))

    const run = () => {
      setPhase('typing')
      setTyped(0)
      setShown(0)
      let time = 400
      for (let i = 1; i <= t.prompt.length; i++) {
        at(time, () => setTyped(i))
        time += 28
      }
      time += 450
      at(time, () => setPhase('building'))
      for (let i = 1; i <= total; i++) {
        time += 380
        at(time, () => setShown(i))
      }
      time += 350
      at(time, () => setPhase('done'))
      at(time + 7000, run)
    }
    run()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [t.prompt, total])

  const done = phase === 'done'

  return (
    <div className="demo" aria-label={t.label}>
      <div className="demo-top">
        <span className="demo-label">
          <span className="live-dot" aria-hidden="true" />
          {t.label}
        </span>
        <div className="tabs" role="tablist">
          {(['blocks', 'python'] as const).map((k) => (
            <button key={k} type="button" role="tab" id={`demo-tab-${k}`} aria-controls="demo-panel" aria-selected={tab === k} onClick={() => setTab(k)}>
              {tabs[k]}
            </button>
          ))}
        </div>
      </div>

      <p className="demo-prompt">
        <span className="avatar" aria-hidden="true">
          <Sparkles size={15} />
        </span>
        <span>
          <span className="sr-only">{t.prompt}</span>
          <span aria-hidden="true">
            {t.prompt.slice(0, typed)}
            {phase === 'typing' && <span className="caret" />}
          </span>
        </span>
      </p>

      <div className="demo-body" role="tabpanel" id="demo-panel" aria-labelledby={`demo-tab-${tab}`}>
        {tab === 'blocks' ? (
          <>
            <div style={{ minWidth: 0 }}>{phase !== 'typing' && <BlockStack program={program} labels={labels} limit={shown} animate />}</div>
            <div className="hub" style={{ ['--hub-light' as string]: done ? '#27c46a' : '#d0d0cc' }}>
              <div className="hub-screen">
                {SMILE.split('').map((d, i) => (
                  <span key={i} className="hub-px" data-on={done && d !== '0'} />
                ))}
              </div>
              <div className="hub-button" />
              <div className="hub-ports" aria-hidden="true">
                <span>A</span>
                <span>C</span>
                <span>E</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
            <CodeView code={python} className="code-demo" />
          </div>
        )}
      </div>

      <div className="demo-foot">
        <span className="demo-file">
          <FileDown size={16} aria-hidden="true" />
          <span>{t.file}</span>
        </span>
        <span className={done ? 'demo-status' : 'demo-status pending'} aria-live="polite">
          {done ? <Check size={16} aria-hidden="true" /> : <Loader2 size={16} className="spin" aria-hidden="true" />}
          {done ? t.ready : t.status}
        </span>
      </div>
    </div>
  )
}
