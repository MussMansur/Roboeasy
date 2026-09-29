export const locales = ['ru', 'kk', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'ru'

export const localeLabels: Record<Locale, { short: string; name: string }> = {
  ru: { short: 'RU', name: 'Русский' },
  kk: { short: 'KZ', name: 'Қазақша' },
  en: { short: 'EN', name: 'English' },
}

export const LOCALE_COOKIE = 'lang'

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}

/** Replaces `{key}` placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m))
}

/** Picks the best supported locale from an Accept-Language header. */
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)
  for (const { lang } of ranked) {
    if (lang === 'kk' || lang === 'kz') return 'kk'
    if (isLocale(lang)) return lang
  }
  return defaultLocale
}
