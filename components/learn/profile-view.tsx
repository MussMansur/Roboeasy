'use client'

import { useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Award, CalendarPlus, Download, Lock, Settings, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { ProgressBar } from '@/components/learn/learn-map'
import { Onboarding } from '@/components/learn/onboarding'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fill } from '@/lib/i18n/config'
import type { LearnAppText } from '@/lib/i18n/learn-app'
import { ACHIEVEMENTS, recordedAchievements } from '@/lib/learn/achievements'
import { COSMETICS, type CosmeticKind, isUnlocked } from '@/lib/learn/cosmetics'
import { COURSE } from '@/lib/learn/course'
import { reminderIcs } from '@/lib/learn/reminders'
import { type Profile, parseState, stateSchema } from '@/lib/learn/state'
import { clearLearnState, replaceState, updateProfile, useHydrated } from '@/lib/learn/store'
import { type DayStatus, addDays } from '@/lib/learn/streak'
import { useProgress } from '@/lib/learn/use-progress'
import { cn } from '@/lib/utils'

type Lang = 'ru' | 'kk' | 'en'
const GOALS = { l1: { kind: 'lessons', n: 1 }, l2: { kind: 'lessons', n: 2 }, m15: { kind: 'minutes', n: 15 } } as const satisfies Record<string, Profile['goal']>
const goalKey = (g: Profile['goal']) => (g.kind === 'minutes' ? 'm15' : g.n === 2 ? 'l2' : 'l1')

const DAY_STYLE: Record<DayStatus | 'none', string> = {
  met: 'bg-success border-outline',
  frozen: 'bg-[#bfe3ff] border-outline',
  missed: 'bg-surface-2 border-dashed border-border-strong',
  rest: 'bg-surface-3 border-border-strong',
  today: 'bg-card border-outline ring-3 ring-(--focus)',
  none: 'bg-transparent border-transparent',
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A small top-down robot in the chosen looks. */
function RobotPreview({ color, sticker, wheels }: { color: string; sticker: string; wheels: string }) {
  const big = wheels === 'offroad'
  return (
    <svg viewBox="-110 -100 220 200" className="w-40" aria-hidden="true">
      {[-1, 1].map((side) => (
        <g key={side}>
          <rect x={-85 - (big ? 7 : 0)} y={side < 0 ? -65 - (big ? 30 : 22) + 4 : 61} width={big ? 84 : 70} height={big ? 30 : 22} rx="6" fill="#1b1f2a" />
          {wheels === 'racing' && <rect x={-79} y={side < 0 ? -76 : 69} width={58} height={6} rx="3" fill="#ffc531" />}
        </g>
      ))}
      <rect x={-85} y={-65} width={170} height={130} rx="18" fill={color} stroke="#1b1f2a" strokeWidth="7" />
      <rect x={-30} y={-34} width={60} height={68} rx="10" fill="#fff7e8" stroke="#1b1f2a" strokeWidth="4" />
      {sticker && (
        <text x={0} y={2} fontSize="40" textAnchor="middle" dominantBaseline="central">
          {sticker}
        </text>
      )}
      <path d="M79 -22 L111 0 L79 22 Z" fill="#1b1f2a" />
    </svg>
  )
}

export function ProfileView({ lang, app }: { lang: Lang; app: LearnAppText }) {
  const hydrated = useHydrated()
  const p = useProgress()
  const id = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [joining, setJoining] = useState(false)
  const t = app.profile
  const earned = useMemo(() => recordedAchievements(p.state), [p.state])
  const zones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      return ['UTC']
    }
  }, [])

  if (!hydrated) return <Skeleton className="container my-10 h-96" />
  const profile = p.state.profile
  if (!profile || joining) return <Onboarding lang={lang} app={app} onSaved={() => setJoining(true)} onDone={() => setJoining(false)} />

  const dateFmt = new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang, { day: 'numeric', month: 'long', year: 'numeric' })
  const certificates = p.state.events.flatMap((e) => (e.kind === 'certificate' ? [e] : []))
  const unlockedAch = new Set(earned.keys())
  const under16 = profile.ageRange !== '16-plus'

  // Calendar: 5 weeks ending this week, Monday first.
  const todayKey = p.streak.today.key
  const weekday = (new Date(`${todayKey}T00:00:00Z`).getUTCDay() + 6) % 7
  const firstKey = addDays(todayKey, -weekday - 28)
  const calendar = Array.from({ length: 35 }, (_, i) => addDays(firstKey, i))

  const save = (patch: Partial<Profile>) => {
    updateProfile(patch)
    toast.success(t.saved)
  }

  const exportData = () => download(`roboeasy-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(p.state, null, 2), 'application/json')
  const importData = async (file: File) => {
    try {
      const parsed = stateSchema.safeParse(JSON.parse(await file.text()))
      if (!parsed.success) throw new Error('invalid')
      replaceState(parseState(parsed.data))
      toast.success(t.importDone)
    } catch {
      toast.error(t.importBad)
    }
  }
  const deleteAll = () => {
    if (!window.confirm(t.deleteConfirm)) return
    clearLearnState()
    toast.success(t.deleted)
  }

  const kinds: { kind: CosmeticKind; title: string; field: keyof Profile['cosmetics'] }[] = [
    { kind: 'color', title: t.color, field: 'color' },
    { kind: 'sticker', title: t.sticker, field: 'sticker' },
    { kind: 'wheels', title: t.wheels, field: 'wheels' },
  ]
  const colorHex = COSMETICS.find((c) => c.kind === 'color' && c.id === profile.cosmetics.color)?.value ?? '#ffc531'
  const stickerValue = COSMETICS.find((c) => c.kind === 'sticker' && c.id === profile.cosmetics.sticker)?.value ?? ''

  return (
    <div className="container grid gap-6 py-8 md:py-12">
      <header className="flex flex-wrap items-center gap-4">
        <span className="grid size-16 place-items-center rounded-full border-(length:--stroke) border-outline font-display text-3xl font-extrabold shadow-(--shadow-press)" style={{ background: colorHex }} aria-hidden="true">
          {profile.nickname.slice(0, 1).toUpperCase()}
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <h1 className="m-0 text-4xl">{profile.nickname}</h1>
          <p className="m-0 font-bold text-muted-foreground">{fill(app.path.level, { n: p.level.index + 1, title: p.level.title[lang] })}</p>
          <ProgressBar value={p.level.progress} label={app.path.level} className="max-w-sm" />
        </div>
        <dl className="m-0 grid grid-cols-3 gap-3 text-center">
          {[
            [t.xpTotal, p.xp],
            [t.lessonsDone, p.state.events.filter((e) => e.kind === 'lesson_done').length],
            [app.path.streak, fill(app.path.streakDays, { n: p.streak.current })],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-(--radius-sm) border-(length:--stroke-thin) border-outline bg-card px-3 py-2">
              <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
              <dd className="m-0 font-display text-xl font-extrabold">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-4">
          <CardTitle>{t.calendar}</CardTitle>
          <ol className="m-0 grid max-w-sm list-none grid-cols-7 gap-1.5 p-0" aria-label={t.calendar}>
            {calendar.map((key) => {
              const status: DayStatus | 'none' = key > todayKey ? 'none' : (p.streak.days.get(key) ?? (key === todayKey ? 'today' : 'none'))
              return (
                <li
                  key={key}
                  className={cn('grid aspect-square place-items-center rounded-(--radius-xs) border-(length:--stroke-thin) text-xs font-bold', DAY_STYLE[status], key > todayKey && 'opacity-30')}
                  title={status === 'none' ? key : `${key}: ${t.dayStatus[status]}`}
                  aria-label={status === 'none' ? key : `${key}: ${t.dayStatus[status]}`}
                >
                  {Number(key.slice(8))}
                </li>
              )
            })}
          </ol>
          <ul className="m-0 flex list-none flex-wrap gap-3 p-0 text-sm">
            {(['met', 'frozen', 'rest', 'missed'] as const).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className={cn('size-4 rounded-[4px] border-(length:--stroke-thin)', DAY_STYLE[s])} aria-hidden="true" />
                {t.dayStatus[s]}
              </li>
            ))}
          </ul>
          <p className="m-0 text-sm text-muted-foreground">
            {fill(app.path.freezes, { n: p.streak.freezes, max: 2 })}. {app.path.freezesHint}
          </p>
        </Card>

        <Card className="gap-4">
          <CardTitle>{t.robot}</CardTitle>
          <div className="flex flex-wrap items-center gap-4">
            <RobotPreview color={colorHex} sticker={stickerValue} wheels={profile.cosmetics.wheels} />
            <p className="m-0 flex-1 text-sm text-muted-foreground">{t.robotHint}</p>
          </div>
          {kinds.map(({ kind, title, field }) => (
            <fieldset key={kind} className="m-0 grid gap-2 border-0 p-0">
              <legend className="mb-1 p-0 font-bold">{title}</legend>
              <div className="flex flex-wrap gap-2">
                {COSMETICS.filter((c) => c.kind === kind).map((c) => {
                  const open = isUnlocked(c, p.level.index, unlockedAch)
                  const selected = profile.cosmetics[field] === c.id
                  const lockText =
                    c.unlock && 'level' in c.unlock
                      ? fill(t.lockedLevel, { n: c.unlock.level + 1 })
                      : c.unlock && 'achievement' in c.unlock
                        ? fill(t.lockedAchievement, { name: ACHIEVEMENTS.find((a) => a.id === (c.unlock as { achievement: string }).achievement)?.title[lang] ?? '' })
                        : ''
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!open}
                      aria-pressed={selected}
                      title={open ? c.title[lang] : `${c.title[lang]} — ${lockText}`}
                      onClick={() => updateProfile({ cosmetics: { ...profile.cosmetics, [field]: c.id } })}
                      className={cn(
                        'flex min-h-11 items-center gap-2 rounded-(--radius-sm) border-(length:--stroke-thin) border-outline bg-card px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
                        selected && 'ring-3 ring-(--focus)',
                      )}
                    >
                      {kind === 'color' && <span className="size-5 rounded-full border-2 border-outline" style={{ background: c.value }} aria-hidden="true" />}
                      {kind === 'sticker' && c.value && <span aria-hidden="true">{c.value}</span>}
                      {c.title[lang]}
                      {!open && <Lock className="size-3.5" aria-hidden="true" />}
                      {!open && <span className="sr-only">— {lockText}</span>}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </Card>
      </div>

      <Card className="gap-4" id="achievements">
        <CardTitle>{t.achievements}</CardTitle>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const at = earned.get(a.id)
            const secret = a.hidden && !at
            return (
              <li key={a.id} className={cn('flex gap-3 rounded-(--radius-md) border-(length:--stroke-thin) border-outline p-3', at ? 'bg-card shadow-(--shadow-press)' : 'border-dashed bg-surface-2 text-muted-foreground')}>
                <span className={cn('grid size-12 shrink-0 place-items-center rounded-full border-(length:--stroke-thin) border-outline text-2xl', at ? 'bg-primary' : 'bg-card grayscale')} aria-hidden="true">
                  {secret ? '?' : a.icon}
                </span>
                <span className="grid content-start gap-0.5">
                  <span className="font-bold text-foreground">{secret ? t.hidden : a.title[lang]}</span>
                  {!secret && <span className="text-sm">{a.description[lang]}</span>}
                  {at && <span className="text-xs font-bold text-success">{fill(t.earnedOn, { date: dateFmt.format(at) })}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-3">
          <CardTitle>
            <Award className="size-5" aria-hidden="true" />
            {t.certificates}
          </CardTitle>
          {certificates.length ? (
            <ul className="m-0 grid list-none gap-2 p-0">
              {certificates.map((c) => (
                <li key={c.id}>
                  <Link className="flex items-center gap-2 font-bold text-link underline underline-offset-4" href={`/${lang}/cert/${c.code}`}>
                    {COURSE.tracks.find((tr) => tr.id === c.track)?.title[lang] ?? c.track} · {dateFmt.format(c.at)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-muted-foreground">{t.noCertificates}</p>
          )}
        </Card>

        <Card className="gap-4">
          <CardTitle>
            <Settings className="size-5" aria-hidden="true" />
            {t.settings}
          </CardTitle>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const data = new FormData(e.currentTarget)
              const nickname = String(data.get('nickname') ?? '').trim().slice(0, 24)
              const zone = String(data.get('timezone') ?? profile.timezone)
              save({ nickname: nickname || profile.nickname, timezone: zones.includes(zone) ? zone : profile.timezone })
            }}
          >
            <label className="grid gap-1 font-bold" htmlFor={`${id}-nick`}>
              {t.nickname}
              <input id={`${id}-nick`} name="nickname" className="input max-w-xs" defaultValue={profile.nickname} maxLength={24} autoComplete="off" />
            </label>
            <label className="grid gap-1 font-bold" htmlFor={`${id}-tz`}>
              {t.timezone}
              <select id={`${id}-tz`} name="timezone" className="select max-w-xs" defaultValue={profile.timezone}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={buttonVariants({ size: 'sm', className: 'justify-self-start' })}>
              {app.common.save}
            </button>
          </form>
          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-1 p-0 font-bold">{t.goal}</legend>
            <div className="flex flex-wrap gap-2">
              {(['l1', 'l2', 'm15'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={goalKey(profile.goal) === g}
                  className={buttonVariants({ size: 'sm', variant: goalKey(profile.goal) === g ? 'primary' : 'secondary' })}
                  onClick={() => save({ goal: GOALS[g] })}
                >
                  {app.onboarding.goals[g]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex cursor-pointer items-center gap-3 font-bold">
            <input type="checkbox" className="size-5 accent-(--success)" checked={profile.skipWeekends} onChange={(e) => save({ skipWeekends: e.target.checked })} />
            {t.skipWeekends}
          </label>

          <div className="grid gap-2 border-t-(length:--stroke-thin) border-dashed border-outline pt-4">
            <h3 className="m-0 flex items-center gap-2 text-lg">
              <CalendarPlus className="size-5" aria-hidden="true" />
              {t.reminders}
            </h3>
            <p className="m-0 text-sm text-muted-foreground">{t.remindersText}</p>
            {under16 && <p className="m-0 text-sm text-muted-foreground">{t.remindersOffKids}</p>}
            <label className="flex cursor-pointer items-center gap-3 font-bold">
              <input type="checkbox" className="size-5 accent-(--success)" checked={profile.reminders.enabled} onChange={(e) => save({ reminders: { ...profile.reminders, enabled: e.target.checked } })} />
              {t.remindersEnable}
            </label>
            {profile.reminders.enabled && (
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1 font-bold" htmlFor={`${id}-time`}>
                  {t.remindersTime}
                  <input
                    id={`${id}-time`}
                    type="time"
                    className="input w-36"
                    value={profile.reminders.time}
                    onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && updateProfile({ reminders: { ...profile.reminders, time: e.target.value } })}
                  />
                </label>
                <button
                  type="button"
                  className={buttonVariants({ size: 'sm' })}
                  onClick={() => download('roboeasy-reminder.ics', reminderIcs({ time: profile.reminders.time, timeZone: profile.timezone, title: t.reminderTitle, url: `${window.location.origin}/${lang}/path` }), 'text/calendar')}
                >
                  <Download aria-hidden="true" />
                  {t.remindersDownload}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="gap-3" flat>
        <CardTitle>
          <ShieldCheck className="size-5" aria-hidden="true" />
          {t.data}
        </CardTitle>
        <p className="m-0 text-muted-foreground">{t.dataText}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonVariants({ size: 'sm' })} onClick={exportData}>
            <Download aria-hidden="true" />
            {t.export}
          </button>
          <button type="button" className={buttonVariants({ size: 'sm' })} onClick={() => fileInput.current?.click()}>
            <Upload aria-hidden="true" />
            {t.import}
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => e.target.files?.[0] && void importData(e.target.files[0])} />
          <button type="button" className={buttonVariants({ size: 'sm', variant: 'danger' })} onClick={deleteAll}>
            <Trash2 aria-hidden="true" />
            {t.delete}
          </button>
        </div>
        <Link className="font-bold text-link underline underline-offset-4" href={`/${lang}/privacy`}>
          {t.privacy}
        </Link>
      </Card>
    </div>
  )
}
