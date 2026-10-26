/**
 * Track certificates. Until accounts exist there is no database to look
 * certificates up in, so the verification code carries the data itself and
 * is signed with a server secret (HMAC-SHA256): anyone can check that a
 * certificate was issued by us and not edited afterwards.
 *
 * The server trusts the browser's progress when issuing (the same limit as
 * all local progress). TODO(db): issue from server-side progress and keep a
 * row per certificate, so it can also be revoked.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'
import { z } from 'zod'

import { COURSE } from './course'

export const certPayloadSchema = z.object({
  v: z.literal(1),
  /** Nickname (never a real name, see onboarding). */
  n: z.string().trim().min(1).max(24),
  /** Track id */
  t: z.string(),
  /** Issue date, YYYY-MM-DD */
  d: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Lessons in the track at the time */
  l: z.number().int().positive(),
})
export type CertPayload = z.infer<typeof certPayloadSchema>

const DEV_SECRET = 'roboeasy-dev-only-certificate-secret'

function secret(): string | null {
  const s = process.env.CERT_SECRET
  if (s && s.length >= 16) return s
  return process.env.NODE_ENV === 'production' ? null : DEV_SECRET
}

export function certificatesEnabled(): boolean {
  return secret() !== null
}

function sign(body: string, key: string): string {
  return createHmac('sha256', key).update(body).digest('base64url').slice(0, 27)
}

export function issueCode(payload: CertPayload): string | null {
  const key = secret()
  if (!key) return null
  const body = Buffer.from(JSON.stringify(certPayloadSchema.parse(payload))).toString('base64url')
  return `${body}.${sign(body, key)}`
}

export function verifyCode(code: string): CertPayload | null {
  const key = secret()
  if (!key || code.length > 400) return null
  const [body, mac, extra] = code.split('.')
  if (!body || !mac || extra !== undefined) return null
  const expected = Buffer.from(sign(body, key))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const parsed = certPayloadSchema.safeParse(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')))
    if (!parsed.success || !COURSE.tracks.some((t) => t.id === parsed.data.t)) return null
    return parsed.data
  } catch {
    return null
  }
}

// ── PDF ──────────────────────────────────────────────────────────────────

const FONTS = path.join(process.cwd(), 'assets', 'fonts')
const INK = rgb(0.106, 0.122, 0.165)
const CREAM = rgb(1, 0.976, 0.933)
const SUN = rgb(1, 0.773, 0.192)
const MUTED = rgb(0.38, 0.4, 0.45)

export interface CertTexts {
  heading: string
  for: string
  issued: string
  lessons: string
  verifyAt: string
  note: string
}

export async function certificatePdf(payload: CertPayload, trackTitle: string, texts: CertTexts, verifyUrl: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(`${texts.heading} — ${trackTitle}`)
  doc.setAuthor('RoboEasy')
  doc.setCreator('RoboEasy')
  const heading = await doc.embedFont(fs.readFileSync(path.join(FONTS, 'Rubik-Bold.ttf')), { subset: true })
  const bold = await doc.embedFont(fs.readFileSync(path.join(FONTS, 'Nunito-Bold.ttf')), { subset: true })
  const regular = await doc.embedFont(fs.readFileSync(path.join(FONTS, 'Nunito-Regular.ttf')), { subset: true })

  const W = 842
  const H = 595
  const page = doc.addPage([W, H])
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM })
  // Hard-shadow frame, like the cards on the site.
  page.drawRectangle({ x: 36, y: 28, width: W - 64, height: H - 64, color: INK })
  page.drawRectangle({ x: 28, y: 36, width: W - 64, height: H - 64, color: rgb(1, 1, 1), borderColor: INK, borderWidth: 4 })
  page.drawRectangle({ x: 28, y: H - 28 - 18, width: W - 64, height: 18, color: SUN, borderColor: INK, borderWidth: 4 })

  // A small robot mark drawn from shapes (our own drawing).
  const rx = 70
  const ry = H - 150
  page.drawRectangle({ x: rx, y: ry, width: 64, height: 52, color: SUN, borderColor: INK, borderWidth: 3 })
  page.drawRectangle({ x: rx + 14, y: ry + 16, width: 36, height: 22, color: rgb(1, 0.97, 0.91), borderColor: INK, borderWidth: 2 })
  page.drawCircle({ x: rx + 25, y: ry + 27, size: 3.5, color: INK })
  page.drawCircle({ x: rx + 39, y: ry + 27, size: 3.5, color: INK })
  page.drawRectangle({ x: rx - 8, y: ry + 4, width: 8, height: 24, color: INK })
  page.drawRectangle({ x: rx + 64, y: ry + 4, width: 8, height: 24, color: INK })
  page.drawText('RoboEasy', { x: rx + 84, y: ry + 18, size: 22, font: heading, color: INK })

  const center = (text: string, y: number, size: number, font: typeof heading, color = INK) => {
    let s = size
    while (font.widthOfTextAtSize(text, s) > W - 160 && s > 10) s -= 1
    page.drawText(text, { x: (W - font.widthOfTextAtSize(text, s)) / 2, y, size: s, font, color })
  }

  center(texts.heading, H - 230, 44, heading)
  center(payload.n, H - 300, 40, bold)
  page.drawRectangle({ x: W / 2 - 120, y: H - 316, width: 240, height: 4, color: SUN })
  center(texts.for, H - 352, 18, regular, MUTED)
  center(`«${trackTitle}»`, H - 392, 28, heading)
  center(`${texts.issued} · ${texts.lessons}`, H - 432, 14, regular, MUTED)

  page.drawText(texts.verifyAt, { x: 60, y: 92, size: 11, font: bold, color: INK })
  page.drawText(verifyUrl.length > 110 ? `${verifyUrl.slice(0, 107)}…` : verifyUrl, { x: 60, y: 76, size: 8, font: regular, color: MUTED })
  page.drawText(texts.note, { x: 60, y: 56, size: 9, font: regular, color: MUTED })
  return doc.save()
}
