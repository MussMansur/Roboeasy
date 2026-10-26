import { randomUUID } from 'node:crypto'

import { type Page, expect, test } from '@playwright/test'

import { closeAchievements, doFirstLesson, onboard } from './helpers'

/**
 * Teacher and student with real accounts on the local Supabase (magic links
 * are read from its Mailpit inbox). Skipped when the local stack is down.
 */

const MAILPIT = 'http://127.0.0.1:56324'
const API = 'http://127.0.0.1:56321'

async function stackUp(): Promise<boolean> {
  try {
    const [a, m] = await Promise.all([fetch(`${API}/auth/v1/health`), fetch(`${MAILPIT}/api/v1/info`)])
    return a.status < 500 && m.ok
  } catch {
    return false
  }
}

async function magicLink(email: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    const list = (await res.json()) as { messages: { ID: string }[] }
    if (list.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json()) as { HTML: string; Text: string }
      const url = /href="([^"]+verify[^"]+)"/.exec(msg.HTML)?.[1] ?? /(http\S+verify\S+)/.exec(msg.Text)?.[1]
      if (url) return url.replace(/&amp;/g, '&')
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`no email for ${email}`)
}

async function signIn(page: Page, email: string) {
  await page.goto('/ru/profile#account')
  await page.getByLabel('Почта').fill(email)
  await page.getByRole('button', { name: 'Прислать ссылку для входа' }).click()
  await expect(page.getByText('Готово! Открой письмо')).toBeVisible()
  await page.goto(await magicLink(email))
  await expect(page.getByText(`Ты вошёл: ${email}`)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Прогресс сохранён в облаке')).toBeVisible({ timeout: 30_000 })
}

test('teacher creates a class, a student joins, learns, and the teacher sees it', async ({ browser }) => {
  test.skip(!(await stackUp()), 'local Supabase is not running (npm run db:start)')
  test.setTimeout(240_000)
  const run = randomUUID().slice(0, 6)

  // Teacher
  const tc = await browser.newContext()
  const teacher = await tc.newPage()
  await onboard(teacher, `Teacher${run}`, '16+')
  await signIn(teacher, `teacher-${run}@test.local`)
  await teacher.goto('/ru/class')
  await teacher.getByLabel('Название класса').fill(`7Б ${run}`)
  await teacher.getByRole('button', { name: 'Создать класс' }).click()
  const code = (await teacher.getByTestId('join-code').innerText()).trim()
  expect(code).toMatch(/^[A-Z2-9]{6}$/)
  await teacher.getByLabel('Урок', { exact: true }).last().selectOption({ label: 'Что такое робот' })
  await teacher.getByRole('button', { name: 'Добавить', exact: true }).click()
  await expect(teacher.getByRole('listitem').filter({ hasText: 'Что такое робот' })).toBeVisible()
  await teacher.getByRole('button', { name: 'Начать урок с классом' }).click()
  await expect(teacher.getByText(/Сейчас: «/)).toBeVisible()

  // Student
  const sc = await browser.newContext()
  const student = await sc.newPage()
  await onboard(student, `Kid${run}`, '13–15')
  await signIn(student, `kid-${run}@test.local`)
  await student.goto('/ru/class')
  await student.getByLabel('Код класса').fill(code)
  await student.getByRole('button', { name: 'Вступить' }).click()
  await expect(student.getByRole('heading', { name: `7Б ${run}` })).toBeVisible()
  await expect(student.getByText(/Учитель проводит урок/)).toBeVisible()
  await expect(student.getByRole('link', { name: 'Открыть' })).toBeVisible()

  await doFirstLesson(student)
  await student.goto('/ru/class')
  await closeAchievements(student)
  await expect(student.getByText('Сделано')).toBeVisible({ timeout: 20_000 })
  await expect(student.getByText(new RegExp(`Kid${run} \\(ты\\) — \\d+ XP`))).toBeVisible()

  // Teacher sees progress and the solution
  await teacher.waitForTimeout(2500)
  await teacher.reload()
  const row = teacher.getByRole('row', { name: new RegExp(`Kid${run}`) })
  await expect(row).toBeVisible({ timeout: 20_000 })
  await expect(row.getByRole('cell').nth(1)).toHaveText('1')
  await teacher.screenshot({ path: test.info().outputPath('teacher-class.png'), fullPage: true })
  await row.getByRole('button', { name: `Kid${run}` }).click()
  await expect(teacher.getByRole('heading', { name: `Ученик: Kid${run}` })).toBeVisible()
  await expect(teacher.getByText(/Что такое робот · first-program/)).toBeVisible()

  await teacher.screenshot({ path: test.info().outputPath('teacher-student.png'), fullPage: true })
  await student.goto('/ru/class')
  await expect(student.getByText(new RegExp(`Kid${run} \\(ты\\)`))).toBeVisible()
  await student.screenshot({ path: test.info().outputPath('student-class.png'), fullPage: true })
  await tc.close()
  await sc.close()
})
