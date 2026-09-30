import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { SeasonEditorLoader } from '@/components/fll/editor-loader'
import { SiteHeader } from '@/components/site-header'
import { DEFAULT_SEASON_ID, SEASON_LIST } from '@/lib/fll/seasons'
import { getDictionary, isLocale } from '@/lib/i18n'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang)
  return { title: t.fll.editor.metaTitle, description: t.fll.editor.lead, alternates: { canonical: `/${lang}/fll/editor` }, robots: { index: false } }
}

export default async function FllEditorPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const t = getDictionary(lang)
  return (
    <>
      <SiteHeader lang={lang} t={t.nav} variant="studio" />
      <main id="main">
        <SeasonEditorLoader lang={lang} seasons={SEASON_LIST} defaultSeasonId={DEFAULT_SEASON_ID} t={t.fll} />
      </main>
    </>
  )
}
