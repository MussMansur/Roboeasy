import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { UnitTest } from '@/components/learn/tests'
import { getDictionary, isLocale, locales } from '@/lib/i18n'
import { fill } from '@/lib/i18n/config'
import { getLearnText } from '@/lib/i18n/learn'
import { getLearnAppText } from '@/lib/i18n/learn-app'
import { COURSE, practiceItems, spread } from '@/lib/learn/content'
import { UNIT_TEST_MAX } from '@/lib/learn/placement'

type Params = { params: Promise<{ lang: string; track: string; unit: string }> }

function find(trackId: string, unitId: string) {
  const track = COURSE.tracks.find((t) => t.id === trackId)
  const unit = track?.units.find((u) => u.id === unitId)
  if (!track || !unit) return null
  return { track, unit, items: spread(practiceItems(unit.lessons.filter((l) => l.status === 'ready').map((l) => l.id)), UNIT_TEST_MAX) }
}

export function generateStaticParams() {
  return locales.flatMap((lang) => COURSE.tracks.flatMap((t) => t.units.filter((u) => (find(t.id, u.id)?.items.length ?? 0) > 0).map((u) => ({ lang, track: t.id, unit: u.id }))))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, track, unit } = await params
  const found = find(track, unit)
  if (!isLocale(lang) || !found) return {}
  return { title: `${fill(getLearnAppText(lang).test.unitTitle, { unit: found.unit.title[lang] })} — RoboEasy`, robots: { index: false } }
}

export default async function UnitTestPage({ params }: Params) {
  const { lang, track, unit } = await params
  const found = find(track, unit)
  if (!isLocale(lang) || !found) notFound()
  return (
    <AppShell lang={lang}>
      <UnitTest lang={lang} t={getLearnText(lang)} app={getLearnAppText(lang)} blocksT={getDictionary(lang).blocks} items={found.items} trackId={track} unitId={unit} />
    </AppShell>
  )
}
