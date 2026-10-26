import { IBM_Plex_Mono, Nunito, Rubik } from 'next/font/google'

/*
 * All three cover Kazakh Cyrillic (ә ғ қ ң ө ұ ү һ і) in the cyrillic-ext
 * subset — checked by eye in docs/audit/directions (Unbounded and JetBrains
 * Mono, used before, have no lowercase Kazakh letters).
 *
 * `subsets` only picks what is preloaded: every subset stays in the CSS and
 * loads when a page uses its letters (latin, cyrillic-ext for Kazakh).
 * Preloading just Cyrillic keeps the first load light; the code font is
 * not preloaded at all.
 */
const heading = Rubik({ subsets: ['cyrillic'], variable: '--font-heading', display: 'swap' })
const body = Nunito({ subsets: ['cyrillic'], variable: '--font-body', display: 'swap' })
const code = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], weight: ['500', '600'], variable: '--font-code', display: 'swap', preload: false })

export const fontVariables = `${heading.variable} ${body.variable} ${code.variable}`
