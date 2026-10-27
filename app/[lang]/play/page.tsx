import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { PlayHub } from '@/components/learn/play-hub'
import { isLocale } from '@/lib/i18n'
import { getPlayText } from '@/lib/i18n/play'
type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getPlayText(lang).play.title} — RoboEasy` }
}

export default async function PlayPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <AppShell lang={lang}>
      <PlayHub lang={lang} t={getPlayText(lang)} />
    </AppShell>
  )
}
