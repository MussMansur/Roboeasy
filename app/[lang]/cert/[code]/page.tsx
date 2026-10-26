import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BadgeCheck, FileDown, ShieldX } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { TrackIcon } from '@/components/learn/track-icon'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { isLocale } from '@/lib/i18n'
import { fill } from '@/lib/i18n/config'
import { getLearnAppText } from '@/lib/i18n/learn-app'
import { verifyCode } from '@/lib/learn/certificate'
import { COURSE } from '@/lib/learn/course'

type Params = { params: Promise<{ lang: string; code: string }> }

// Codes are not known at build time: verified on request.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: `${getLearnAppText(lang).cert.title} — RoboEasy`, robots: { index: false } }
}

export default async function CertificatePage({ params }: Params) {
  const { lang, code: raw } = await params
  if (!isLocale(lang)) notFound()
  const code = decodeURIComponent(raw)
  const t = getLearnAppText(lang).cert
  const cert = verifyCode(code)
  const track = cert ? COURSE.tracks.find((tr) => tr.id === cert.t) : undefined
  const date = cert ? new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${cert.d}T12:00:00Z`)) : ''

  return (
    <AppShell lang={lang}>
      <div className="container grid max-w-3xl gap-6 py-10">
        {cert && track ? (
          <>
            <p className="alert alert-ok m-0" role="status">
              <BadgeCheck size={20} aria-hidden="true" />
              <span>
                <strong>{t.verified}.</strong> {t.verifiedText}
              </span>
            </p>
            <Card className="items-center gap-3 border-(length:--stroke) py-10 text-center">
              <TrackIcon icon={track.icon} color={track.color} className="size-16 [&_svg]:size-8" />
              <p className="m-0 font-display text-sm font-extrabold tracking-[0.3em] text-muted-foreground">{t.heading}</p>
              <h1 className="m-0 text-4xl md:text-5xl">{cert.n}</h1>
              <p className="m-0 text-lg text-muted-foreground">{t.for}</p>
              <p className="m-0 font-display text-2xl font-extrabold">«{track.title[lang]}»</p>
              <p className="m-0 text-sm text-muted-foreground">
                {fill(t.issued, { date })} · {fill(t.lessons, { n: cert.l })}
              </p>
            </Card>
            <a className={buttonVariants({ variant: 'primary', className: 'justify-self-start' })} href={`/api/learn/cert/pdf?code=${encodeURIComponent(code)}&lang=${lang}`} download>
              <FileDown aria-hidden="true" />
              {t.download}
            </a>
            <p className="m-0 text-sm text-muted-foreground">{t.note}</p>
          </>
        ) : (
          <Card className="gap-3">
            <ShieldX className="size-10 text-destructive" aria-hidden="true" />
            <h1 className="m-0 text-3xl">{t.invalid}</h1>
            <p className="m-0 text-muted-foreground">{t.invalidText}</p>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
