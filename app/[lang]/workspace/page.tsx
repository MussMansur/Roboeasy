import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { SiteHeader } from '@/components/site-header'
import { Studio } from '@/components/studio/studio'
import { getDictionary, isLocale } from '@/lib/i18n'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang)
  return { title: t.meta.studioTitle, alternates: { canonical: `/${lang}/workspace` } }
}

export default async function WorkspacePage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const t = getDictionary(lang)
  return (
    <>
      <SiteHeader lang={lang} t={t.nav} variant="studio" />
      <main id="main">
        <Studio lang={lang} t={t.studio} labels={t.blocks} />
      </main>
    </>
  )
}
