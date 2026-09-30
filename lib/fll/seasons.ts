import bioglow2026 from '../../data/seasons/bioglow-2026.json'
import index from '../../data/seasons/index.json'
import unearthed2025 from '../../data/seasons/unearthed-2025.json'
import { type Season, parseSeason } from './season'

/**
 * Season files shipped with the app. data/seasons/index.json sets the order;
 * a new season file is registered here by its file name (tests check that
 * both lists match).
 */
export const SEASON_FILES: Record<string, unknown> = {
  'bioglow-2026.json': bioglow2026,
  'unearthed-2025.json': unearthed2025,
}

/** Seasons in index order, validated at import. */
export const SEASON_LIST: Season[] = index.seasons.map((entry) => {
  const season = parseSeason(SEASON_FILES[entry.file])
  if (season.id !== entry.id) throw new Error(`data/seasons/index.json: ${entry.file} has id ${season.id}, expected ${entry.id}`)
  return season
})

export const SEASONS: Record<string, Season> = Object.fromEntries(SEASON_LIST.map((s) => [s.id, s]))

/** The season with status "current" (the first one if several), else the first season. */
export const DEFAULT_SEASON_ID = (SEASON_LIST.find((s) => s.status === 'current') ?? SEASON_LIST[0]).id

export function getSeason(id: string): Season | null {
  return SEASONS[id] ?? null
}
