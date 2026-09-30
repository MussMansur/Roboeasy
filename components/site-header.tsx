'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Moon, Sun, X } from 'lucide-react'

import { LogoMark } from '@/components/logo'
import { type Locale, LOCALE_COOKIE, localeLabels, locales } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/ru'

interface SiteHeaderProps {
  lang: Locale
  t: Dictionary['nav']
  /** Landing shows section links; the studio keeps the header minimal. */
  variant?: 'landing' | 'studio'
}

function toggleTheme() {
  const root = document.documentElement
  const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
  root.setAttribute('data-theme', next)
  try {
    localStorage.setItem('theme', next)
  } catch {}
}

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
}

export function SiteHeader({ lang, t, variant = 'landing' }: SiteHeaderProps) {
  const pathname = usePathname() ?? `/${lang}`
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const rest = pathname.replace(/^\/(ru|kk|en)(?=\/|$)/, '')
  const home = `/${lang}`
  const links =
    variant === 'landing'
      ? [
          { href: '#how', label: t.how },
          { href: '#examples', label: t.examples },
          { href: '#teachers', label: t.teachers },
          { href: '#faq', label: t.faq },
        ]
      : []

  return (
    <>
      {/* Outside the header: its backdrop-filter would become the containing block of this fixed link. */}
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="site-header" data-scrolled={scrolled}>
        <div className="container">
          <Link className="brand" href={home} aria-label="RoboEasy AI">
            <LogoMark />
            <span className="brand-name">RoboEasy</span>
            <span className="brand-ai">AI</span>
          </Link>

          {links.length > 0 && (
            <nav className="main-nav" aria-label={t.menu}>
              {links.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </nav>
          )}

          <div className="header-actions">
            <nav className="lang-switch" aria-label={t.language}>
              {/* Plain links: each language has its own root layout, so a full load keeps the theme script working. */}
              {locales.map((l) => (
                <a
                  key={l}
                  href={`/${l}${rest}`}
                  hrefLang={l}
                  lang={l}
                  aria-current={l === lang ? 'true' : undefined}
                  title={localeLabels[l].name}
                  onClick={() => rememberLocale(l)}
                >
                  {localeLabels[l].short}
                </a>
              ))}
            </nav>
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={t.theme} title={t.theme}>
              <Sun size={18} className="theme-icon-sun" aria-hidden="true" />
              <Moon size={18} className="theme-icon-moon" aria-hidden="true" />
            </button>
            <Link className="btn btn-ghost btn-sm header-fll" href={`${home}/fll`}>
              {t.fll}
            </Link>
            {variant === 'landing' ? (
              <>
                <Link className="btn btn-primary btn-sm header-cta" href={`${home}/workspace`}>
                  {t.open}
                </Link>
                <button
                  type="button"
                  className="icon-btn menu-toggle"
                  aria-expanded={open}
                  aria-controls="mobile-nav"
                  aria-label={t.menu}
                  onClick={() => setOpen((v) => !v)}
                >
                  {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                </button>
              </>
            ) : (
              <Link className="btn btn-ghost btn-sm" href={home}>
                {t.home}
              </Link>
            )}
          </div>
        </div>

        {variant === 'landing' && (
          <div id="mobile-nav" className="mobile-nav" data-open={open}>
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link href={`${home}/fll`} onClick={() => setOpen(false)}>
              {t.fll}
            </Link>
            <Link className="btn btn-primary btn-block" href={`${home}/workspace`} onClick={() => setOpen(false)}>
              {t.open}
            </Link>
          </div>
        )}
      </header>
    </>
  )
}
