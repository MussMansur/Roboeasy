/** Radar of skill groups (0…1 each). Pure SVG; the numbers are also listed for screen readers. */
export function SkillRadar({ axes, label }: { axes: { id: string; title: string; value: number; done: number; total: number }[]; label: string }) {
  const size = 320
  const c = size / 2
  const r = 96
  const n = axes.length
  const point = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x: c + Math.cos(a) * r * v, y: c + Math.sin(a) * r * v }
  }
  const ring = (v: number) =>
    axes
      .map((_, i) => point(i, v))
      .map((p) => `${p.x},${p.y}`)
      .join(' ')
  // A small minimum so a fresh learner sees a shape, not a dot.
  const shape = axes.map((a, i) => point(i, Math.max(0.06, a.value)))

  return (
    <figure className="m-0 grid gap-2">
      <svg viewBox={`-70 -6 ${size + 140} ${size + 12}`} className="mx-auto w-full max-w-[26rem]" role="img" aria-label={label}>
        {[0.25, 0.5, 0.75, 1].map((v) => (
          <polygon key={v} points={ring(v)} fill="none" stroke="var(--border-strong)" strokeWidth={v === 1 ? 2 : 1} strokeDasharray={v === 1 ? undefined : '3 4'} />
        ))}
        {axes.map((_, i) => {
          const p = point(i, 1)
          return <line key={i} x1={c} y1={c} x2={p.x} y2={p.y} stroke="var(--border-strong)" strokeWidth="1" />
        })}
        <polygon
          points={shape.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="color-mix(in srgb, var(--success) 30%, transparent)"
          stroke="var(--success)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {shape.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--success)" stroke="var(--outline)" strokeWidth="1.5" />
        ))}
        {axes.map((a, i) => {
          const p = point(i, 1.2)
          const anchor = Math.abs(p.x - c) < 8 ? 'middle' : p.x > c ? 'start' : 'end'
          return (
            <text key={a.id} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle" fontSize="12" fontWeight="800" fill="var(--text)">
              {a.title}
            </text>
          )
        })}
      </svg>
      <ul className="sr-only">
        {axes.map((a) => (
          <li key={a.id}>
            {a.title}: {a.done}/{a.total}
          </li>
        ))}
      </ul>
    </figure>
  )
}
