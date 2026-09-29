import Link from 'next/link'

import { LogoMark } from '@/components/logo'
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
        </div>
        <p className="footer-legal">
          © {new Date().getFullYear()} RoboEasy. {t.legal}
        </p>
      </div>
    </footer>
  )
}
