'use client'

import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'

import { CoinIcon } from '@/components/learn/coin'
import { fill } from '@/lib/i18n/config'
import type { PlayText } from '@/lib/i18n/play'
import { ledger } from '@/lib/learn/economy'
import type { GameId } from '@/lib/learn/state'
import { getLearnState, record } from '@/lib/learn/store'
import { cn } from '@/lib/utils'

type Lang = 'ru' | 'kk' | 'en'

export interface Reward {
  coins: number
  xp: number
}

/** Records a finished round (and the time spent) and returns what it earned, quests included. */
export function finishRound(game: GameId, level: number, stars: number, score: number, seconds: number): Reward {
  const before = ledger(getLearnState())
  record([
    { kind: 'game_done', game, level, stars, score },
    { kind: 'time', seconds: Math.max(0, Math.min(3600, Math.round(seconds))) },
  ])
  const after = ledger(getLearnState())
  return { coins: after.coins - before.coins, xp: after.xp - before.xp }
}

export function Stars({ n, className, label }: { n: number; className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex gap-0.5', className)} role="img" aria-label={label ?? `${n}/3`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} className={cn('size-[1em]', i <= n ? 'fill-[#ffc531] text-[#c98a00]' : 'text-border-strong')} aria-hidden="true" />
      ))}
    </span>
  )
}

export function RewardLine({ reward, t }: { reward: Reward; t: PlayText }) {
  if (reward.coins <= 0 && reward.xp <= 0) return <p className="m-0 text-sm font-bold text-muted-foreground">{t.game.noReward}</p>
  return (
    <p className="animate-in zoom-in-50 duration-300 motion-reduce:animate-none m-0 inline-flex items-center gap-2 rounded-full border-(length:--stroke-thin) border-outline bg-(--ok-bg) px-4 py-1.5 font-display text-xl font-extrabold text-success">
      <CoinIcon />
      {fill(t.game.reward, { coins: reward.coins, xp: reward.xp })}
    </p>
  )
}

export function GameHeader({ lang, t, title, children }: { lang: Lang; t: PlayText; title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-1">
        <Link href={`/${lang}/play`} className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t.game.back}
        </Link>
        <h1 className="m-0 text-3xl md:text-4xl">{title}</h1>
      </div>
      {children}
    </header>
  )
}
