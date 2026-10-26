'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Menu, UserRound, X } from 'lucide-react'

import { LogoMark } from '@/components/logo'
import { ThemeSwitch } from '@/components/theme-switch'
import { buttonVariants } from '@/components/ui/button'
import { type Locale, LOCALE_COOKIE, localeLabels, locales } from '@/lib/i18n/config'
import type { LearnText } from '@/lib/i18n/learn'
import type { Dictionary } from '@/lib/i18n/ru'

interface SiteHeaderProps {
  lang: Locale
  t: Dictionary['nav']
  /** Names of the app sections (Мой путь, Обучение, …). */
  sections: LearnText['nav']
  /** Landing shows section links; app pages show the app sections. */
  variant?: 'landing' | 'app'
}

/** The app sections, in menu order (docs/product/information-architecture.md). */
export const APP_SECTIONS = ['path', 'learn', 'sandbox', 'compete', 'profile'] as const
export type AppSection = (typeof APP_SECTIONS)[number]

export function currentSection(rest: string): AppSection | null {
  return (
    APP_SECTIONS.find((s) => rest === `/${s}` || rest.startsWith(`/${s}/`)) ??
    (rest.startsWith('/review') ? 'path' : rest.startsWith('/cert') ? 'profile' : null)
  )
}

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
}

/*
 * Navigation links do not prefetch: they are on every page, and prefetching
 * every section's code on each load costs more than it saves on phones.
 */
export function SiteHeader({ lang, t, sections: names, variant = 'landing' }: SiteHeaderProps) {
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
  // App sections, marked current by path. Profile sits with the actions.
  const current = currentSection(rest)
  const pages = APP_SECTIONS.filter((p) => p !== 'profile').map((p) => ({
    href: `${home}/${p}`,
    label: names[p],
    current: current === p,
  }))

  return (
    <>
      {/* Outside the header: its backdrop-filter would become the containing block of this fixed link. */}
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="site-header" data-scrolled={scrolled}>
        <div className="container">
          <Link prefetch={false} className="brand" href={home}>
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
            {variant === 'app' &&
              pages.map((p) => (
                <Link prefetch={false} key={p.href} href={p.href} aria-current={p.current ? 'page' : undefined}>
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
            <ThemeSwitch
              labels={{
                theme: t.theme,
                system: t.themeSystem,
                light: t.themeLight,
                dark: t.themeDark,
              }}
            />
            {variant === 'landing' ? (
              <>
                <Link
                  prefetch={false}
                  className={buttonVariants({
                    variant: 'ghost',
                    size: 'sm',
                    className: 'header-wide',
                  })}
                  href={`${home}/compete`}
                >
                  {names.compete}
                </Link>
                <Link
                  prefetch={false}
                  className={buttonVariants({
                    variant: 'primary',
                    size: 'sm',
                    className: 'header-wide',
                  })}
                  href={`${home}/path`}
                >
                  {names.path}
                </Link>
              </>
            ) : (
              <Link
                prefetch={false}
                className={buttonVariants({
                  variant: current === 'profile' ? 'secondary' : 'ghost',
                  size: 'sm',
                  className: 'header-wide',
                })}
                href={`${home}/profile`}
                aria-current={current === 'profile' ? 'page' : undefined}
              >
                <UserRound aria-hidden="true" />
                {names.profile}
              </Link>
            )}
            <button
              type="button"
              className={buttonVariants({
                size: 'icon',
                className: 'menu-toggle',
              })}
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
          {variant === 'app' && (
            <Link prefetch={false} className="mobile-link" href={home} onClick={() => setOpen(false)}>
              <House aria-hidden="true" className="inline size-4 align-[-2px]" /> {t.home}
            </Link>
          )}
          {[
            ...pages,
            {
              href: `${home}/profile`,
              label: names.profile,
              current: current === 'profile',
            },
          ].map((p) => (
            <Link
              prefetch={false}
              key={p.href}
              href={p.href}
              aria-current={p.current ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className="mobile-link"
            >
              {p.label}
            </Link>
          ))}
          {variant === 'landing' && (
            <Link prefetch={false} className={buttonVariants({ variant: 'primary', block: true })} href={`${home}/path`} onClick={() => setOpen(false)}>
              {names.path}
            </Link>
          )}
        </div>
      </header>
    </>
  )
}
