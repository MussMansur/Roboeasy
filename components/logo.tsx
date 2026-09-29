const SMILE = '0000001010000001000101110'

/** RoboEasy mark: the SPIKE hub's 5x5 light matrix showing a smile. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const cell = 4
  const gap = 1.6
  const start = (32 - (5 * cell + 4 * gap)) / 2
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#FFD23F" />
      {SMILE.split('').map((on, i) => (
        <rect
          key={i}
          x={start + (i % 5) * (cell + gap)}
          y={start + Math.floor(i / 5) * (cell + gap)}
          width={cell}
          height={cell}
          rx="1.2"
          fill="#15171A"
          opacity={on === '1' ? 1 : 0.14}
        />
      ))}
    </svg>
  )
}
