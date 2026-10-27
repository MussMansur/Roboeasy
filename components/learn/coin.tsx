import { cn } from '@/lib/utils'

/** The RoboEasy coin: a gold disc with a gear. */
export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5 shrink-0', className)} aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="#ffc531" stroke="#1b1f2a" strokeWidth="2" />
      <circle cx="12" cy="12" r="7" fill="#ffd96b" />
      <path
        d="M12 7.2l1 1.6 1.8-.5.3 1.9 1.8.7-.8 1.7.8 1.7-1.8.7-.3 1.9-1.8-.5-1 1.6-1-1.6-1.8.5-.3-1.9-1.8-.7.8-1.7-.8-1.7 1.8-.7.3-1.9 1.8.5z"
        fill="#c98a00"
      />
      <circle cx="12" cy="12" r="1.8" fill="#ffd96b" />
    </svg>
  )
}

export function CoinAmount({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-display font-extrabold tabular-nums', className)}>
      <CoinIcon />
      {n}
    </span>
  )
}
