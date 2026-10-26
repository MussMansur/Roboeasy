import Link from 'next/link'

import { LogoMark } from '@/components/logo'
import { isLocale } from '@/lib/i18n/config'
import { getLegal } from '@/lib/i18n/legal'
import type { Dictionary } from '@/lib/i18n/ru'

export function SiteFooter({ lang, t }: { lang: string; t: Dictionary['footer'] }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div style={{ display: 'grid', gap: 10 }}>
          <Link className="brand" href={`/${lang}`}>
            <LogoMark size={28} />
            <span>RoboEasy</span>
            <span className="brand-ai">AI</span>
          </Link>
          <p style={{ margin: 0 }}>{t.tagline}</p>
          {isLocale(lang) && (
            <nav className="flex flex-wrap gap-4 text-sm font-bold" aria-label={getLegal('privacy', lang).title}>
              <Link className="underline underline-offset-4" href={`/${lang}/privacy`}>
                {getLegal('privacy', lang).title}
              </Link>
              <Link className="underline underline-offset-4" href={`/${lang}/parents`}>
                {getLegal('parents', lang).title}
              </Link>
            </nav>
          )}
        </div>
        <p className="footer-legal">
          © {new Date().getFullYear()} RoboEasy. {t.legal}
        </p>
      </div>
    </footer>
  )
}
