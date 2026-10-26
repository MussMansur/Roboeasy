import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { AdminDashboard } from '@/components/learn/admin-dashboard'
import { isLocale } from '@/lib/i18n'

type Params = { params: Promise<{ lang: string }> }

export const metadata: Metadata = { title: 'Admin — RoboEasy', robots: { index: false, follow: false } }

/** Internal analytics. Hidden in production until accounts and roles exist (TODO(db): admin role check). */
export default async function AdminPage({ params }: Params) {
  const { lang } = await params
  if (!isLocale(lang) || (process.env.NODE_ENV === 'production' && process.env.ADMIN_PREVIEW !== '1')) notFound()
  return (
    <AppShell lang={lang}>
      <AdminDashboard lang={lang} />
    </AppShell>
  )
}
