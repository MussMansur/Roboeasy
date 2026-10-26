import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type NewEvent, appendEvents, EMPTY_STATE } from '@/lib/learn/state'
import { totalXp, xpForEvent } from '@/lib/learn/xp'

/** Keys of the running local stack (`supabase status`), never hard-coded. */
function localStack(): { url: string; anon: string; service: string } {
  const out = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  const get = (k: string) => new RegExp(`^${k}="?([^"\\n]+)"?`, 'm').exec(out)?.[1] ?? ''
  return { url: get('API_URL'), anon: get('ANON_KEY'), service: get('SERVICE_ROLE_KEY') }
}

const stack = localStack()
const admin = createClient(stack.url, stack.service, { auth: { persistSession: false } })
const created: string[] = []

async function user(nickname: string, ageRange: '13-15' | '16-plus' = '13-15'): Promise<{ id: string; sb: SupabaseClient }> {
  const email = `${nickname.toLowerCase()}-${randomUUID().slice(0, 8)}@test.local`
  const password = `pw-${randomUUID()}`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw error
  created.push(data.user.id)
  const sb = createClient(stack.url, stack.anon, { auth: { persistSession: false } })
  await sb.auth.signInWithPassword({ email, password })
  const { error: pe } = await sb.from('profiles').insert({ id: data.user.id, nickname, age_range: ageRange, parent_consent: ageRange !== '16-plus' })
  if (pe) throw pe
  return { id: data.user.id, sb }
}

const events: NewEvent[] = [
  { kind: 'step_done', lesson: 'start-01', step: 'match-parts', stepType: 'quiz', firstTry: true, hints: 0 },
  { kind: 'step_done', lesson: 'start-01', step: 'first-program', stepType: 'code', firstTry: false, hints: 1, program: [{ op: 'move', direction: 'forward', value: 40, unit: 'cm' }] },
  { kind: 'mistake', lesson: 'start-01', step: 'first-program' },
  { kind: 'lesson_done', lesson: 'start-01', track: 'start', unit: 'start-robot', project: false, seconds: 300 },
  { kind: 'lesson_done', lesson: 'start-08', track: 'start', unit: 'start-drive', project: true, seconds: 600 },
  { kind: 'real_robot', lesson: 'start-08', step: 'real' },
  { kind: 'review_done', skills: ['motion'], correct: 4, total: 5 },
  { kind: 'challenge_done', week: '2026-W44', challenge: 'snake' },
]
const local = appendEvents(EMPTY_STATE, events, Date.parse('2026-10-20T10:00:00Z'))

let teacher: Awaited<ReturnType<typeof user>>
let kid: Awaited<ReturnType<typeof user>>
let other: Awaited<ReturnType<typeof user>>
let classId = ''
let joinCode = ''

beforeAll(async () => {
  teacher = await user('Teacher', '16-plus')
  kid = await user('Kid')
  other = await user('Other')
})

afterAll(async () => {
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {})
})

describe('progress on the server', () => {
  it('computes the same XP as the app, once per event id', async () => {
    const first = await kid.sb.rpc('record_events', { events: local.events })
    expect(first.error).toBeNull()
    expect(first.data).toBe(totalXp(local))
    const again = await kid.sb.rpc('record_events', { events: local.events })
    expect(again.data).toBe(totalXp(local))
    for (const e of local.events) {
      const { data } = await kid.sb.rpc('xp_for_event', { kind: e.kind, data: e })
      expect(data, e.kind).toBe(xpForEvent(e))
    }
  })

  it('keeps learners apart', async () => {
    const { data } = await other.sb.from('learn_events').select('id').eq('user_id', kid.id)
    expect(data).toEqual([])
    const forged = await other.sb.from('learn_events').insert({ user_id: kid.id, id: 'x', kind: 'mistake', at: new Date().toISOString() })
    expect(forged.error).not.toBeNull()
    const { data: profiles } = await other.sb.from('profiles').select('nickname')
    expect(profiles).toEqual([{ nickname: 'Other' }])
  })

  it('requires consent under 16', async () => {
    const { data } = await admin.auth.admin.createUser({ email: `noconsent-${randomUUID().slice(0, 8)}@test.local`, password: 'pw-123456789', email_confirm: true })
    created.push(data.user!.id)
    const { error } = await admin.from('profiles').insert({ id: data.user!.id, nickname: 'Kid2', age_range: '10-12', parent_consent: false })
    expect(error?.message).toMatch(/consent_under_16/)
  })
})

describe('classes', () => {
  it('only adults create classes', async () => {
    const { error } = await kid.sb.rpc('create_class', { class_name: 'Kids club' })
    expect(error?.message).toMatch(/only adults/)
    const { data, error: e2 } = await teacher.sb.rpc('create_class', { class_name: '7Б робототехника' })
    expect(e2).toBeNull()
    classId = data.id
    joinCode = data.join_code
    expect(joinCode).toMatch(/^[A-Z2-9]{6}$/)
  })

  it('joins by code; wrong codes fail', async () => {
    expect((await kid.sb.rpc('join_class', { code: 'ZZZZZZ' })).error).not.toBeNull()
    const { data } = await kid.sb.rpc('join_class', { code: joinCode.toLowerCase() })
    expect(data).toEqual([{ id: classId, name: '7Б робототехника' }])
  })

  it('teacher sees learners (nickname only), progress and solutions; others do not', async () => {
    const { data: overview } = await teacher.sb.rpc('class_overview', { cls: classId })
    expect(overview).toEqual([expect.objectContaining({ nickname: 'Kid', lessons_done: 2, xp: totalXp(local), mistakes: 1 })])
    expect(Object.keys(overview[0]).sort()).toEqual(['last_active', 'lessons_done', 'mistakes', 'nickname', 'user_id', 'xp'])
    const { data: solution } = await teacher.sb.from('learn_events').select('data').eq('user_id', kid.id).eq('id', 'step:start-01:first-program').single()
    expect(solution?.data.program).toHaveLength(1)
    expect((await other.sb.rpc('class_overview', { cls: classId })).error).not.toBeNull()
    expect((await kid.sb.rpc('class_overview', { cls: classId })).error).not.toBeNull()
    const { data: teacherSeesOther } = await teacher.sb.from('learn_events').select('id').eq('user_id', other.id)
    expect(teacherSeesOther).toEqual([])
  })

  it('leaderboard: class members only, nicknames only', async () => {
    const { data } = await kid.sb.rpc('class_leaderboard', { cls: classId })
    expect(data).toEqual([{ nickname: 'Kid', xp: expect.any(Number), is_me: true }])
    expect((await other.sb.rpc('class_leaderboard', { cls: classId })).error).not.toBeNull()
  })

  it('assignments and the live lesson: teacher writes, members read', async () => {
    expect((await teacher.sb.from('assignments').insert({ class_id: classId, lesson_id: 'start-02', due_at: '2026-11-01T18:00:00Z' })).error).toBeNull()
    expect((await kid.sb.from('assignments').insert({ class_id: classId, lesson_id: 'start-03' })).error).not.toBeNull()
    expect((await kid.sb.from('assignments').select('lesson_id')).data).toEqual([{ lesson_id: 'start-02' }])
    expect((await other.sb.from('assignments').select('lesson_id')).data).toEqual([])
    await teacher.sb.from('classes').update({ live_lesson: 'start-02', live_started_at: new Date().toISOString() }).eq('id', classId)
    expect((await kid.sb.from('classes').select('live_lesson').eq('id', classId).single()).data?.live_lesson).toBe('start-02')
    await kid.sb.from('classes').update({ live_lesson: 'start-05' }).eq('id', classId)
    expect((await kid.sb.from('classes').select('live_lesson').eq('id', classId).single()).data?.live_lesson).toBe('start-02')
  })

  it('robot photos: own folder, visible to the class teacher only', async () => {
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' })
    const path = `${classId}/${kid.id}/start-05.jpg`
    expect((await kid.sb.storage.from('robot-photos').upload(path, jpeg, { contentType: 'image/jpeg' })).error).toBeNull()
    expect((await other.sb.storage.from('robot-photos').upload(`${classId}/${other.id}/x.jpg`, jpeg, { contentType: 'image/jpeg' })).error).not.toBeNull()
    expect((await teacher.sb.storage.from('robot-photos').list(`${classId}/${kid.id}`)).data?.map((f) => f.name)).toEqual(['start-05.jpg'])
    expect((await other.sb.storage.from('robot-photos').createSignedUrl(path, 60)).error).not.toBeNull()
  })

  it('deleting an account removes its data', async () => {
    expect((await kid.sb.storage.from('robot-photos').remove([`${classId}/${kid.id}/start-05.jpg`])).error).toBeNull()
    expect((await kid.sb.rpc('delete_my_account')).error).toBeNull()
    const { count } = await admin.from('learn_events').select('*', { count: 'exact', head: true }).eq('user_id', kid.id)
    expect(count).toBe(0)
    expect((await admin.from('class_members').select('user_id').eq('class_id', classId)).data).toEqual([])
  })
})
