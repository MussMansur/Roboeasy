'use client'

import { useEffect, useState } from 'react'

import { ProgressBar } from '@/components/learn/learn-map'
import { useCloudModule, useCloudUser } from '@/components/learn/use-cloud'
import { Card, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EXPERIMENTS, type Experiment, variantFor } from '@/lib/flags'
import { lessonFunnels, stuckPoints } from '@/lib/learn/analytics'
import type { LearnEvent } from '@/lib/learn/state'
import { findLessonRef } from '@/lib/learn/course'
import { useHydrated, useLearn } from '@/lib/learn/store'

type Lang = 'ru' | 'kk' | 'en'

const T = {
  ru: {
    title: 'Аналитика обучения',
    note: 'Данные только этого браузера. Войдите аккаунтом администратора, чтобы видеть всех учеников.',
    server: 'Данные всех учеников с сервера: {n}.',
    funnel: 'Воронка уроков',
    lesson: 'Урок',
    started: 'Начали',
    finished: 'Закончили',
    median: 'Медиана, мин',
    stuck: 'Где застревают',
    perLearner: 'ошибок на ученика',
    experiments: 'A/B-эксперименты',
    variant: 'Вариант в этом браузере',
    empty: 'Данных пока нет — пройдите пару уроков.',
  },
  kk: {
    title: 'Оқу аналитикасы',
    note: 'Тек осы браузердің деректері. Барлық оқушыларды көру үшін әкімші аккаунтымен кіріңіз.',
    server: 'Сервердегі барлық оқушылардың деректері: {n}.',
    funnel: 'Сабақтар воронкасы',
    lesson: 'Сабақ',
    started: 'Бастады',
    finished: 'Аяқтады',
    median: 'Медиана, мин',
    stuck: 'Қай жерде тұрып қалады',
    perLearner: 'бір оқушыға қате',
    experiments: 'A/B эксперименттер',
    variant: 'Осы браузердегі нұсқа',
    empty: 'Әзірге деректер жоқ — бірнеше сабақ өтіңіз.',
  },
  en: {
    title: 'Learning analytics',
    note: 'This browser’s data only. Sign in with an admin account to see all learners.',
    server: 'All learners’ data from the server: {n}.',
    funnel: 'Lesson funnel',
    lesson: 'Lesson',
    started: 'Started',
    finished: 'Finished',
    median: 'Median, min',
    stuck: 'Where learners get stuck',
    perLearner: 'mistakes per learner',
    experiments: 'A/B experiments',
    variant: 'Variant in this browser',
    empty: 'No data yet — do a couple of lessons.',
  },
}

export function AdminDashboard({ lang }: { lang: Lang }) {
  const hydrated = useHydrated()
  const learn = useLearn()
  const t = T[lang]
  const mod = useCloudModule()
  const user = useCloudUser(mod)
  const [server, setServer] = useState<LearnEvent[][] | null>(null)
  useEffect(() => {
    if (!mod || !user) return
    let alive = true
    void mod.isAdmin().then(async (ok) => {
      if (ok && alive) setServer(await mod.allLearnerEvents())
    })
    return () => {
      alive = false
    }
  }, [mod, user])
  if (!hydrated) return <Skeleton className="container my-10 h-96" />
  const funnels = lessonFunnels(server ?? [learn.events])
  const stuck = stuckPoints(funnels)
  const title = (id: string) => findLessonRef(id)?.ref.title[lang] ?? id

  return (
    <div className="container grid gap-6 py-10">
      <header className="grid gap-2">
        <h1 className="m-0 text-4xl">{t.title}</h1>
        <p className={server ? 'alert alert-ok m-0' : 'alert alert-warn m-0'}>{server ? t.server.replace('{n}', String(server.length)) : t.note}</p>
      </header>
      <Card className="gap-4">
        <CardTitle>{t.funnel}</CardTitle>
        {funnels.length === 0 ? (
          <p className="m-0 text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-(length:--stroke-thin) border-outline">
                  <th className="py-2 pr-4">{t.lesson}</th>
                  <th className="py-2 pr-4">{t.started}</th>
                  <th className="py-2 pr-4">{t.finished}</th>
                  <th className="w-48 py-2 pr-4" aria-hidden="true" />
                  <th className="py-2">{t.median}</th>
                </tr>
              </thead>
              <tbody>
                {funnels.map((f) => (
                  <tr key={f.lesson} className="border-b border-dashed border-border-strong">
                    <td className="py-2 pr-4 font-bold">{title(f.lesson)}</td>
                    <td className="py-2 pr-4">{f.started}</td>
                    <td className="py-2 pr-4">{f.finished}</td>
                    <td className="py-2 pr-4">
                      <ProgressBar value={f.started ? f.finished / f.started : 0} label={`${t.finished} / ${t.started}`} />
                    </td>
                    <td className="py-2">{f.medianSeconds === null ? '—' : (f.medianSeconds / 60).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-3">
          <CardTitle>{t.stuck}</CardTitle>
          {stuck.length === 0 ? (
            <p className="m-0 text-muted-foreground">{t.empty}</p>
          ) : (
            <ol className="m-0 grid gap-2 pl-5">
              {stuck.map((s) => (
                <li key={`${s.lesson}/${s.step}`}>
                  <strong>{title(s.lesson)}</strong> · {s.step} — {s.mistakesPerLearner.toFixed(1)} {t.perLearner}
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="gap-3">
          <CardTitle>{t.experiments}</CardTitle>
          <ul className="m-0 grid gap-2 pl-5">
            {(Object.keys(EXPERIMENTS) as Experiment[]).map((e) => (
              <li key={e}>
                <strong>{e}</strong>: {EXPERIMENTS[e].join(' / ')} — {t.variant}: <code>{variantFor(e, learn.profile?.anonId)}</code>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
