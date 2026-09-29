import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { JetBrains_Mono, Onest, Unbounded } from 'next/font/google'
import { notFound } from 'next/navigation'
import { Analytics } from '@vercel/analytics/next'

import { InlineScript } from '@/components/inline-script'
import { getDictionary, isLocale, locales } from '@/lib/i18n'
import '../globals.css'

const heading = Unbounded({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-heading', display: 'swap' })
const body = Onest({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-body', display: 'swap' })
const code = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-code', display: 'swap' })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

// Runs before paint: applies the saved theme (or the system one) so there is no flash.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`

type Params = { params: Promise<{ lang: string }> }

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang)
  return {
    metadataBase: new URL(siteUrl),
    title: t.meta.title,
    description: t.meta.description,
    applicationName: 'RoboEasy AI',
    alternates: {
      canonical: `/${lang}`,
      languages: { ru: '/ru', kk: '/kk', en: '/en', 'x-default': '/ru' },
    },
    openGraph: {
      type: 'website',
      siteName: 'RoboEasy AI',
      title: t.meta.title,
      description: t.meta.description,
      locale: lang === 'kk' ? 'kk_KZ' : lang === 'ru' ? 'ru_RU' : 'en_US',
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'RoboEasy AI' }],
    },
    twitter: { card: 'summary_large_image', title: t.meta.title, description: t.meta.description, images: ['/og.png'] },
    icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }], apple: '/apple-icon.png' },
  }
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f6f2' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d10' },
  ],
}

export default async function RootLayout({ children, params }: Params & { children: ReactNode }) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <html lang={lang} className={`${heading.variable} ${body.variable} ${code.variable}`} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
