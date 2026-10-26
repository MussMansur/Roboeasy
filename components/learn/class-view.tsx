'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, LogOut, Play, Radio, Square, Trash2, Trophy, Users } from 'lucide-react'
import { toast } from 'sonner'

import { BlockStack } from '@/components/block-stack'
import { CLOUD_CONFIGURED, useCloudModule, useCloudUser } from '@/components/learn/use-cloud'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DEFAULT_ROBOT, type Step } from '@/lib/dsl/types'
import { fill } from '@/lib/i18n/config'
import type { LearnAppText } from '@/lib/i18n/learn-app'
import type { Dictionary } from '@/lib/i18n/ru'
import { lessonFunnels, stuckPoints } from '@/lib/learn/analytics'
import type { AssignmentRow, ClassRow, LeaderRow, OverviewRow } from '@/lib/learn/cloud'
import { COURSE, findLessonRef } from '@/lib/learn/course'
import type { LearnEvent } from '@/lib/learn/state'
import { completedLessons } from '@/lib/learn/state'
import { useHydrated, useLearn } from '@/lib/learn/store'

type Lang = 'ru' | 'kk' | 'en'
type Cloud = typeof import('@/lib/learn/cloud')

const READY = COURSE.tracks.flatMap((t) => t.units.flatMap((u) => u.lessons.filter((l) => l.status === 'ready').map((l) => ({ id: l.id, track: t.id, title: l.title }))))

function lessonTitle(id: string, lang: Lang) {
  return findLessonRef(id)?.ref.title[lang] ?? id
}
function lessonHref(id: string, lang: Lang) {
  const ref = findLessonRef(id)
  return ref ? `/${lang}/learn/${ref.track.id}/${id}` : `/${lang}/learn`
}

export function ClassView({ lang, app, blocksT }: { lang: Lang; app: LearnAppText; blocksT: Dictionary['blocks'] }) {
  const t = app.classes
  const hydrated = useHydrated()
  const learn = useLearn()
  const mod = useCloudModule()
  const user = useCloudUser(mod)
  const [classes, setClasses] = useState<ClassRow[] | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (!mod || !user) return
    let alive = true
    void mod.startSync()
    void mod
      .myClasses()
      .then((c) => alive && setClasses(c))
      .catch(() => alive && setClasses([]))
    // Live lessons and new assignments show up without a reload.
    const id = setInterval(() => void mod.myClasses().then((c) => alive && setClasses(c)), 20_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [mod, user, tick])

  const header = (
    <header className="grid gap-2">
      <h1 className="m-0 flex items-center gap-3 text-4xl">
        <Users className="size-9" aria-hidden="true" />
        {t.title}
      </h1>
      <p className="m-0 max-w-2xl text-lg text-muted-foreground">{t.lead}</p>
    </header>
  )

  if (!CLOUD_CONFIGURED)
    return (
      <div className="container grid gap-6 py-10">
        {header}
        <p className="alert m-0">{app.account.unavailable}</p>
      </div>
    )
  if (!hydrated || user === undefined)
    return (
      <div className="container grid gap-6 py-10">
        {header}
        <Skeleton className="h-48" />
      </div>
    )
  if (!user)
    return (
      <div className="container grid gap-6 py-10">
        {header}
        <Card className="gap-3">
          <p className="m-0 text-lg font-bold">{t.signIn}</p>
          <Link className={buttonVariants({ variant: 'primary', className: 'justify-self-start' })} href={`/${lang}/profile#account`}>
            {t.toProfile}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Card>
      </div>
    )
  if (!learn.profile)
    return (
      <div className="container grid gap-6 py-10">
        {header}
        <Card className="gap-3">
          <p className="m-0 text-lg font-bold">{t.needProfile}</p>
          <Link className={buttonVariants({ variant: 'primary', className: 'justify-self-start' })} href={`/${lang}/path`}>
            {app.placement.toPath}
          </Link>
        </Card>
      </div>
    )

  const member = (classes ?? []).filter((c) => c.teacher_id !== user.id)
  const teaching = (classes ?? []).filter((c) => c.teacher_id === user.id)
  const adult = learn.profile.ageRange === '16-plus'

  return (
    <div className="container grid gap-6 py-10">
      {header}
      {mod && <JoinForm mod={mod} app={app} onJoined={reload} />}
      {classes === null ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <section className="grid gap-4" aria-labelledby="my-classes">
            <h2 id="my-classes" className="m-0 text-2xl">
              {t.myClasses}
            </h2>
            {member.length === 0 && <p className="m-0 text-muted-foreground">{t.none}</p>}
            {mod && member.map((c) => <StudentClass key={c.id} cls={c} mod={mod} lang={lang} app={app} userId={user.id} done={completedLessons(learn)} onLeft={reload} />)}
          </section>
          <section className="grid gap-4 border-t-(length:--stroke-thin) border-dashed border-outline pt-6" aria-labelledby="teacher">
            <h2 id="teacher" className="m-0 text-2xl">
              {t.teacher}
            </h2>
            <p className="m-0 max-w-2xl text-muted-foreground">{adult ? t.teacherLead : t.teacherAdults}</p>
            {adult && mod && <CreateClass mod={mod} app={app} onCreated={reload} />}
            {mod && teaching.map((c) => <TeacherClass key={c.id} cls={c} mod={mod} lang={lang} app={app} blocksT={blocksT} onChanged={reload} />)}
          </section>
        </>
      )}
    </div>
  )
}

function JoinForm({ mod, app, onJoined }: { mod: Cloud; app: LearnAppText; onJoined: () => void }) {
  const t = app.classes
  const id = useId()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Card className="gap-3">
      <CardTitle>{t.joinTitle}</CardTitle>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const joined = await mod.joinClass(code)
          setBusy(false)
          if (joined) {
            toast.success(fill(t.joined, { name: joined.name }))
            setCode('')
            onJoined()
          } else toast.error(t.joinError)
        }}
      >
        <label className="grid gap-1 font-bold" htmlFor={`${id}-code`}>
          {t.joinCode}
          <input
            id={`${id}-code`}
            className="input w-40 font-mono text-xl tracking-[0.3em] uppercase"
            value={code}
            maxLength={6}
            autoComplete="off"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            aria-describedby={`${id}-hint`}
          />
        </label>
        <button type="submit" className={buttonVariants({ variant: 'primary', size: 'sm' })} disabled={code.length !== 6 || busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {t.join}
        </button>
      </form>
      <p id={`${id}-hint`} className="m-0 text-sm text-muted-foreground">
        {t.joinHint}
      </p>
    </Card>
  )
}

function LiveBanner({ lesson, lang, app }: { lesson: string; lang: Lang; app: LearnAppText }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-(--radius-md) border-(length:--stroke) border-outline bg-primary p-3 text-primary-foreground" role="status">
      <Radio className="size-5 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      <span className="flex-1 font-bold">{fill(app.classes.live, { lesson: lessonTitle(lesson, lang) })}</span>
      <Link className={buttonVariants({ size: 'sm' })} href={lessonHref(lesson, lang)}>
        {app.classes.liveJoin}
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  )
}

function StudentClass({ cls, mod, lang, app, userId, done, onLeft }: { cls: ClassRow; mod: Cloud; lang: Lang; app: LearnAppText; userId: string; done: Set<string>; onLeft: () => void }) {
  const t = app.classes
  const [tasks, setTasks] = useState<AssignmentRow[] | null>(null)
  const [board, setBoard] = useState<LeaderRow[] | null>(null)
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang, { day: 'numeric', month: 'long' }), [lang])

  useEffect(() => {
    let alive = true
    void mod.assignments([cls.id]).then((a) => alive && setTasks(a)).catch(() => alive && setTasks([]))
    void mod.classLeaderboard(cls.id).then((b) => alive && setBoard(b)).catch(() => alive && setBoard([]))
    return () => {
      alive = false
    }
  }, [mod, cls.id])

  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>{cls.name}</CardTitle>
        <button
          type="button"
          className={buttonVariants({ size: 'sm', variant: 'ghost' })}
          onClick={async () => {
            if (!window.confirm(fill(t.leaveConfirm, { name: cls.name }))) return
            await mod.leaveClass(cls.id, userId)
            onLeft()
          }}
        >
          <LogOut aria-hidden="true" />
          {t.leave}
        </button>
      </div>
      {cls.live_lesson && <LiveBanner lesson={cls.live_lesson} lang={lang} app={app} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <h3 className="m-0 text-lg">{t.assignments}</h3>
          {tasks === null ? (
            <Skeleton className="h-20" />
          ) : tasks.length === 0 ? (
            <p className="m-0 text-muted-foreground">{t.noAssignments}</p>
          ) : (
            <ul className="m-0 grid list-none gap-2 p-0">
              {tasks.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-(--radius-sm) border-(length:--stroke-thin) border-outline bg-surface-2 px-3 py-2">
                  <span className="min-w-0 flex-1 font-bold">{lessonTitle(a.lesson_id, lang)}</span>
                  {a.due_at && <span className="text-sm text-muted-foreground">{fill(t.due, { date: dateFmt.format(new Date(a.due_at)) })}</span>}
                  {done.has(a.lesson_id) ? (
                    <Badge variant="success">
                      <Check aria-hidden="true" />
                      {t.done}
                    </Badge>
                  ) : (
                    <Link className={buttonVariants({ size: 'sm', variant: 'primary' })} href={lessonHref(a.lesson_id, lang)}>
                      {t.open}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid content-start gap-2">
          <h3 className="m-0 flex items-center gap-2 text-lg">
            <Trophy className="size-5" aria-hidden="true" />
            {t.leaderboard}
          </h3>
          {board === null ? (
            <Skeleton className="h-20" />
          ) : (
            <ol className="m-0 grid gap-1 pl-6">
              {board.map((r, i) => (
                <li key={`${r.nickname}-${i}`} className={r.is_me ? 'font-extrabold' : ''}>
                  {r.nickname}
                  {r.is_me && ` (${t.you})`} — {r.xp} XP
                </li>
              ))}
            </ol>
          )}
          <p className="m-0 text-xs text-muted-foreground">{t.leaderNote}</p>
        </div>
      </div>
    </Card>
  )
}

function CreateClass({ mod, app, onCreated }: { mod: Cloud; app: LearnAppText; onCreated: () => void }) {
  const t = app.classes
  const id = useId()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await mod.createClass(name.trim())
          setName('')
          onCreated()
        } catch {
          toast.error(t.error)
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="grid gap-1 font-bold" htmlFor={`${id}-name`}>
        {t.className}
        <input id={`${id}-name`} className="input w-72 max-w-full" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} required />
      </label>
      <button type="submit" className={buttonVariants({ variant: 'primary', size: 'sm' })} disabled={!name.trim() || busy}>
        {t.create}
      </button>
    </form>
  )
}

function TeacherClass({ cls, mod, lang, app, blocksT, onChanged }: { cls: ClassRow; mod: Cloud; lang: Lang; app: LearnAppText; blocksT: Dictionary['blocks']; onChanged: () => void }) {
  const t = app.classes
  const id = useId()
  const [overview, setOverview] = useState<OverviewRow[] | null>(null)
  const [tasks, setTasks] = useState<AssignmentRow[]>([])
  const [events, setEvents] = useState<Map<string, LearnEvent[]>>(new Map())
  const [student, setStudent] = useState<OverviewRow | null>(null)
  const [newLesson, setNewLesson] = useState(READY[0]?.id ?? '')
  const [newDue, setNewDue] = useState('')
  const [liveLesson, setLiveLesson] = useState(cls.live_lesson ?? READY[0]?.id ?? '')
  const [tick, setTick] = useState(0)
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), [lang])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [o, a] = await Promise.all([mod.classOverview(cls.id), mod.assignments([cls.id])])
        if (!alive) return
        setOverview(o)
        setTasks(a)
        const ev = await mod.classEvents(o.map((r) => r.user_id))
        if (alive) setEvents(ev)
      } catch {
        if (alive) setOverview([])
      }
    })()
    return () => {
      alive = false
    }
  }, [mod, cls.id, tick])

  const stuck = useMemo(() => stuckPoints(lessonFunnels([...events.values()]), 5), [events])
  const lessonOptions = READY.map((l) => (
    <option key={l.id} value={l.id}>
      {l.title[lang]}
    </option>
  ))

  if (student) return <StudentDetail cls={cls} row={student} mod={mod} lang={lang} app={app} blocksT={blocksT} onBack={() => setStudent(null)} />

  return (
    <Card className="gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>{cls.name}</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-muted-foreground">{t.code}:</span>
          <code className="rounded-(--radius-sm) border-(length:--stroke-thin) border-outline bg-surface-2 px-3 py-1 font-mono text-xl font-bold tracking-[0.3em]" data-testid="join-code">
            {cls.join_code}
          </code>
          <button
            type="button"
            className={buttonVariants({ size: 'icon-sm', variant: 'ghost' })}
            aria-label={t.copy}
            title={t.copy}
            onClick={() => void navigator.clipboard?.writeText(cls.join_code).then(() => toast.success(t.copied))}
          >
            <Copy aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Live lesson */}
      <div className="grid gap-2 rounded-(--radius-md) border-(length:--stroke-thin) border-outline bg-surface-2 p-3">
        <h3 className="m-0 flex items-center gap-2 text-lg">
          <Radio className="size-5" aria-hidden="true" />
          {t.liveTitle}
        </h3>
        {cls.live_lesson ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{fill(t.liveNow, { lesson: lessonTitle(cls.live_lesson, lang) })}</span>
            <button type="button" className={buttonVariants({ size: 'sm' })} onClick={() => void mod.setLiveLesson(cls.id, null).then(onChanged)}>
              <Square aria-hidden="true" />
              {t.liveStop}
            </button>
          </div>
        ) : (
          <>
            <p className="m-0 text-sm text-muted-foreground">{t.liveText}</p>
            <div className="flex flex-wrap items-center gap-2">
              <select className="select max-w-xs" aria-label={t.lesson} value={liveLesson} onChange={(e) => setLiveLesson(e.target.value)}>
                {lessonOptions}
              </select>
              <button type="button" className={buttonVariants({ size: 'sm', variant: 'primary' })} onClick={() => void mod.setLiveLesson(cls.id, liveLesson).then(onChanged)}>
                <Play aria-hidden="true" />
                {t.liveStart}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Students */}
      <div className="grid gap-2">
        <h3 className="m-0 text-lg">{t.students}</h3>
        {overview === null ? (
          <Skeleton className="h-24" />
        ) : overview.length === 0 ? (
          <p className="m-0 text-muted-foreground">{t.noStudents}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-(length:--stroke-thin) border-outline">
                  <th className="py-2 pr-3">{t.nickname}</th>
                  <th className="py-2 pr-3">{t.lessons}</th>
                  <th className="py-2 pr-3">{t.xp}</th>
                  <th className="py-2 pr-3">{t.mistakes}</th>
                  <th className="py-2 pr-3">{t.lastActive}</th>
                  {tasks.map((a) => (
                    <th key={a.id} className="py-2 pr-3" title={lessonTitle(a.lesson_id, lang)}>
                      {a.lesson_id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.map((r) => {
                  const doneIds = new Set((events.get(r.user_id) ?? []).flatMap((e) => (e.kind === 'lesson_done' ? [e.lesson] : [])))
                  return (
                    <tr key={r.user_id} className="border-b border-dashed border-border-strong">
                      <td className="py-2 pr-3">
                        <button type="button" className="font-bold text-link underline underline-offset-4" onClick={() => setStudent(r)}>
                          {r.nickname}
                        </button>
                      </td>
                      <td className="py-2 pr-3">{r.lessons_done}</td>
                      <td className="py-2 pr-3">{r.xp}</td>
                      <td className="py-2 pr-3">{r.mistakes}</td>
                      <td className="py-2 pr-3">{r.last_active ? dateFmt.format(new Date(r.last_active)) : t.never}</td>
                      {tasks.map((a) => (
                        <td key={a.id} className="py-2 pr-3">
                          {doneIds.has(a.lesson_id) ? <Check className="size-4 text-success" aria-label={t.done} /> : '·'}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Stuck points */}
        <div className="grid content-start gap-2">
          <h3 className="m-0 text-lg">{t.stuck}</h3>
          {stuck.length === 0 ? (
            <p className="m-0 text-muted-foreground">{t.noStuck}</p>
          ) : (
            <ol className="m-0 grid gap-1 pl-6">
              {stuck.map((s) => (
                <li key={`${s.lesson}/${s.step}`}>
                  <strong>{lessonTitle(s.lesson, lang)}</strong> · {s.step} — {s.mistakesPerLearner.toFixed(1)} {t.perStudent}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Assignments */}
        <div className="grid content-start gap-2">
          <h3 className="m-0 text-lg">{t.assignments}</h3>
          <ul className="m-0 grid list-none gap-1 p-0">
            {tasks.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <span className="flex-1">
                  {lessonTitle(a.lesson_id, lang)}
                  {a.due_at && <span className="text-sm text-muted-foreground"> · {fill(t.due, { date: dateFmt.format(new Date(a.due_at)) })}</span>}
                </span>
                <button type="button" className={buttonVariants({ size: 'icon-sm', variant: 'ghost' })} aria-label={t.remove} title={t.remove} onClick={() => void mod.removeAssignment(a.id).then(() => setTick((n) => n + 1))}>
                  <Trash2 aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await mod.addAssignment(cls.id, newLesson, newDue ? new Date(newDue).toISOString() : null)
                setTick((n) => n + 1)
              } catch {
                toast.error(t.error)
              }
            }}
          >
            <label className="grid gap-1 text-sm font-bold" htmlFor={`${id}-lesson`}>
              {t.lesson}
              <select id={`${id}-lesson`} className="select max-w-xs" value={newLesson} onChange={(e) => setNewLesson(e.target.value)}>
                {lessonOptions}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold" htmlFor={`${id}-due`}>
              {t.dueDate}
              <input id={`${id}-due`} type="datetime-local" className="input" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
            </label>
            <button type="submit" className={buttonVariants({ size: 'sm' })}>
              {t.add}
            </button>
          </form>
        </div>
      </div>
    </Card>
  )
}

function StudentDetail({ cls, row, mod, lang, app, blocksT, onBack }: { cls: ClassRow; row: OverviewRow; mod: Cloud; lang: Lang; app: LearnAppText; blocksT: Dictionary['blocks']; onBack: () => void }) {
  const t = app.classes
  const [events, setEvents] = useState<LearnEvent[] | null>(null)
  const [photos, setPhotos] = useState<{ lesson: string; url: string }[]>([])
  useEffect(() => {
    let alive = true
    void mod.learnerEvents(row.user_id).then((e) => alive && setEvents(e)).catch(() => alive && setEvents([]))
    void mod.robotPhotos(cls.id, row.user_id).then((p) => alive && setPhotos(p))
    return () => {
      alive = false
    }
  }, [mod, cls.id, row.user_id])
  const solutions = (events ?? []).flatMap((e) => (e.kind === 'step_done' && e.program?.length ? [e] : []))

  return (
    <Card className="gap-4">
      <button type="button" className={buttonVariants({ size: 'sm', variant: 'ghost', className: 'justify-self-start' })} onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        {t.back}
      </button>
      <CardTitle>
        {t.student}: {row.nickname}
      </CardTitle>
      <p className="m-0 text-muted-foreground">
        {t.lessons}: {row.lessons_done} · XP: {row.xp} · {t.mistakes}: {row.mistakes}
      </p>
      <h3 className="m-0 text-lg">{t.solutions}</h3>
      {events === null ? (
        <Skeleton className="h-24" />
      ) : solutions.length === 0 ? (
        <p className="m-0 text-muted-foreground">{t.noSolutions}</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {solutions.map((s) => (
            <li key={s.id} className="grid gap-2 rounded-(--radius-md) border-(length:--stroke-thin) border-outline bg-surface-2 p-3">
              <span className="font-bold">
                {lessonTitle(s.lesson, lang)} · {s.step}
              </span>
              <div className="canvas">
                <BlockStack program={{ steps: s.program as Step[] }} labels={blocksT} robot={DEFAULT_ROBOT} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <h3 className="m-0 text-lg">{t.photos}</h3>
      {photos.length === 0 ? (
        <p className="m-0 text-muted-foreground">{t.noPhotos}</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
          {photos.map((p) => (
            <li key={p.lesson} className="grid gap-1">
              {/* Signed, short-lived URLs from private storage: a plain img is right here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${row.nickname} — ${lessonTitle(p.lesson, lang)}`} className="aspect-square w-full rounded-(--radius-sm) border-(length:--stroke-thin) border-outline object-cover" />
              <span className="text-sm">{lessonTitle(p.lesson, lang)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
