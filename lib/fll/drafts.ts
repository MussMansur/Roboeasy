/** Editor drafts: one per shipped season, kept in this browser's IndexedDB. */

import { idbDelete, idbGet, idbSet } from '../idb'
import { type Season, safeParseSeason } from './season'

export interface StoredDraft {
  season: unknown
  savedAt: number
}

/** The validated draft of a season, or null when there is none (or it is broken). */
export async function loadDraft(seasonId: string): Promise<{ season: Season; savedAt: number } | null> {
  const draft = await idbGet<StoredDraft>('drafts', seasonId)
  if (!draft) return null
  const parsed = safeParseSeason(draft.season)
  return parsed.ok ? { season: parsed.season, savedAt: draft.savedAt } : null
}

export const saveDraft = (seasonId: string, season: Season, savedAt = Date.now()) => idbSet('drafts', seasonId, { season, savedAt } satisfies StoredDraft)

export const deleteDraft = (seasonId: string) => idbDelete('drafts', seasonId)
