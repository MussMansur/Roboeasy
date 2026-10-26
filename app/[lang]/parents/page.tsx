import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { LegalView } from '@/components/legal-page'
import { isLocale } from '@/lib/i18n'
import { getLegal } from '@/lib/i18n/legal'

type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const page = getLegal('parents', lang)
  return { title: `${page.title} — RoboEasy`, description: page.lead, alternates: { canonical: `/${lang}/parents` } }
}

export default async function ParentsPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <AppShell lang={lang}>
      <LegalView page={getLegal('parents', lang)} />
    </AppShell>
  )
}
