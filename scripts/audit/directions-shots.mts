/**
 * Screenshots of the visual-direction mockups (docs/audit/directions/*.html).
 * Each page has a Kazakh specimen in every font, to check glyph coverage by eye.
 *
 *   npx tsx scripts/audit/directions-shots.mts
 */

import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const dir = path.resolve('docs/audit/directions')

async function run() {
  const browser = await chromium.launch({ channel: 'chrome' })
  for (const id of ['a', 'b', 'c']) {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      // Chrome's own requests to Google Fonts can stall here; fetch them from Node instead.
      await page.route(/fonts\.(googleapis|gstatic)\.com/, async (route) => route.fulfill({ response: await route.fetch({ timeout: 20000 }) }))
      await page.goto(pathToFileURL(path.join(dir, `${id}.html`)).href, { waitUntil: 'load', timeout: 60000 })
      // Load every family with the Kazakh letters, so the unicode-range subsets arrive before the shot.
      const families = await page.$$eval('.fonts b', (bs) => bs.map((b) => b.textContent ?? ''))
      const loaded = await page.evaluate(async (fams) => {
        const sample = 'Бағдарлама әрекет қосу ұпай ӘҒҚҢӨҰҮҺІ abc'
        const faces = await Promise.all(fams.flatMap((f) => ['400', '700'].map((w) => document.fonts.load(`${w} 20px "${f}"`, sample))))
        return fams.map((f, i) => `${f}: ${faces[i * 2].length + faces[i * 2 + 1].length} faces`)
      }, families)
      if (width === 1440) console.log(id, loaded.join(' | '))
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(dir, `${id}-${width}.png`), fullPage: true })
      await page.unrouteAll({ behavior: 'ignoreErrors' })
      await page.close()
    }
  }
  await browser.close()
}

void run()
