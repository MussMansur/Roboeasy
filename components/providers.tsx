'use client'

import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

/** App-wide client providers: tooltips and toasts. (Animations are CSS with motion-reduce variants; the achievement dialog checks reduced motion itself.) */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      {children}
      <Toaster />
    </TooltipProvider>
  )
}
