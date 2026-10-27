'use client'

import { useEffect, useId, useState } from 'react'
import { Cloud, CloudOff, Loader2, LogOut, Mail, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { CLOUD_CONFIGURED, useCloudModule, useCloudUser } from '@/components/learn/use-cloud'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { fill } from '@/lib/i18n/config'
import type { LearnAppText } from '@/lib/i18n/learn-app'

type Lang = 'ru' | 'kk' | 'en'

/** Profile → Account: optional sign-in by email link, cloud sync status, sign out, delete. */
export function AccountCard({ lang, app }: { lang: Lang; app: LearnAppText }) {
  const t = app.account
  const id = useId()
  const mod = useCloudModule()
  const user = useCloudUser(mod)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [sync, setSync] = useState<'idle' | 'syncing' | 'synced'>('idle')

  useEffect(() => {
    if (!mod || !user) return
    let alive = true
    setSync('syncing')
    void mod.startSync().then((r) => alive && setSync(r.ok ? 'synced' : 'idle'))
    return () => {
      alive = false
    }
  }, [mod, user])

  if (!CLOUD_CONFIGURED)
    return (
      <Card flat className="gap-2" id="account">
        <CardTitle>
          <CloudOff className="size-5" aria-hidden="true" />
          {t.title}
        </CardTitle>
        <p className="m-0 text-muted-foreground">{t.unavailable}</p>
      </Card>
    )

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mod) return
    setState('sending')
    const r = await mod.signInWithEmail(email, `${window.location.origin}/${lang}/profile`)
    setState(r.ok ? 'sent' : 'error')
  }

  return (
    <Card className="gap-3" id="account">
      <CardTitle>
        <Cloud className="size-5" aria-hidden="true" />
        {t.title}
      </CardTitle>
      {user === undefined ? (
        <Loader2 className="size-5 animate-spin" aria-label={app.common.loading} />
      ) : user ? (
        <>
          <p className="m-0 font-bold">{fill(t.signedIn, { email: user.email ?? '' })}</p>
          <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground" role="status">
            {sync === 'syncing' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {sync === 'synced' ? t.synced : sync === 'syncing' ? t.syncing : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonVariants({ size: 'sm' })} onClick={() => void mod?.signOut()}>
              <LogOut aria-hidden="true" />
              {t.signOut}
            </button>
            <button
              type="button"
              className={buttonVariants({ size: 'sm', variant: 'danger' })}
              onClick={async () => {
                if (!mod || !window.confirm(t.deleteConfirm)) return
                if (await mod.deleteAccount()) toast.success(t.deleted)
                else toast.error(app.account.failed)
              }}
            >
              <Trash2 aria-hidden="true" />
              {t.deleteCloud}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="m-0 text-muted-foreground">{t.lead}</p>
          <form className="flex flex-wrap items-end gap-2" onSubmit={send}>
            <label className="grid gap-1 font-bold" htmlFor={`${id}-email`}>
              {t.email}
              <input
                id={`${id}-email`}
                type="email"
                required
                autoComplete="email"
                className="input w-72 max-w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={`${id}-hint`}
              />
            </label>
            <button type="submit" className={buttonVariants({ variant: 'primary', size: 'sm' })} disabled={state === 'sending' || !mod}>
              {state === 'sending' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Mail aria-hidden="true" />}
              {t.send}
            </button>
          </form>
          <p id={`${id}-hint`} className="m-0 text-sm text-muted-foreground">
            {t.emailHint}
          </p>
          {state === 'sent' && (
            <p className="alert alert-ok m-0" role="status">
              {t.sent}
            </p>
          )}
          {state === 'error' && (
            <p className="alert m-0 text-destructive" role="alert">
              {t.error}
            </p>
          )}
        </>
      )}
    </Card>
  )
}
