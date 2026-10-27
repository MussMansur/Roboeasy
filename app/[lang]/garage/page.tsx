import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { GarageView } from '@/components/learn/garage-view'
import { isLocale } from '@/lib/i18n'
import { getLearnAppText } from '@/lib/i18n/learn-app'
import { getPlayText } from '@/lib/i18n/play'
type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getPlayText(lang).garage.title} — RoboEasy`, robots: { index: false } }
}

export default async function GaragePage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <AppShell lang={lang}>
      <GarageView lang={lang} app={getLearnAppText(lang)} t={getPlayText(lang)} />
    </AppShell>
  )
}
