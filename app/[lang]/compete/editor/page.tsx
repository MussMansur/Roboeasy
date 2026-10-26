import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { SeasonEditorLoader } from '@/components/fll/editor-loader'
import { AppShell } from '@/components/app-shell'
import { DEFAULT_SEASON_ID, SEASON_LIST } from '@/lib/fll/seasons'
import { getDictionary, isLocale } from '@/lib/i18n'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang)
  return {
    title: t.fll.editor.metaTitle,
    description: t.fll.editor.lead,
    alternates: { canonical: `/${lang}/compete/editor` },
    robots: { index: false },
  }
}

export default async function FllEditorPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const t = getDictionary(lang)
  return (
    <AppShell lang={lang}>
      <SeasonEditorLoader lang={lang} seasons={SEASON_LIST} defaultSeasonId={DEFAULT_SEASON_ID} t={t.fll} />
    </AppShell>
  )
}
