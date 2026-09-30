import template from '../../data/seasons/template.json'
import { type Season, parseSeason } from './season'

/** All seasons shipped with the app (data/seasons/*.json), validated at import. */
export const SEASONS: Record<string, Season> = Object.fromEntries([parseSeason(template)].map((s) => [s.id, s]))

export const DEFAULT_SEASON_ID = 'template'

export function getSeason(id: string): Season | null {
  return SEASONS[id] ?? null
}
