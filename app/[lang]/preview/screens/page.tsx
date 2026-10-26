import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LearnScreen, LessonScreen, PathScreen } from '@/components/learn/wireframes'
import { isLocale } from '@/lib/i18n'

type Params = { params: Promise<{ lang: string }> }

export const metadata: Metadata = { title: 'Wireframes — RoboEasy', robots: { index: false, follow: false } }

/** Phase 13 wireframes of the learner screens. Development only. */
export default async function ScreensPreview({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang) || process.env.NODE_ENV === 'production') notFound()
  return (
    <main id="main" className="container grid gap-10 py-8">
      <PathScreen />
      <LearnScreen />
      <LessonScreen />
    </main>
  )
}
