import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { LibraryView } from '@/components/learn/library-view'
import { isLocale } from '@/lib/i18n'
import { getLearnText } from '@/lib/i18n/learn'
import { getPlayText } from '@/lib/i18n/play'
type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getPlayText(lang).library.title} — RoboEasy` }
}

export default async function LibraryPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <AppShell lang={lang}>
      <LibraryView lang={lang} t={getPlayText(lang)} nav={getLearnText(lang).nav} />
    </AppShell>
  )
}
