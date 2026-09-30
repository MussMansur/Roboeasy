'use client'

import { useEffect, useState } from 'react'

import { type Season, localize } from '@/lib/fll/season'
import type { Dictionary } from '@/lib/i18n/ru'

/**
 * The selected season lives in the `?season=` query parameter, so the planner
 * and the editor open the same season and links can be shared. Without it the
 * current season is used.
 */
export function useSeasonChoice(seasons: readonly Season[], defaultId: string) {
  const [seasonId, setSeasonId] = useState(defaultId)

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('season')
    if (fromUrl && seasons.some((s) => s.id === fromUrl)) setSeasonId(fromUrl)
  }, [seasons])

  const choose = (id: string) => {
    setSeasonId(id)
    const url = new URL(window.location.href)
    if (id === defaultId) url.searchParams.delete('season')
    else url.searchParams.set('season', id)
    window.history.replaceState(window.history.state, '', url)
  }

  return [seasonId, choose] as const
}

export function seasonLabel(season: Season, lang: 'ru' | 'kk' | 'en', t: Dictionary['fll']) {
  return `${localize(season.name, lang)} ${season.years} · ${t.seasonStatus[season.status]}`
}

export function SeasonSelect({ seasons, value, onChange, lang, t }: { seasons: readonly Season[]; value: string; onChange: (id: string) => void; lang: 'ru' | 'kk' | 'en'; t: Dictionary['fll'] }) {
  return (
    <label className="fll-season">
      <span>{t.season}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {seasonLabel(s, lang, t)}
          </option>
        ))}
      </select>
    </label>
  )
}
