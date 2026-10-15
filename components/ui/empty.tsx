import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Empty state: what is missing, why, and what to do next. Based on the
 * shadcn/ui Empty layout, in the constructor style.
 */
function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-4 rounded-(--radius-md) border-(length:--stroke-thin) border-dashed border-outline/40 bg-card/80 p-6 text-center text-balance md:p-8',
        className,
      )}
      {...props}
    />
  )
}

function EmptyMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-media"
      className={cn(
        "grid size-14 place-items-center rounded-(--radius-sm) border-(length:--stroke) border-outline bg-primary text-primary-foreground shadow-(--shadow-hard-sm) [&_svg:not([class*='size-'])]:size-7",
        className,
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 data-slot="empty-title" className={cn('m-0 font-display text-lg font-bold', className)} {...props} />
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="empty-description" className={cn('m-0 max-w-[52ch] text-sm leading-relaxed text-muted-foreground', className)} {...props} />
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-content" className={cn('flex flex-wrap items-center justify-center gap-2.5', className)} {...props} />
}

/** The common case in one call. */
function EmptyState({ icon, title, description, children, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <Empty className={className}>
      {icon && <EmptyMedia aria-hidden="true">{icon}</EmptyMedia>}
      <EmptyTitle>{title}</EmptyTitle>
      {description && <EmptyDescription>{description}</EmptyDescription>}
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  )
}

export { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyState, EmptyTitle }
