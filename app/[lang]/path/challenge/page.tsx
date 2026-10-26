import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { ChallengeView } from '@/components/learn/challenge-view'
import { getDictionary, isLocale } from '@/lib/i18n'
import { getLearnText } from '@/lib/i18n/learn'
import { getLearnAppText } from '@/lib/i18n/learn-app'
import { clientChallenges } from '@/lib/learn/challenge'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getLearnAppText(lang).challenge.title} — RoboEasy`, robots: { index: false } }
}

export default async function ChallengePage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <AppShell lang={lang}>
      <ChallengeView lang={lang} t={getLearnText(lang)} app={getLearnAppText(lang)} blocksT={getDictionary(lang).blocks} challenges={clientChallenges()} />
    </AppShell>
  )
}
