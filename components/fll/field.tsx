import type { KeyboardEvent } from 'react'

import { type Point, type Season, localize } from '@/lib/fll/season'

export const RUN_COLORS = ['#ff4ccd', '#0090f5', '#ffab19', '#27a844', '#9966ff', '#e02020', '#00b3a4', '#8a6a00']

interface FieldProps {
  season: Season
  lang: 'ru' | 'kk' | 'en'
  selected: ReadonlySet<string>
  onToggle: (missionId: string) => void
  /** Routes to draw, in run order. */
  routes?: Point[][]
  label: string
}

/** The FLL mat as SVG. Field y grows upward, SVG y grows downward, so y is flipped. */
export function Field({ season, lang, selected, onToggle, routes = [], label }: FieldProps) {
  const { widthMm: W, heightMm: H } = season.field
  const fy = (y: number) => H - y
  const r = Math.max(W, H) * 0.018

  const onKey = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(id)
    }
  }

  return (
    <svg className="fll-field" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label}>
      <defs>
        <pattern id="fll-grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M100 0H0V100" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="2" />
        </pattern>
        <marker id="fll-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="currentColor" />
        </marker>
      </defs>
      <rect className="fll-mat" x="0" y="0" width={W} height={H} rx="12" />
      <rect x="0" y="0" width={W} height={H} fill="url(#fll-grid)" />

      {season.launchAreas.map((a) => (
        <g key={a.id} className="fll-area">
          <rect x={a.x} y={fy(a.y + a.height)} width={a.width} height={a.height} rx="8" />
          <text x={a.x + a.width / 2} y={fy(a.y + a.height) + 60} textAnchor="middle">
            {localize(a.name, lang)}
          </text>
        </g>
      ))}

      {routes.map((route, i) =>
        route.length > 1 ? (
          <polyline
            key={i}
            className="fll-route"
            points={route.map((p) => `${p.x},${fy(p.y)}`).join(' ')}
            style={{ stroke: RUN_COLORS[i % RUN_COLORS.length] }}
          />
        ) : null,
      )}

      {season.missions.map((m) => {
        const on = selected.has(m.id)
        const rad = (m.headingDeg * Math.PI) / 180
        return (
          <g
            key={m.id}
            className="fll-mission"
            data-selected={on}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={`${m.id} ${localize(m.name, lang)}, ${m.points}`}
            onClick={() => onToggle(m.id)}
            onKeyDown={onKey(m.id)}
          >
            <line
              x1={m.x}
              y1={fy(m.y)}
              x2={m.x + Math.cos(rad) * r * 2.2}
              y2={fy(m.y + Math.sin(rad) * r * 2.2)}
              markerEnd="url(#fll-arrow)"
            />
            <circle cx={m.x} cy={fy(m.y)} r={r} />
            <text x={m.x} y={fy(m.y) + r * 0.35} textAnchor="middle">
              {m.id}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
