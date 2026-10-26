import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { TrackMap } from '@/components/learn/track-map'
import { isLocale, locales } from '@/lib/i18n'
import { getLearnAppText } from '@/lib/i18n/learn-app'
import { COURSE, practiceItems } from '@/lib/learn/content'

type Params = { params: Promise<{ lang: string; track: string }> }

export function generateStaticParams() {
  return locales.flatMap((lang) => COURSE.tracks.map((t) => ({ lang, track: t.id })))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, track: id } = await params
  const track = COURSE.tracks.find((t) => t.id === id)
  if (!isLocale(lang) || !track) return {}
  return { title: `${track.title[lang]} — RoboEasy`, description: track.description[lang], alternates: { canonical: `/${lang}/learn/${id}` } }
}

export default async function TrackPage({ params }: Params) {
  const { lang, track: id } = await params
  const track = COURSE.tracks.find((t) => t.id === id)
  if (!isLocale(lang) || !track) notFound()
  // Units whose ready lessons have quiz or predict questions get an "I already know this" test.
  const testUnits = track.units.filter((u) => practiceItems(u.lessons.filter((l) => l.status === 'ready').map((l) => l.id)).length > 0).map((u) => u.id)
  return (
    <AppShell lang={lang}>
      <TrackMap trackId={track.id} lang={lang} app={getLearnAppText(lang)} testUnits={testUnits} />
    </AppShell>
  )
}
