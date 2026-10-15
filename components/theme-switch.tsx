'use client'

import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Hint } from '@/components/ui/tooltip'
import { THEME_PREFS, type ThemePref, useTheme } from '@/lib/theme'

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const

/** One button that cycles system → light → dark; the tooltip names the current mode. */
export function ThemeSwitch({ labels }: { labels: { theme: string } & Record<ThemePref, string> }) {
  const { pref, setPref } = useTheme()
  const next = THEME_PREFS[(THEME_PREFS.indexOf(pref) + 1) % THEME_PREFS.length]
  const Icon = ICONS[pref]
  const label = `${labels.theme}: ${labels[pref]}`
  return (
    <Hint label={label}>
      <Button variant="secondary" size="icon" aria-label={label} onClick={() => setPref(next)}>
        <Icon aria-hidden="true" />
      </Button>
    </Hint>
  )
}
