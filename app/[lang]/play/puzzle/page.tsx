import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { PuzzleGame } from '@/components/learn/games/puzzle-game'
import { isLocale } from '@/lib/i18n'
import { getPlayText } from '@/lib/i18n/play'
type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getPlayText(lang).play.games.puzzle.title} — RoboEasy`, robots: { index: false } }
}

export default async function PuzzlePage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <AppShell lang={lang}>
      <PuzzleGame lang={lang} t={getPlayText(lang)} />
    </AppShell>
  )
}
