import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FllPlanner } from '@/components/fll/planner'
import { AppShell } from '@/components/app-shell'
import { DEFAULT_SEASON_ID, SEASON_LIST } from '@/lib/fll/seasons'
import { getDictionary, isLocale } from '@/lib/i18n'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang)
  return {
    title: t.fll.metaTitle,
    description: t.fll.lead,
    alternates: { canonical: `/${lang}/compete` },
  }
}

export default async function FllPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const t = getDictionary(lang)
  return (
    <AppShell lang={lang}>
      <FllPlanner
        lang={lang}
        seasons={SEASON_LIST}
        defaultSeasonId={DEFAULT_SEASON_ID}
        t={t.fll}
        robotT={t.studio.robot}
        labels={t.blocks}
        formatT={{ blocks: t.studio.blocks, python: t.studio.python }}
      />
    </AppShell>
  )
}
