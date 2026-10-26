import type { NextRequest } from 'next/server'

import { isLocale } from '@/lib/i18n'
import { fill } from '@/lib/i18n/config'
import { getLearnAppText } from '@/lib/i18n/learn-app'
import { certificatePdf, verifyCode } from '@/lib/learn/certificate'
import { COURSE } from '@/lib/learn/course'
import { clientKey, rateLimit } from '@/lib/rate-limit'

/** The certificate as a PDF: /api/learn/cert/pdf?code=…&lang=ru */
export async function GET(req: NextRequest) {
  if (!rateLimit(`certpdf:${clientKey(req.headers)}`, 20, 60_000).ok) return new Response('Too many requests', { status: 429 })
  const url = new URL(req.url)
  const code = url.searchParams.get('code') ?? ''
  const langParam = url.searchParams.get('lang')
  const lang = isLocale(langParam) ? langParam : 'ru'
  const cert = verifyCode(code)
  if (!cert) return new Response('Not found', { status: 404 })
  const track = COURSE.tracks.find((t) => t.id === cert.t)!
  const t = getLearnAppText(lang).cert
  const date = new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${cert.d}T12:00:00Z`))
  const verifyUrl = `${url.origin}/${lang}/cert/${code}`
  const pdf = await certificatePdf(
    cert,
    track.title[lang],
    { heading: t.heading, for: t.for, issued: fill(t.issued, { date }), lessons: fill(t.lessons, { n: cert.l }), verifyAt: fill(t.verifyAt, { url: '' }).replace(/[:\s]+$/, ''), note: t.note },
    verifyUrl,
  )
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="RoboEasy-${track.id}.pdf"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
