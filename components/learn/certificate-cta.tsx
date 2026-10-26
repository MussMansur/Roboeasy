'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Award, FileDown, Loader2 } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import type { LearnAppText } from '@/lib/i18n/learn-app'
import { COURSE } from '@/lib/learn/course'
import { completedLessons } from '@/lib/learn/state'
import { record, useLearn } from '@/lib/learn/store'
import { dayKey } from '@/lib/learn/streak'

type Lang = 'ru' | 'kk' | 'en'

/** Gets (once) and then links the certificate of a finished track. */
export function CertificateCta({ trackId, lang, app }: { trackId: string; lang: Lang; app: LearnAppText }) {
  const learn = useLearn()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const existing = learn.events.find((e) => e.kind === 'certificate' && e.track === trackId)
  const code = existing?.kind === 'certificate' ? existing.code : null

  if (code)
    return (
      <div className="flex flex-wrap gap-2">
        <Link className={buttonVariants({ variant: 'primary' })} href={`/${lang}/cert/${code}`}>
          <Award aria-hidden="true" />
          {app.cert.title}
        </Link>
        <a className={buttonVariants({ variant: 'secondary' })} href={`/api/learn/cert/pdf?code=${encodeURIComponent(code)}&lang=${lang}`} download>
          <FileDown aria-hidden="true" />
          {app.cert.download}
        </a>
      </div>
    )

  const get = async () => {
    setBusy(true)
    setError(false)
    try {
      const track = COURSE.tracks.find((t) => t.id === trackId)
      const res = await fetch('/api/learn/cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: trackId,
          nickname: learn.profile?.nickname ?? 'RoboEasy',
          lessons: [...completedLessons(learn)].filter((id) => track?.units.some((u) => u.lessons.some((l) => l.id === id))),
          date: dayKey(Date.now(), learn.profile?.timezone ?? 'UTC'),
        }),
      })
      const data = (await res.json()) as { ok: boolean; code?: string }
      if (!data.ok || !data.code) throw new Error('not issued')
      record([{ kind: 'certificate', track: trackId, code: data.code }])
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-1">
      <button type="button" className={buttonVariants({ variant: 'primary' })} onClick={() => void get()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Award aria-hidden="true" />}
        {busy ? app.cert.getting : app.track.certCta}
      </button>
      {error && (
        <p className="m-0 text-sm text-destructive" role="alert">
          {app.cert.error}
        </p>
      )}
    </div>
  )
}
