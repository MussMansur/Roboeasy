import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { PlacementTest } from '@/components/learn/tests'
import { getDictionary, isLocale } from '@/lib/i18n'
import { getLearnText } from '@/lib/i18n/learn'
import { getLearnAppText } from '@/lib/i18n/learn-app'
import { practiceItems } from '@/lib/learn/content'
import { PLACEMENT_ITEMS } from '@/lib/learn/placement'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getLearnAppText(lang)
  return { title: `${t.placement.title} — RoboEasy`, description: t.placement.lead, alternates: { canonical: `/${lang}/learn/placement` } }
}

export default async function PlacementPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const pool = new Map(practiceItems().map((i) => [i.key, i]))
  const items = PLACEMENT_ITEMS.flatMap((k) => pool.get(k) ?? [])
  return (
    <AppShell lang={lang}>
      <PlacementTest lang={lang} t={getLearnText(lang)} app={getLearnAppText(lang)} blocksT={getDictionary(lang).blocks} items={items} />
    </AppShell>
  )
}
