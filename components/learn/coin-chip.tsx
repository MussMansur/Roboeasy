'use client'

import { useMemo } from 'react'
import Link from 'next/link'

import { CoinAmount } from '@/components/learn/coin'
import { ledger } from '@/lib/learn/economy'
import { useHydrated, useLearn } from '@/lib/learn/store'

/** The coin balance in the header; links to the garage. Hidden until there is a profile. */
export function CoinChip({ href, label }: { href: string; label: string }) {
  const hydrated = useHydrated()
  const learn = useLearn()
  const coins = useMemo(() => (learn.profile ? ledger(learn).coins : null), [learn])
  if (!hydrated || coins === null) return null
  return (
    <Link
      prefetch={false}
      href={href}
      className="hidden min-h-10 items-center sm:inline-flex rounded-full border-(length:--stroke-thin) border-outline bg-card px-3 shadow-(--shadow-press)"
      aria-label={`${label}: ${coins}`}
      data-testid="coin-chip"
    >
      <CoinAmount n={coins} />
    </Link>
  )
}
