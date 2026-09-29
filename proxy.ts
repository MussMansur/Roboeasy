import { type NextRequest, NextResponse } from 'next/server'

import { LOCALE_COOKIE, isLocale, locales, matchLocale } from '@/lib/i18n/config'

/** Sends locale-less URLs (/, /workspace) to the visitor's language. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return

  const saved = request.cookies.get(LOCALE_COOKIE)?.value
  const locale = isLocale(saved) ? saved : matchLocale(request.headers.get('accept-language'))
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Skip API routes, Next internals and files with an extension (icons, images).
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
