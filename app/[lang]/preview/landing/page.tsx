import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LearnLanding } from '@/components/learn-landing'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getLearnText } from '@/lib/i18n/learn'
import { getDictionary, isLocale } from '@/lib/i18n'
import { getLearnLanding } from '@/lib/i18n/learn-landing'

type Params = { params: Promise<{ lang: string }> }

/** Preview of the learning-platform landing (phase 13); not linked, not indexed. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getLearnLanding(lang)
  return {
    title: `${t.hero.title} ${t.hero.accent} — RoboEasy (preview)`,
    description: t.hero.sub,
    robots: { index: false, follow: false },
  }
}

export default async function LearnLandingPreview({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const dict = getDictionary(lang)
  return (
    <>
      <SiteHeader lang={lang} t={dict.nav} sections={getLearnText(lang).nav} variant="app" />
      <main id="main">
        <LearnLanding lang={lang} t={getLearnLanding(lang)} />
      </main>
      <SiteFooter lang={lang} t={dict.footer} />
    </>
  )
}
