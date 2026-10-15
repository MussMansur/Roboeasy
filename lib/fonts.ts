import { IBM_Plex_Mono, Nunito, Rubik } from 'next/font/google'

/*
 * All three cover Kazakh Cyrillic (ә ғ қ ң ө ұ ү һ і) in the cyrillic-ext
 * subset — checked by eye in docs/audit/directions (Unbounded and JetBrains
 * Mono, used before, have no lowercase Kazakh letters).
 */
const heading = Rubik({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-heading', display: 'swap' })
const body = Nunito({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-body', display: 'swap' })
const code = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], weight: ['500', '600'], variable: '--font-code', display: 'swap' })

export const fontVariables = `${heading.variable} ${body.variable} ${code.variable}`
