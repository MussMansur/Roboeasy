'use client'

import { useSyncExternalStore } from 'react'

import { THEME_KEY } from './theme-script'

/**
 * Theme preference: "system" (default) follows the OS; "light"/"dark" are
 * saved in localStorage. <html data-theme> always holds the resolved theme,
 * <html data-theme-pref> the preference (set before paint by THEME_SCRIPT).
 */
export type ThemePref = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

export const THEME_PREFS: readonly ThemePref[] = ['system', 'light', 'dark']

declare global {
  interface Window {
    __applyTheme?: () => void
  }
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, pref)
  } catch {}
  if (window.__applyTheme) window.__applyTheme()
  else {
    const dark = pref === 'dark' || (pref === 'system' && !matchMedia('(prefers-color-scheme: light)').matches)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme-pref', pref)
  }
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-theme-pref'] })
  return () => observer.disconnect()
}

const readPref = (): ThemePref => {
  const p = document.documentElement.getAttribute('data-theme-pref')
  return p === 'light' || p === 'dark' ? p : 'system'
}
const readTheme = (): Theme => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')

/** Current preference and resolved theme; re-renders when either changes. */
export function useTheme() {
  const pref = useSyncExternalStore(subscribe, readPref, () => 'system' as const)
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark' as const)
  return { pref, theme, setPref: setThemePref }
}
