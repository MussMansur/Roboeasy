/**
 * UI audit: full-page screenshots of every page at 375/768/1440 px in the
 * light and dark themes, a few "filled" states with the AI mocked, an axe
 * accessibility scan and a keyboard-focus check.
 *
 *   npx tsx scripts/audit/capture.ts [baseUrl] [outDir]
 *
 * Uses the installed Chrome (channel "chrome"), so no browser download.
 */

import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { type Browser, type Page, chromium } from '@playwright/test'

import { programToPython } from '../../lib/dsl/compile-python'
import { DEFAULT_ROBOT, type Program } from '../../lib/dsl/types'
import type { GenerateResponse } from '../../lib/api-types'
import type { PlanResponse } from '../../lib/fll/plan'

const base = process.argv[2] ?? 'http://localhost:3100'
const outDir = path.resolve(process.argv[3] ?? 'docs/audit/before')
const WIDTHS = [375, 768, 1440] as const
const THEMES = ['light', 'dark'] as const
type Theme = (typeof THEMES)[number]

const PAGES = [
  { name: 'landing-ru', url: '/ru' },
  { name: 'landing-kk', url: '/kk' },
  { name: 'landing-en', url: '/en' },
  { name: 'workspace', url: '/ru/workspace' },
  { name: 'fll', url: '/ru/fll' },
  { name: 'fll-editor', url: '/ru/fll/editor' },
  { name: 'design', url: '/ru/design' },
  { name: 'not-found', url: '/ru/does-not-exist' },
] as const

const DEMO_PROGRAM: Program = {
  title: 'Квадрат',
  description: 'Робот проезжает квадрат со стороной 30 см и пищит в конце.',
  steps: [
    { op: 'set_speed', speed: 50 },
    { op: 'repeat', times: 4, steps: [{ op: 'move', direction: 'forward', value: 30, unit: 'cm' }, { op: 'turn', direction: 'right', degrees: 90 }] },
    { op: 'beep', note: 72, seconds: 0.3 },
  ],
}

const GENERATED: GenerateResponse = {
  ok: true,
  format: 'blocks',
  title: DEMO_PROGRAM.title,
  description: DEMO_PROGRAM.description,
  program: DEMO_PROGRAM,
  python: programToPython(DEMO_PROGRAM, DEFAULT_ROBOT),
  warnings: [],
}

const rect = (width: number, height: number) => ({ kind: 'rect' as const, width, height })
/** Made-up layout for screenshots only (stored in the browser, never in data/). */
const DRAFT = {
  schemaVersion: 2,
  id: 'bioglow-2026',
  name: { ru: 'BIOGLOW', en: 'BIOGLOW' },
  years: '2026–2027',
  status: 'current',
  edition: 'founders',
  platform: 'spike',
  field: { widthMm: 2362, heightMm: 1143 },
  launchAreas: [{ id: 'L1', name: { ru: 'База', en: 'Base' }, x: 250, y: 200, rotationDeg: 0, shape: rect(400, 300), start: { x: 250, y: 200, headingDeg: 90 } }],
  forbiddenZones: [{ id: 'Z1', x: 1180, y: 560, rotationDeg: 0, shape: rect(200, 200) }],
  missions: [
    { id: 'M01', number: 1, name: { ru: 'Пример 1', en: 'Example 1' }, x: 700, y: 400, rotationDeg: 0, outline: rect(150, 150), actionZone: { dx: -220, dy: 0, rotationDeg: 0, shape: rect(120, 120) }, points: 20, action: 'push', plan: { actionMm: 60, attachmentDeg: 90, via: [] } },
    { id: 'M02', number: 2, name: { ru: 'Пример 2', en: 'Example 2' }, x: 1500, y: 850, rotationDeg: 90, outline: rect(150, 150), actionZone: { dx: -220, dy: 0, rotationDeg: 0, shape: rect(120, 120) }, points: 30, action: 'push', plan: { actionMm: 60, attachmentDeg: 90, via: [] } },
    { id: 'M03', number: 3, name: { ru: 'Пример 3', en: 'Example 3' }, x: 1900, y: 400, rotationDeg: 0, outline: rect(150, 150), actionZone: { dx: -220, dy: 0, rotationDeg: 0, shape: rect(120, 120) }, points: 15, action: 'push', plan: { actionMm: 60, attachmentDeg: 90, via: [] } },
  ],
}

const PLAN: PlanResponse = {
  ok: true,
  source: 'ai',
  plan: {
    summary: 'Два заезда: ближние миссии вместе, дальнюю отдельно.',
    runs: [
      { name: 'Заезд 1', launchAreaId: 'L1', missions: [{ id: 'M01' }, { id: 'M02' }], explanation: 'Миссии рядом, порядок без разворотов.' },
      { name: 'Заезд 2', launchAreaId: 'L1', missions: [{ id: 'M03' }], explanation: 'Дальняя миссия — отдельный выезд.' },
    ],
    tips: ['Какой заезд стабильнее на вашем поле?'],
  },
}

async function newPage(browser: Browser, width: number, theme: Theme): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 812 : 900 },
    deviceScaleFactor: 1,
    isMobile: width < 600,
    hasTouch: width < 600,
    colorScheme: theme,
    reducedMotion: 'reduce',
  })
  await context.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t)
    } catch {}
  }, theme)
  const page = await context.newPage()
  await page.route('**/api/generate', (route) => (route.request().method() === 'POST' ? route.fulfill({ json: GENERATED }) : route.fulfill({ json: { configured: true } })))
  await page.route('**/api/fll/plan', (route) => route.fulfill({ json: PLAN }))
  return page
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
}

const shot = (page: Page, name: string) => page.screenshot({ path: path.join(outDir, `${name}.jpg`), fullPage: true, type: 'jpeg', quality: 70 })

/** States that need interaction. */
async function filledStates(page: Page, width: number, theme: Theme) {
  const suffix = `${width}-${theme}`
  // Studio after a (mocked) generation
  await page.goto(`${base}/ru/workspace`)
  await settle(page)
  await page.locator('textarea.textarea').fill('Проедь квадрат 30 см и пискни в конце')
  await page.getByRole('button', { name: 'Создать программу' }).click()
  await page.waitForSelector('.result [role=tablist], .result [data-slot=badge]', { timeout: 15000 })
  await settle(page)
  await shot(page, `workspace-result-${suffix}`)

  // FLL planner with an editor draft and a (mocked) plan
  await page.goto(`${base}/ru/fll`)
  await page.evaluate(
    (draft) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('roboeasy', 1)
        req.onupgradeneeded = () => {
          for (const s of ['backgrounds', 'drafts']) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s)
        }
        req.onsuccess = () => {
          const tx = req.result.transaction('drafts', 'readwrite')
          tx.objectStore('drafts').put({ season: draft, savedAt: Date.now() }, 'bioglow-2026')
          tx.oncomplete = () => {
            req.result.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
        req.onerror = () => reject(req.error)
      }),
    DRAFT,
  )
  await page.reload()
  await page.waitForSelector('.fll-draft')
  for (const id of ['M01', 'M02', 'M03']) await page.locator('.fll-missions label', { hasText: id === 'M01' ? 'Пример 1' : id === 'M02' ? 'Пример 2' : 'Пример 3' }).click()
  await page.locator('.fll-plan').getByRole('button', { name: 'Предложить план' }).click()
  await page.waitForSelector('.fll-run')
  await settle(page)
  await shot(page, `fll-plan-${suffix}`)

  // Editor with the same draft
  await page.goto(`${base}/ru/fll/editor`)
  await page.waitForSelector('svg.ed-canvas .fll-mission')
  await settle(page)
  await shot(page, `fll-editor-filled-${suffix}`)

  // Clean up the draft so later page shots show the empty state
  await page.evaluate(() => new Promise<void>((r) => {
    const q = indexedDB.deleteDatabase('roboeasy')
    q.onsuccess = q.onerror = q.onblocked = () => r()
  }))
}

interface AxeSummary {
  page: string
  theme: Theme
  violations: { id: string; impact: string | null | undefined; help: string; nodes: number; targets: string[] }[]
}

interface FocusSummary {
  page: string
  stops: { tag: string; text: string; visible: boolean }[]
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome' })
  const errors: string[] = []
  const axe: AxeSummary[] = []
  const focus: FocusSummary[] = []

  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const page = await newPage(browser, width, theme)
      page.on('pageerror', (e) => errors.push(`${width}/${theme} pageerror: ${e.message}`))
      page.on('console', (m) => m.type() === 'error' && errors.push(`${width}/${theme} console: ${m.text().slice(0, 200)}`))
      for (const p of PAGES) {
        await page.goto(`${base}${p.url}`)
        await settle(page)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        if (overflow > 0) errors.push(`${p.name} ${width}/${theme}: horizontal overflow ${overflow}px`)
        await shot(page, `${p.name}-${width}-${theme}`)
        if (width === 1440) {
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
          axe.push({
            page: p.name,
            theme,
            violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) })),
          })
        }
        if (width === 1440 && theme === 'light') {
          const stops: FocusSummary['stops'] = []
          await page.locator('body').click({ position: { x: 1, y: 1 } })
          for (let i = 0; i < 25; i++) {
            await page.keyboard.press('Tab')
            stops.push(
              await page.evaluate(() => {
                const el = document.activeElement as HTMLElement | null
                if (!el || el === document.body) return { tag: 'body', text: '', visible: false }
                const cs = getComputedStyle(el)
                const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none'
                const label = el.getAttribute('aria-label') ?? el.textContent ?? ''
                return { tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''), text: label.trim().slice(0, 40), visible }
              }),
            )
          }
          focus.push({ page: p.name, stops })
        }
      }
      await filledStates(page, width, theme)
      await page.context().close()
      console.log(`done ${width}/${theme}`)
    }
  }
  await browser.close()
  fs.writeFileSync(path.join(outDir, 'axe.json'), JSON.stringify(axe, null, 2))
  fs.writeFileSync(path.join(outDir, 'focus.json'), JSON.stringify(focus, null, 2))
  fs.writeFileSync(path.join(outDir, 'errors.json'), JSON.stringify(errors, null, 2))
  console.log(`axe violations: ${axe.reduce((n, a) => n + a.violations.length, 0)}, errors: ${errors.length}`)
}

main().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
