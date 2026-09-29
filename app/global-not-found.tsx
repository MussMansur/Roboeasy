import type { Metadata } from 'next'
import { Onest, Unbounded } from 'next/font/google'

import { InlineScript } from '@/components/inline-script'
import { LogoMark } from '@/components/logo'
import './globals.css'

const heading = Unbounded({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-heading', display: 'swap' })
const body = Onest({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-body', display: 'swap' })

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`

export const metadata: Metadata = {
  title: '404 — RoboEasy AI',
}

const MESSAGES = [
  { lang: 'ru', title: 'Страница не найдена', link: 'На главную' },
  { lang: 'kk', title: 'Бет табылмады', link: 'Басты бетке' },
  { lang: 'en', title: 'Page not found', link: 'Go home' },
]

export default function GlobalNotFound() {
  return (
    <html lang="ru" className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        <main className="container" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <LogoMark size={72} />
            <h1 style={{ margin: '28px 0 8px', fontSize: 'clamp(3rem, 10vw, 6rem)' }}>404</h1>
            <ul style={{ display: 'grid', gap: 12, margin: '24px 0 0', padding: 0, listStyle: 'none' }}>
              {MESSAGES.map((m) => (
                <li key={m.lang} lang={m.lang} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--text-2)' }}>{m.title}</span>
                  <a className="btn btn-sm" href={`/${m.lang}`}>
                    {m.link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </body>
    </html>
  )
}
