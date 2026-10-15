import type { KeyboardEvent } from 'react'

import { ArrowMarker, FieldFrame, ForbiddenShape, LaunchAreaShape, MatBase, MissionShape } from '@/components/fll/field-shapes'
import { svgPoints } from '@/lib/fll/geometry'
import { type Point, type Season, localize } from '@/lib/fll/season'

export const RUN_COLORS = ['#ff4ccd', '#0090f5', '#ffab19', '#27a844', '#9966ff', '#e02020', '#00b3a4', '#8a6a00']

interface FieldProps {
  season: Season
  lang: 'ru' | 'kk' | 'en'
  selected: ReadonlySet<string>
  onToggle: (missionId: string) => void
  /** Routes to draw, in run order. */
  routes?: Point[][]
  /** Rectified user background (object URL) — stays in the browser. */
  background?: string | null
  backgroundOpacity?: number
  label: string
}

/** The schematic FLL mat drawn from season data. */
export function Field({ season, lang, selected, onToggle, routes = [], background, backgroundOpacity, label }: FieldProps) {
  const { widthMm: W, heightMm: H } = season.field

  const onKey = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(id)
    }
  }

  return (
    <svg className="fll-field" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label}>
      <defs>
        <ArrowMarker />
      </defs>
      <MatBase width={W} height={H} background={background} backgroundOpacity={backgroundOpacity} unit={lang === 'en' ? 'mm' : 'мм'} />
      <FieldFrame height={H}>
        {season.forbiddenZones.map((z) => (
          <ForbiddenShape key={z.id} zone={z} />
        ))}
        {season.launchAreas.map((a) => (
          <LaunchAreaShape key={a.id} area={a} label={localize(a.name, lang)} />
        ))}

        {routes.map((route, i) =>
          route.length > 1 ? <polyline key={i} className="fll-route" points={svgPoints(route)} style={{ stroke: RUN_COLORS[i % RUN_COLORS.length] }} /> : null,
        )}

        {season.missions.map((m) => {
          const on = selected.has(m.id)
          return (
            <g
              key={m.id}
              className="fll-mission"
              data-selected={on}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${m.number}. ${localize(m.name, lang) || m.id}, ${m.points}`}
              onClick={() => onToggle(m.id)}
              onKeyDown={onKey(m.id)}
            >
              <MissionShape mission={m} />
            </g>
          )
        })}
      </FieldFrame>
    </svg>
  )
}
