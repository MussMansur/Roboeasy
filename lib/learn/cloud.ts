'use client'

/**
 * Accounts, sync and classes (Supabase). Optional: without
 * NEXT_PUBLIC_SUPABASE_URL the app stays local-only. Loaded on demand
 * (dynamic import) so pages without an account do not carry the client.
 *
 * Sync: the server keeps the same append-only event log as the browser,
 * keyed by (user, event id), so pushing the same events twice changes
 * nothing and XP stays idempotent (record_events in the migration).
 */

import { type SupabaseClient, createClient } from '@supabase/supabase-js'

import { type LearnEvent, type Profile, appendEvents, eventSchema, profileSchema } from './state'
import { getLearnState, onRecord, replaceState, setProfile, subscribeLearn } from './store'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const cloudConfigured = Boolean(URL_ && KEY)

let client: SupabaseClient | null = null
export function cloud(): SupabaseClient | null {
  if (!cloudConfigured || typeof window === 'undefined') return null
  client ??= createClient(URL_!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } })
  return client
}

/** True when a session is stored in this browser (cheap check before loading the client). */
export function hasStoredSession(): boolean {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch {
    return false
  }
}

export async function currentUser() {
  const sb = cloud()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session?.user ?? null
}

/** Magic link to the email; it brings the learner back to `returnTo`. */
export async function signInWithEmail(email: string, returnTo: string): Promise<{ ok: boolean; error?: string }> {
  const sb = cloud()
  if (!sb) return { ok: false, error: 'not configured' }
  const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: returnTo, shouldCreateUser: true } })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function signOut() {
  stopSync()
  await cloud()?.auth.signOut()
}

/** Deletes the account and everything on the server (the browser copy stays unless deleted separately). */
export async function deleteAccount(): Promise<boolean> {
  const sb = cloud()
  if (!sb) return false
  const user = await currentUser()
  if (!user) return false
  // Photos first (Storage API), then the account and every row with it.
  const classes = await myClasses().catch(() => [] as ClassRow[])
  for (const c of classes) {
    const { data } = await sb.storage.from('robot-photos').list(`${c.id}/${user.id}`)
    if (data?.length) await sb.storage.from('robot-photos').remove(data.map((f) => `${c.id}/${user.id}/${f.name}`))
  }
  const { error } = await sb.rpc('delete_my_account')
  if (error) return false
  stopSync()
  await sb.auth.signOut({ scope: 'local' })
  return true
}

// ── Profile ──────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string
  nickname: string
  age_range: Profile['ageRange']
  timezone: string
  settings: { goal?: Profile['goal']; skipWeekends?: boolean; reminders?: Profile['reminders']; cosmetics?: Profile['cosmetics']; anonId?: string }
  parent_consent: boolean
}

function toRow(id: string, p: Profile): ProfileRow {
  return {
    id,
    nickname: p.nickname,
    age_range: p.ageRange,
    timezone: p.timezone,
    settings: { goal: p.goal, skipWeekends: p.skipWeekends, reminders: p.reminders, cosmetics: p.cosmetics, anonId: p.anonId },
    parent_consent: p.parentConsent,
  }
}

function fromRow(row: ProfileRow): Profile | null {
  const r = profileSchema.safeParse({
    nickname: row.nickname,
    ageRange: row.age_range,
    timezone: row.timezone,
    goal: row.settings.goal ?? { kind: 'lessons', n: 1 },
    skipWeekends: row.settings.skipWeekends,
    reminders: row.settings.reminders,
    cosmetics: row.settings.cosmetics,
    parentConsent: row.parent_consent,
    createdAt: Date.now(),
    anonId: row.settings.anonId ?? `anon_${row.id.replace(/-/g, '').slice(0, 16)}`,
  })
  return r.success ? r.data : null
}

// ── Sync ─────────────────────────────────────────────────────────────────

let stop: (() => void) | null = null

function fromServer(row: { id: string; kind: string; at: string; data: Record<string, unknown> }): LearnEvent | null {
  const r = eventSchema.safeParse({ ...row.data, id: row.id, kind: row.kind, at: Date.parse(row.at) })
  return r.success ? r.data : null
}

async function push(sb: SupabaseClient, events: LearnEvent[]) {
  for (let i = 0; i < events.length; i += 400) {
    const { error } = await sb.rpc('record_events', { events: events.slice(i, i + 400) })
    if (error) throw error
  }
}

/** Two-way sync, then live pushes of new events and profile changes. Safe to call more than once. */
export async function startSync(): Promise<{ ok: boolean; xp?: number }> {
  const sb = cloud()
  if (!sb) return { ok: false }
  const user = await currentUser()
  if (!user) return { ok: false }
  stopSync()

  // Profile: the server copy wins when this browser has none; otherwise the browser's is saved.
  const { data: row } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle<ProfileRow>()
  const local = getLearnState().profile
  if (!local && row) {
    const p = fromRow(row)
    if (p) setProfile(p)
  } else if (local) {
    await sb.from('profiles').upsert(toRow(user.id, local))
  }

  // Events: pull what the server has, merge, push the rest.
  const server: LearnEvent[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('learn_events')
      .select('id, kind, at, data')
      .eq('user_id', user.id)
      .order('at')
      .range(from, from + 999)
    if (error) return { ok: false }
    for (const r of data ?? []) {
      const e = fromServer(r)
      if (e) server.push(e)
    }
    if (!data || data.length < 1000) break
  }
  const before = getLearnState()
  const merged = appendEvents(before, server)
  if (merged !== before) replaceState(merged)
  const known = new Set(server.map((e) => e.id))
  await push(
    sb,
    getLearnState().events.filter((e) => !known.has(e.id)),
  ).catch(() => {})

  let queue: LearnEvent[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    const batch = queue
    queue = []
    if (batch.length) push(sb, batch).catch(() => (queue = [...batch, ...queue]))
  }
  const offRecord = onRecord((b, a) => {
    const seen = new Set(b.events.map((e) => e.id))
    queue.push(...a.events.filter((e) => !seen.has(e.id)))
    clearTimeout(timer)
    timer = setTimeout(flush, 1500)
  })
  let lastProfile = JSON.stringify(getLearnState().profile)
  const offProfile = subscribeLearn(() => {
    const p = getLearnState().profile
    const json = JSON.stringify(p)
    if (p && json !== lastProfile) {
      lastProfile = json
      void sb.from('profiles').upsert(toRow(user.id, p))
    }
  })
  const flushOnHide = () => document.visibilityState === 'hidden' && flush()
  document.addEventListener('visibilitychange', flushOnHide)
  stop = () => {
    clearTimeout(timer)
    flush()
    offRecord()
    offProfile()
    document.removeEventListener('visibilitychange', flushOnHide)
  }
  const { data: xp } = await sb.rpc('my_xp')
  return { ok: true, xp: typeof xp === 'number' ? xp : undefined }
}

export function stopSync() {
  stop?.()
  stop = null
}

// ── Classes ──────────────────────────────────────────────────────────────

export interface ClassRow {
  id: string
  teacher_id: string
  name: string
  join_code: string
  live_lesson: string | null
  live_started_at: string | null
  created_at: string
}
export interface AssignmentRow {
  id: string
  class_id: string
  lesson_id: string
  due_at: string | null
}
export interface OverviewRow {
  user_id: string
  nickname: string
  lessons_done: number
  xp: number
  mistakes: number
  last_active: string | null
}
export interface LeaderRow {
  nickname: string
  xp: number
  is_me: boolean
}

function need(): SupabaseClient {
  const sb = cloud()
  if (!sb) throw new Error('not configured')
  return sb
}

export async function myClasses(): Promise<ClassRow[]> {
  const { data, error } = await need().from('classes').select('*').order('created_at')
  if (error) throw error
  return data ?? []
}

export async function createClass(name: string): Promise<ClassRow> {
  const { data, error } = await need().rpc('create_class', { class_name: name })
  if (error) throw error
  return data as ClassRow
}

export async function joinClass(code: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await need().rpc('join_class', { code })
  if (error) return null
  return (data as { id: string; name: string }[])[0] ?? null
}

export async function leaveClass(classId: string, userId: string) {
  await need().from('class_members').delete().eq('class_id', classId).eq('user_id', userId)
}

export async function assignments(classIds: string[]): Promise<AssignmentRow[]> {
  if (!classIds.length) return []
  const { data, error } = await need()
    .from('assignments')
    .select('id, class_id, lesson_id, due_at')
    .in('class_id', classIds)
    .order('due_at', { nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function addAssignment(classId: string, lessonId: string, dueAt: string | null) {
  const { error } = await need().from('assignments').upsert({ class_id: classId, lesson_id: lessonId, due_at: dueAt }, { onConflict: 'class_id,lesson_id' })
  if (error) throw error
}

export async function removeAssignment(id: string) {
  await need().from('assignments').delete().eq('id', id)
}

export async function setLiveLesson(classId: string, lessonId: string | null) {
  const { error } = await need()
    .from('classes')
    .update({ live_lesson: lessonId, live_started_at: lessonId ? new Date().toISOString() : null })
    .eq('id', classId)
  if (error) throw error
}

export async function classOverview(classId: string): Promise<OverviewRow[]> {
  const { data, error } = await need().rpc('class_overview', { cls: classId })
  if (error) throw error
  return data ?? []
}

export async function classLeaderboard(classId: string): Promise<LeaderRow[]> {
  const { data, error } = await need().rpc('class_leaderboard', { cls: classId })
  if (error) throw error
  return data ?? []
}

/** Events of one learner (teacher view; RLS allows only teachers of the learner's class). */
export async function learnerEvents(userId: string): Promise<LearnEvent[]> {
  const { data, error } = await need().from('learn_events').select('id, kind, at, data').eq('user_id', userId).order('at').limit(5000)
  if (error) throw error
  return (data ?? []).flatMap((r) => fromServer(r) ?? [])
}

export async function classEvents(userIds: string[]): Promise<Map<string, LearnEvent[]>> {
  const out = new Map<string, LearnEvent[]>(userIds.map((id) => [id, []]))
  if (!userIds.length) return out
  const { data, error } = await need()
    .from('learn_events')
    .select('user_id, id, kind, at, data')
    .in('user_id', userIds)
    .in('kind', ['lesson_start', 'lesson_done', 'step_done', 'mistake'])
    .order('at')
    .limit(20000)
  if (error) throw error
  for (const r of data ?? []) {
    const e = fromServer(r)
    if (e) out.get(r.user_id)?.push(e)
  }
  return out
}

// ── Real robot photos ────────────────────────────────────────────────────

/** Re-encodes to JPEG (drops EXIF, including location) and shrinks to at most 1280 px. */
export async function cleanPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85))
}

export async function uploadRobotPhoto(classId: string, lessonId: string, file: File): Promise<boolean> {
  const sb = need()
  const user = await currentUser()
  if (!user) return false
  const blob = await cleanPhoto(file)
  const { error } = await sb.storage.from('robot-photos').upload(`${classId}/${user.id}/${lessonId}.jpg`, blob, { contentType: 'image/jpeg', upsert: true })
  return !error
}

export async function robotPhotos(classId: string, userId: string): Promise<{ lesson: string; url: string }[]> {
  const sb = need()
  const { data } = await sb.storage.from('robot-photos').list(`${classId}/${userId}`)
  const files = (data ?? []).filter((f) => f.name.endsWith('.jpg'))
  if (!files.length) return []
  const { data: signed } = await sb.storage.from('robot-photos').createSignedUrls(
    files.map((f) => `${classId}/${userId}/${f.name}`),
    600,
  )
  return (signed ?? []).flatMap((s, i) => (s.signedUrl ? [{ lesson: files[i].name.replace(/\.jpg$/, ''), url: s.signedUrl }] : []))
}
