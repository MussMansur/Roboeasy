import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DesignSystem } from '@/components/design-system'
import { SiteHeader } from '@/components/site-header'
import { getLearnText } from '@/lib/i18n/learn'
import { getDictionary, isLocale } from '@/lib/i18n'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang)
  return {
    title: t.design.metaTitle,
    description: t.design.lead,
    robots: { index: false },
  }
}

export default async function DesignPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const t = getDictionary(lang)
  return (
    <>
      <SiteHeader lang={lang} t={t.nav} sections={getLearnText(lang).nav} variant="app" />
      <main id="main">
        <DesignSystem t={t.design} />
      </main>
    </>
  )
}
