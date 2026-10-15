'use client'

import { CircleCheck, Info, Loader2, OctagonX, TriangleAlert } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/lib/theme'

/** Toasts (sonner) in the constructor style; follows the site theme. */
function Toaster(props: ToasterProps) {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-[18px]" />,
        info: <Info className="size-[18px]" />,
        warning: <TriangleAlert className="size-[18px]" />,
        error: <OctagonX className="size-[18px]" />,
        loading: <Loader2 className="size-[18px] animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-(--radius-sm) !border-(length:--stroke) !border-outline !bg-card !font-sans !text-[0.9375rem] !font-bold !text-foreground !shadow-(--shadow-hard-sm)',
          description: '!text-muted-foreground !font-medium',
          actionButton: '!bg-primary !text-primary-foreground !font-extrabold',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
