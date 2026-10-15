'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

/** App-wide client providers: tooltips, toasts, and motion that respects reduced-motion settings. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </MotionConfig>
  )
}
