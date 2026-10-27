import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { MemoryGame } from '@/components/learn/games/memory-game'
import { isLocale } from '@/lib/i18n'
import { getPlayText } from '@/lib/i18n/play'
type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getPlayText(lang).play.games.memory.title} — RoboEasy`, robots: { index: false } }
}

export default async function MemoryPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <AppShell lang={lang}>
      <MemoryGame lang={lang} t={getPlayText(lang)} />
    </AppShell>
  )
}
