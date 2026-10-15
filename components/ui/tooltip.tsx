'use client'

import * as React from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function TooltipProvider({ delayDuration = 300, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger(props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-[70] w-fit max-w-64 origin-(--radix-tooltip-content-transform-origin) rounded-(--radius-xs) border-(length:--stroke-thin) border-outline bg-foreground px-2.5 py-1.5 font-sans text-[0.8125rem] font-bold text-balance text-background shadow-(--shadow-press)',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:animate-none',
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

/** Shorthand: wraps one focusable element and shows `label` on hover and focus. */
function Hint({ label, children, side }: { label: string; children: React.ReactElement; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}

export { Hint, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
