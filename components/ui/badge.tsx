import * as React from 'react'
import { type VariantProps, cva } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-sans text-[0.8125rem] font-bold leading-none [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        /** Soft chip for counters and info. */
        default: 'bg-surface-2 text-muted-foreground',
        /** Outlined chip for statuses. */
        outline: 'border-(length:--stroke-thin) border-outline bg-card text-foreground',
        primary: 'border-(length:--stroke-thin) border-outline bg-primary text-primary-foreground',
        success: 'bg-(--ok-bg) text-success',
        warn: 'bg-warn-bg text-warn',
        danger: 'bg-danger-bg text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({ className, variant, asChild = false, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'
  return <Comp data-slot="badge" data-variant={variant ?? 'default'} className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
