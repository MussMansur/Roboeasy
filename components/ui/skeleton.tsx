import { cn } from '@/lib/utils'

/** Loading placeholder; the pulse stops for users who prefer reduced motion. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('animate-pulse rounded-(--radius-sm) bg-(--surface-3) motion-reduce:animate-none', className)} {...props} />
}

export { Skeleton }
