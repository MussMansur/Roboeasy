import * as React from 'react'
import { type VariantProps, cva } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * Buttons of the "constructor" style: thick outline and a hard offset shadow
 * that "presses" on click. Use `buttonVariants()` for links and labels.
 */
const buttonBase = cva(
  [
    'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap font-sans font-extrabold leading-none',
    'rounded-(--radius-sm) border-(length:--stroke) border-outline shadow-(--shadow-hard-sm)',
    'transition-[transform,box-shadow,background-color,color] duration-150 ease-(--ease-out)',
    'hover:-translate-x-px hover:-translate-y-px hover:shadow-(--shadow-hard)',
    'active:translate-x-0.5 active:translate-y-0.5 active:shadow-(--shadow-press)',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    'motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-card text-foreground',
        danger: 'bg-card text-destructive',
        ghost:
          'border-transparent bg-transparent text-foreground shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-surface-2 hover:shadow-none active:translate-x-0 active:translate-y-0 active:shadow-none',
        link: 'h-auto border-transparent bg-transparent p-0 text-link underline underline-offset-4 shadow-none hover:translate-x-0 hover:translate-y-0 hover:shadow-none active:translate-x-0 active:translate-y-0 active:shadow-none',
      },
      size: {
        sm: 'min-h-10 px-3.5 text-[0.9375rem]',
        md: 'min-h-12 px-5 text-base',
        lg: 'min-h-14 rounded-(--radius-md) px-7 text-[1.0625rem]',
        icon: 'size-11 p-0',
        'icon-sm': 'size-9 rounded-(--radius-xs) p-0',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', block: false },
  },
)

type ButtonVariantProps = VariantProps<typeof buttonBase>

/** Variant classes merged with tailwind-merge, so a variant's utilities override the base ones. */
function buttonVariants({ className, ...variants }: ButtonVariantProps & { className?: string } = {}) {
  return cn(buttonBase(variants), className)
}

function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & ButtonVariantProps & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? 'secondary'}
      type={asChild ? undefined : type}
      className={buttonVariants({ variant, size, block, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants, type ButtonVariantProps }
