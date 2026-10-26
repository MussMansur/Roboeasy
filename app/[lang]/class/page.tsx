import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { ClassView } from '@/components/learn/class-view'
import { getDictionary, isLocale } from '@/lib/i18n'
import { getLearnAppText } from '@/lib/i18n/learn-app'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getLearnAppText(lang).classes.title} — RoboEasy`, robots: { index: false } }
}

export default async function ClassPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <AppShell lang={lang}>
      <ClassView lang={lang} app={getLearnAppText(lang)} blocksT={getDictionary(lang).blocks} />
    </AppShell>
  )
}
