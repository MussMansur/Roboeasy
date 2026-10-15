import * as React from 'react'

import { cn } from '@/lib/utils'

/** A panel with the thick outline and hard shadow of the "constructor" style. */
function Card({ className, flat = false, ...props }: React.ComponentProps<'div'> & { flat?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col gap-4 rounded-(--radius-lg) border-(length:--stroke) border-outline bg-card p-5 text-card-foreground sm:p-6',
        flat ? 'shadow-none' : 'shadow-(--shadow-hard)',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex flex-wrap items-start justify-between gap-3', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 data-slot="card-title" className={cn('m-0 inline-flex items-center gap-2 font-display text-xl font-bold', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="card-description" className={cn('m-0 text-sm text-muted-foreground', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('grid gap-4', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex flex-wrap items-center gap-2.5', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
