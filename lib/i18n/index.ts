import type { Locale } from './config'
import { en } from './en'
import { kk } from './kk'
import { type Dictionary, ru } from './ru'

export type { Dictionary }
export * from './config'

const dictionaries: Record<Locale, Dictionary> = { ru, kk, en }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
