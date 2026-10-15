'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Menu, X } from 'lucide-react'

import { LogoMark } from '@/components/logo'
import { ThemeSwitch } from '@/components/theme-switch'
import { buttonVariants } from '@/components/ui/button'
import { type Locale, LOCALE_COOKIE, localeLabels, locales } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/ru'

interface SiteHeaderProps {
  lang: Locale
  t: Dictionary['nav']
  /** Landing shows section links; app pages show the app sections. */
  variant?: 'landing' | 'studio'
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
  const sections =
    variant === 'landing'
      ? [
          { href: '#how', label: t.how },
          { href: '#examples', label: t.examples },
          { href: '#teachers', label: t.teachers },
          { href: '#faq', label: t.faq },
        ]
      : []
  // App pages, marked current by path.
  const pages = [
    { href: `${home}/workspace`, label: t.studio, current: rest.startsWith('/workspace') },
    { href: `${home}/fll`, label: t.fll, current: rest.startsWith('/fll') },
  ]

  return (
    <>
      {/* Outside the header: its backdrop-filter would become the containing block of this fixed link. */}
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="site-header" data-scrolled={scrolled}>
        <div className="container">
          <Link className="brand" href={home}>
            <LogoMark />
            <span className="brand-name">RoboEasy</span>
            <span className="brand-ai">AI</span>
          </Link>

          <nav className="main-nav" aria-label={t.menu}>
            {sections.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
            {variant === 'studio' &&
              pages.map((p) => (
                <Link key={p.href} href={p.href} aria-current={p.current ? 'page' : undefined}>
                  {p.label}
                </Link>
              ))}
          </nav>

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
            <ThemeSwitch labels={{ theme: t.theme, system: t.themeSystem, light: t.themeLight, dark: t.themeDark }} />
            {variant === 'landing' ? (
              <>
                <Link className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'header-wide' })} href={`${home}/fll`}>
                  {t.fll}
                </Link>
                <Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'header-wide' })} href={`${home}/workspace`}>
                  {t.open}
                </Link>
              </>
            ) : (
              <Link className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'header-wide' })} href={home}>
                <House aria-hidden="true" />
                {t.home}
              </Link>
            )}
            <button
              type="button"
              className={buttonVariants({ size: 'icon', className: 'menu-toggle' })}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={t.menu}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div id="mobile-nav" className="mobile-nav" data-open={open}>
          {sections.map((l) => (
            <a key={l.href} className="mobile-link" href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          {variant === 'studio' && (
            <Link className="mobile-link" href={home} onClick={() => setOpen(false)}>
              {t.home}
            </Link>
          )}
          {pages.map((p) => (
            <Link key={p.href} href={p.href} aria-current={p.current ? 'page' : undefined} onClick={() => setOpen(false)} className="mobile-link">
              {p.label}
            </Link>
          ))}
          {variant === 'landing' && (
            <Link className={buttonVariants({ variant: 'primary', block: true })} href={`${home}/workspace`} onClick={() => setOpen(false)}>
              {t.open}
            </Link>
          )}
        </div>
      </header>
    </>
  )
}
