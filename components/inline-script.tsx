'use client'

/**
 * Inline script that runs during HTML parsing (before paint) on full page loads.
 * On the client it is rendered as text/plain, so React does not warn about a
 * script it would never execute; suppressHydrationWarning covers the type change.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
