import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FllPlanner } from '@/components/fll/planner'
import { SiteHeader } from '@/components/site-header'
import { DEFAULT_SEASON_ID, getSeason } from '@/lib/fll/seasons'
import { getDictionary, isLocale } from '@/lib/i18n'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang)
  return { title: t.fll.metaTitle, description: t.fll.lead, alternates: { canonical: `/${lang}/fll` } }
}

export default async function FllPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const t = getDictionary(lang)
  const season = getSeason(DEFAULT_SEASON_ID)
  if (!season) notFound()
  return (
    <>
      <SiteHeader lang={lang} t={t.nav} variant="studio" />
      <main id="main">
        <FllPlanner
          lang={lang}
          season={season}
          t={t.fll}
          robotT={t.studio.robot}
          labels={t.blocks}
          formatT={{ blocks: t.studio.blocks, python: t.studio.python }}
        />
      </main>
    </>
  )
}
