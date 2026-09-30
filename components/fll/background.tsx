'use client'

import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react'
import { Crop, ImageUp, Loader2, Trash2, X } from 'lucide-react'

import { type FieldBackground, deleteBackground, loadBackground, readPicture, rectifyPicture, saveBackground } from '@/lib/fll/background'
import { type MatCorners, imageCorners, isConvexQuad } from '@/lib/fll/homography'
import type { Point } from '@/lib/fll/season'
import { fill } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/ru'

type BgT = Dictionary['fll']['background']

/** The season's background from IndexedDB plus an object URL of the rectified image. */
export function useFieldBackground(seasonId: string) {
  const [background, setBackground] = useState<FieldBackground | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    let alive = true
    setBackground(null)
    loadBackground(seasonId)
      .then((bg) => {
        if (alive) setBackground(bg ?? null)
      })
      .catch(() => {
        if (alive) setStorageError(true)
      })
    return () => {
      alive = false
    }
  }, [seasonId])

  const rectified = background?.rectified
  useEffect(() => {
    if (!rectified) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(rectified)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [rectified])

  const save = async (next: FieldBackground) => {
    setBackground(next)
    try {
      await saveBackground(seasonId, next)
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  const remove = async () => {
    setBackground(null)
    try {
      await deleteBackground(seasonId)
    } catch {
      setStorageError(true)
    }
  }

  return { background, url, opacity: background?.opacity ?? 0.85, storageError, save, remove }
}

export type FieldBackgroundState = ReturnType<typeof useFieldBackground>

interface Draft {
  fileName: string
  source: Blob
  width: number
  height: number
  corners: MatCorners
}

interface ControlsProps {
  state: FieldBackgroundState
  field: { widthMm: number; heightMm: number }
  t: BgT
}

/** Upload / corners / remove / brightness for the field background. */
export function BackgroundControls({ state, field, t }: ControlsProps) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const { background } = state

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const pic = await readPicture(file)
      setDraft({ fileName: file.name, source: pic.blob, width: pic.width, height: pic.height, corners: imageCorners(pic.width, pic.height) })
    } catch {
      setError(t.fileError)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function apply(corners: MatCorners) {
    if (!draft) return
    setBusy(true)
    setError('')
    try {
      const rectified = await rectifyPicture(draft.source, corners, field)
      await state.save({
        version: 1,
        fileName: draft.fileName,
        source: draft.source,
        sourceWidth: draft.width,
        sourceHeight: draft.height,
        corners,
        rectified,
        opacity: background?.opacity ?? 0.85,
        updatedAt: Date.now(),
      })
      setDraft(null)
    } catch {
      setError(t.badCorners)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fll-bg">
      <div className="fll-bg-row">
        <strong>{t.title}</strong>
        <input ref={input} type="file" accept="image/*,application/pdf,.pdf" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        <button type="button" className="btn btn-sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <ImageUp size={16} aria-hidden="true" />}
          {busy ? t.working : background ? t.replace : t.upload}
        </button>
        {background && (
          <>
            <button
              type="button"
              className="btn btn-sm"
              disabled={busy}
              onClick={() =>
                setDraft({ fileName: background.fileName, source: background.source, width: background.sourceWidth, height: background.sourceHeight, corners: background.corners })
              }
            >
              <Crop size={16} aria-hidden="true" />
              {t.corners}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void state.remove()} disabled={busy}>
              <Trash2 size={16} aria-hidden="true" />
              {t.remove}
            </button>
            <label className="fll-bg-opacity">
              <span>{t.opacity}</span>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={background.opacity}
                onChange={(e) => void state.save({ ...background, opacity: Number(e.target.value) })}
              />
            </label>
          </>
        )}
      </div>
      <p className="tab-note">{t.hint}</p>
      {(error || state.storageError) && (
        <p className="alert alert-warn" role="alert">
          {error || t.storageError}
        </p>
      )}
      {draft && <CornerDialog draft={draft} t={t} busy={busy} onCancel={() => setDraft(null)} onApply={(c) => void apply(c)} />}
    </div>
  )
}

interface DialogProps {
  draft: Draft
  t: BgT
  busy: boolean
  onCancel: () => void
  onApply: (corners: MatCorners) => void
}

/** Lets the user mark the 4 mat corners on the picture (click in order, or drag). */
function CornerDialog({ draft, t, busy, onCancel, onApply }: DialogProps) {
  const [corners, setCorners] = useState<Point[]>([...draft.corners])
  const [active, setActive] = useState(0)
  const [url, setUrl] = useState<string | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef<number | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const { width: w, height: h } = draft

  useEffect(() => {
    const next = URL.createObjectURL(draft.source)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [draft.source])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    return () => previous?.focus()
  }, [])

  const toImage = (e: PointerEvent): Point | null => {
    const ctm = svg.current?.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: Math.min(w, Math.max(0, p.x)), y: Math.min(h, Math.max(0, p.y)) }
  }

  const setCorner = (i: number, p: Point) => setCorners((cs) => cs.map((c, j) => (j === i ? { x: Math.round(p.x), y: Math.round(p.y) } : c)))

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    const handle = (e.target as Element).closest('[data-corner]')
    const p = toImage(e)
    if (!p) return
    e.currentTarget.setPointerCapture(e.pointerId)
    if (handle) {
      dragging.current = Number(handle.getAttribute('data-corner'))
      setActive(dragging.current)
      return
    }
    // Click on the picture: place the active corner and move on to the next one.
    setCorner(active, p)
    dragging.current = active
    setActive((active + 1) % 4)
  }

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (dragging.current === null) return
    const p = toImage(e)
    if (p) setCorner(dragging.current, p)
  }

  const onKey = (i: number) => (e: KeyboardEvent) => {
    const step = (e.shiftKey ? 20 : 2) * Math.max(1, Math.round(Math.max(w, h) / 1000))
    const d: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } }
    const delta = d[e.key]
    if (!delta) return
    e.preventDefault()
    const c = corners[i]
    setCorner(i, { x: Math.min(w, Math.max(0, c.x + delta.x)), y: Math.min(h, Math.max(0, c.y + delta.y)) })
  }

  const valid = isConvexQuad(corners)
  const r = Math.max(w, h) / 90

  return (
    <div className="modal-backdrop" role="presentation" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div className="modal card fll-corners" role="dialog" aria-modal="true" aria-labelledby="fll-corners-title" tabIndex={-1} ref={dialog}>
        <div className="fll-corners-head">
          <h2 id="fll-corners-title">{t.dialogTitle}</h2>
          <button type="button" className="icon-btn" aria-label={t.cancel} onClick={onCancel}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="tab-note">{t.dialogLead}</p>
        <p className="fll-corners-next" aria-live="polite">
          {fill(t.next, { name: `${active + 1} · ${t.cornerNames[active]}` })}
        </p>
        <div className="fll-corners-stage">
          <svg ref={svg} viewBox={`0 0 ${w} ${h}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (dragging.current = null)} onPointerCancel={() => (dragging.current = null)}>
            {url && <image href={url} x="0" y="0" width={w} height={h} />}
            <polygon className="fll-corners-quad" data-valid={valid} points={corners.map((c) => `${c.x},${c.y}`).join(' ')} strokeWidth={r / 3} />
            {corners.map((c, i) => (
              <g
                key={i}
                data-corner={i}
                className="fll-corner"
                data-active={i === active}
                role="button"
                tabIndex={0}
                aria-label={`${i + 1}: ${t.cornerNames[i]} (${c.x}, ${c.y})`}
                onKeyDown={onKey(i)}
                onFocus={() => setActive(i)}
              >
                <circle cx={c.x} cy={c.y} r={r} strokeWidth={r / 4} />
                <text x={c.x} y={c.y} fontSize={r * 1.1} textAnchor="middle" dominantBaseline="central">
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>
        </div>
        {!valid && (
          <p className="alert alert-warn" role="alert">
            {t.badCorners}
          </p>
        )}
        <div className="toolbar">
          <button type="button" className="btn btn-sm" onClick={() => setCorners([...imageCorners(w, h)])}>
            {t.whole}
          </button>
          <span className="toolbar-spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!valid || busy} onClick={() => onApply([corners[0], corners[1], corners[2], corners[3]])}>
            {busy && <Loader2 size={16} className="spin" aria-hidden="true" />}
            {t.apply}
          </button>
        </div>
      </div>
    </div>
  )
}
