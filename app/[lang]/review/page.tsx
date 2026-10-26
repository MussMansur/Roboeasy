import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { ReviewSession } from '@/components/learn/review-session'
import { getDictionary, isLocale } from '@/lib/i18n'
import { getLearnText } from '@/lib/i18n/learn'
import { getLearnAppText } from '@/lib/i18n/learn-app'
import { practiceItems } from '@/lib/learn/content'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getLearnAppText(lang).review.title} — RoboEasy`, robots: { index: false } }
}

export default async function ReviewPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <AppShell lang={lang}>
      <ReviewSession lang={lang} t={getLearnText(lang)} app={getLearnAppText(lang)} blocksT={getDictionary(lang).blocks} pool={practiceItems()} />
    </AppShell>
  )
}
