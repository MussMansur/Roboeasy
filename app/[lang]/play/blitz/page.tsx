import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { BlitzGame } from '@/components/learn/games/blitz-game'
import { isLocale } from '@/lib/i18n'
import { getPlayText } from '@/lib/i18n/play'
import { practiceItems } from '@/lib/learn/content'
import type { LessonChoice } from '@/lib/learn/games/quiz'
type Params = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getPlayText(lang).play.games.blitz.title} — RoboEasy`, robots: { index: false } }
}

export default async function BlitzPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  // Lesson quizzes with exactly one right option.
  const lessons: LessonChoice[] = practiceItems().flatMap(({ key, step }) =>
    step.type === 'quiz' && step.kind === 'choice' && step.correct.length === 1
      ? [{ key, question: step.question, options: step.options, correct: step.correct[0] }]
      : [],
  )
  return (
    <AppShell lang={lang}>
      <BlitzGame lang={lang} t={getPlayText(lang)} lessons={lessons} />
    </AppShell>
  )
}
