'use client'

import dynamic from 'next/dynamic'

/** The editor needs the browser (IndexedDB, pointer events), so it is not rendered on the server. */
export const SeasonEditorLoader = dynamic(() => import('@/components/fll/editor/editor'), {
  ssr: false,
  loading: () => <div className="container ed ed-placeholder" aria-busy="true" />,
})
