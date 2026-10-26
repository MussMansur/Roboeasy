'use client'

import { useEffect, useId, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { CLOUD_CONFIGURED, loadCloud } from '@/components/learn/use-cloud'
import { buttonVariants } from '@/components/ui/button'
import type { LearnAppText } from '@/lib/i18n/learn-app'

function storedSession(): boolean {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch {
    return false
  }
}

/** Optional photo of the real robot for the class teacher (signed-in class members only). */
export function RobotPhoto({ lessonId, t }: { lessonId: string; t: LearnAppText['classes'] }) {
  const id = useId()
  const [classId, setClassId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!CLOUD_CONFIGURED || !storedSession()) return
    let alive = true
    void (async () => {
      const m = await loadCloud()
      const user = await m.currentUser()
      if (!user) return
      const classes = await m.myClasses().catch(() => [])
      const member = classes.find((c) => c.teacher_id !== user.id)
      if (alive && member) setClassId(member.id)
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!classId) return null
  return (
    <div className="grid gap-1 border-t-(length:--stroke-thin) border-dashed border-outline pt-3">
      <label htmlFor={id} className={buttonVariants({ size: 'sm', className: 'cursor-pointer justify-self-start' })}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Camera aria-hidden="true" />}
        {t.photoAdd}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setBusy(true)
          const ok = await (await loadCloud()).uploadRobotPhoto(classId, lessonId, file).catch(() => false)
          setBusy(false)
          if (ok) {
            setSent(true)
            toast.success(t.photoSent)
          } else toast.error(t.error)
        }}
      />
      <p className="m-0 text-xs text-muted-foreground">{sent ? t.photoSent : t.photoHint}</p>
    </div>
  )
}
