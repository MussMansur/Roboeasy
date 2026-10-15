'use client'

import { type MouseEvent, type PointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { ArrowMarker, FieldFrame, ForbiddenShape, LaunchAreaShape, MatBase, MissionShape, MissionZone } from '@/components/fll/field-shapes'
import { type ItemKind, type Selection, getItem, moveItem, snap, snapPoint, updateItem } from '@/lib/fll/editor-model'
import { type Frame, actionZoneFrame, shapePoints, svgPoints, toField, toLocal } from '@/lib/fll/geometry'
import { normalizeDeg } from '@/lib/fll/path'
import { type Point, type Season, type Shape, localize } from '@/lib/fll/season'

export type Tool = 'select' | 'mission' | 'launch' | 'forbidden'

/** Visible part of the field in SVG units (mm, y down); height follows the aspect ratio. */
export interface View {
  x: number
  y: number
  w: number
}

export const VIEW_MARGIN = 80

export function fitView(season: Season): View {
  return { x: -VIEW_MARGIN, y: -VIEW_MARGIN, w: season.field.widthMm + 2 * VIEW_MARGIN }
}

/** Which shape of an item a handle edits. */
type Part = 'body' | 'zone'

type Gesture =
  | { type: 'pan'; client: Point; view: View; moved: boolean }
  | { type: 'move'; sel: Selection; start: Point; base: Season; key: string }
  | { type: 'rotate'; sel: Selection; part: Part; base: Season; key: string }
  | { type: 'resize'; sel: Selection; part: Part; base: Season; key: string }
  | { type: 'vertex'; sel: Selection; part: Part; index: number; base: Season; key: string }
  | { type: 'zone'; sel: Selection; start: Point; base: Season; key: string }
  | { type: 'via'; sel: Selection; index: number; base: Season; key: string }
  | { type: 'start'; sel: Selection; base: Season; key: string }

interface CanvasProps {
  season: Season
  lang: 'ru' | 'kk' | 'en'
  tool: Tool
  selection: Selection | null
  grid: number
  snapOn: boolean
  view: View
  onView: (v: View) => void
  background: string | null
  backgroundOpacity: number
  onSelect: (sel: Selection | null) => void
  onChange: (next: Season, key: string) => void
  onPlace: (at: Point) => void
  onCursor: (p: Point | null) => void
  label: string
}

let gestureCounter = 0

/** Frame and shape of an item part. */
function target(season: Season, sel: Selection, part: Part): { frame: Frame; shape: Shape } | null {
  if (sel.kind === 'mission') {
    const m = getItem(season, 'mission', sel.id)
    if (!m) return null
    return part === 'zone' ? { frame: actionZoneFrame(m), shape: m.actionZone.shape } : { frame: m, shape: m.outline }
  }
  const z = getItem(season, sel.kind, sel.id)
  return z ? { frame: z, shape: z.shape } : null
}

function setShape(season: Season, sel: Selection, part: Part, shape: Shape): Season {
  if (sel.kind === 'mission')
    return updateItem(season, 'mission', sel.id, (m) => (part === 'zone' ? { ...m, actionZone: { ...m.actionZone, shape } } : { ...m, outline: shape }))
  return updateItem(season, sel.kind, sel.id, (z) => ({ ...z, shape }))
}

function setRotation(season: Season, sel: Selection, part: Part, deg: number): Season {
  if (sel.kind === 'mission')
    return updateItem(season, 'mission', sel.id, (m) =>
      part === 'zone' ? { ...m, actionZone: { ...m.actionZone, rotationDeg: normalizeDeg(deg - m.rotationDeg) } } : { ...m, rotationDeg: deg },
    )
  return updateItem(season, sel.kind, sel.id, (z) => ({ ...z, rotationDeg: deg }))
}

const round = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) })

export function EditorCanvas(props: CanvasProps) {
  const { season, lang, tool, selection, grid, snapOn, view, onView, background, backgroundOpacity, onSelect, onChange, onPlace, onCursor, label } = props
  const { widthMm: W, heightMm: H } = season.field
  const svg = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [pxPerMm, setPxPerMm] = useState(0.4)
  const aspect = (H + 2 * VIEW_MARGIN) / (W + 2 * VIEW_MARGIN)
  const vh = view.w * aspect
  const g = snapOn ? grid : 0

  // Handle sizes stay constant on screen.
  useLayoutEffect(() => {
    const el = svg.current
    if (!el) return
    const measure = () => setPxPerMm(el.getBoundingClientRect().width / view.w || 0.4)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [view.w])
  const hs = 7 / pxPerMm

  // Wheel zoom around the cursor (a native listener, so the page does not scroll).
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const ctm = el.getScreenCTM()
      if (!ctm) return
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
      const v = viewRef.current
      const factor = Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100) * 0.002)
      const w = Math.min((W + 2 * VIEW_MARGIN) * 2, Math.max(W / 25, v.w * factor))
      const k = w / v.w
      onView({ x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k, w })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [W, onView])

  const toFieldPoint = (clientX: number, clientY: number): Point | null => {
    const ctm = svg.current?.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: H - p.y }
  }

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const p = toFieldPoint(e.clientX, e.clientY)
    if (!p) return
    const el = (e.target as Element).closest<SVGElement>('[data-handle]')
    e.currentTarget.setPointerCapture(e.pointerId)
    const key = `gesture:${++gestureCounter}`

    if (tool !== 'select' && !el) {
      onPlace(snapPoint(p, g))
      return
    }
    if (!el) {
      gesture.current = { type: 'pan', client: { x: e.clientX, y: e.clientY }, view, moved: false }
      return
    }
    const handle = el.dataset.handle
    const sel: Selection = { kind: el.dataset.kind as ItemKind, id: el.dataset.id ?? '' }
    const part = (el.dataset.part as Part | undefined) ?? 'body'
    const index = Number(el.dataset.index ?? -1)
    switch (handle) {
      case 'item':
        onSelect(sel)
        gesture.current = { type: 'move', sel, start: p, base: season, key }
        break
      case 'zone':
        onSelect(sel)
        gesture.current = { type: 'zone', sel, start: p, base: season, key }
        break
      case 'rotate':
        gesture.current = { type: 'rotate', sel, part, base: season, key }
        break
      case 'resize':
        gesture.current = { type: 'resize', sel, part, base: season, key }
        break
      case 'vertex':
        gesture.current = { type: 'vertex', sel, part, index, base: season, key }
        break
      case 'mid': {
        // Insert a vertex in the middle of the side, then drag it.
        const t = target(season, sel, part)
        if (!t || t.shape.kind !== 'polygon') return
        const pts = t.shape.points
        const a = pts[index]
        const b = pts[(index + 1) % pts.length]
        const points = [...pts.slice(0, index + 1), round({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), ...pts.slice(index + 1)]
        const base = setShape(season, sel, part, { kind: 'polygon', points })
        onChange(base, key)
        gesture.current = { type: 'vertex', sel, part, index: index + 1, base, key }
        break
      }
      case 'via':
        gesture.current = { type: 'via', sel, index, base: season, key }
        break
      case 'start':
        gesture.current = { type: 'start', sel, base: season, key }
        break
    }
  }

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const p = toFieldPoint(e.clientX, e.clientY)
    onCursor(p && p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H ? round(p) : null)
    const gs = gesture.current
    if (!gs || !p) return
    if (gs.type === 'pan') {
      const ctm = svg.current?.getScreenCTM()
      if (!ctm) return
      const dx = e.clientX - gs.client.x
      const dy = e.clientY - gs.client.y
      if (Math.hypot(dx, dy) > 3) gs.moved = true
      onView({ x: gs.view.x - dx / ctm.a, y: gs.view.y - dy / ctm.d, w: gs.view.w })
      return
    }
    const { base, sel, key } = gs
    switch (gs.type) {
      case 'move': {
        const item = getItem(base, sel.kind, sel.id)
        if (!item) return
        // Snap the item's center, not the cursor offset.
        const x = snap(item.x + p.x - gs.start.x, g)
        const y = snap(item.y + p.y - gs.start.y, g)
        onChange(moveItem(base, sel, x - item.x, y - item.y), key)
        break
      }
      case 'zone': {
        const m = getItem(base, 'mission', sel.id)
        if (!m) return
        const from = toLocal(m, snapPoint(gs.start, g))
        const to = toLocal(m, snapPoint(p, g))
        const dx = Math.round(m.actionZone.dx + to.x - from.x)
        const dy = Math.round(m.actionZone.dy + to.y - from.y)
        onChange(updateItem(base, 'mission', sel.id, (x) => ({ ...x, actionZone: { ...x.actionZone, dx, dy } })), key)
        break
      }
      case 'rotate': {
        const t = target(base, sel, gs.part)
        if (!t) return
        const raw = (Math.atan2(p.y - t.frame.y, p.x - t.frame.x) * 180) / Math.PI - 90
        const deg = normalizeDeg(snapOn ? Math.round(raw / 5) * 5 : Math.round(raw))
        onChange(setRotation(base, sel, gs.part, deg), key)
        break
      }
      case 'resize': {
        const t = target(base, sel, gs.part)
        if (!t || t.shape.kind !== 'rect') return
        const local = toLocal(t.frame, p)
        const size = (v: number) => Math.max(20, snap(Math.abs(v) * 2, g))
        onChange(setShape(base, sel, gs.part, { kind: 'rect', width: size(local.x), height: size(local.y) }), key)
        break
      }
      case 'vertex': {
        const t = target(base, sel, gs.part)
        if (!t || t.shape.kind !== 'polygon') return
        const local = round(toLocal(t.frame, snapPoint(p, g)))
        const points = t.shape.points.map((v, i) => (i === gs.index ? local : v))
        onChange(setShape(base, sel, gs.part, { kind: 'polygon', points }), key)
        break
      }
      case 'via': {
        const at = snapPoint(p, g)
        onChange(updateItem(base, 'mission', sel.id, (m) => ({ ...m, plan: { ...m.plan, via: m.plan.via.map((v, i) => (i === gs.index ? at : v)) } })), key)
        break
      }
      case 'start': {
        const at = snapPoint(p, g)
        onChange(updateItem(base, 'launch', sel.id, (a) => ({ ...a, start: { ...a.start, ...at } })), key)
        break
      }
    }
  }

  const onUp = () => {
    const gs = gesture.current
    if (gs?.type === 'pan' && !gs.moved) onSelect(null)
    gesture.current = null
  }

  const onDoubleClick = (e: MouseEvent<SVGSVGElement>) => {
    const el = (e.target as Element).closest<SVGElement>('[data-handle="vertex"]')
    if (!el) return
    const sel: Selection = { kind: el.dataset.kind as ItemKind, id: el.dataset.id ?? '' }
    const part = (el.dataset.part as Part | undefined) ?? 'body'
    const t = target(season, sel, part)
    if (!t || t.shape.kind !== 'polygon' || t.shape.points.length <= 3) return
    const index = Number(el.dataset.index)
    onChange(setShape(season, sel, part, { kind: 'polygon', points: t.shape.points.filter((_, i) => i !== index) }), `vertex-delete:${++gestureCounter}`)
  }

  const isSel = (kind: ItemKind, id: string) => selection?.kind === kind && selection.id === id
  const data = (kind: ItemKind, id: string, handle: string, extra: Record<string, string | number> = {}) => ({
    'data-handle': handle,
    'data-kind': kind,
    'data-id': id,
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`data-${k}`, String(v)])),
  })

  /** Rotate / resize / vertex handles of one shape. */
  const shapeHandles = (sel: Selection, part: Part) => {
    const t = target(season, sel, part)
    if (!t) return null
    const pts = shapePoints(t.shape)
    const top = Math.max(...pts.map((q) => q.y))
    const rot = toField(t.frame, { x: 0, y: top + 40 / pxPerMm })
    const topMid = toField(t.frame, { x: 0, y: top })
    return (
      <g className="ed-handles">
        <line x1={topMid.x} y1={topMid.y} x2={rot.x} y2={rot.y} />
        <circle className="ed-rotate" cx={rot.x} cy={rot.y} r={hs} {...data(sel.kind, sel.id, 'rotate', { part })} />
        {t.shape.kind === 'rect' &&
          (() => {
            const c = toField(t.frame, { x: t.shape.width / 2, y: t.shape.height / 2 })
            return <rect className="ed-resize" x={c.x - hs} y={c.y - hs} width={hs * 2} height={hs * 2} {...data(sel.kind, sel.id, 'resize', { part })} />
          })()}
        {t.shape.kind === 'polygon' &&
          t.shape.points.map((v, i, all) => {
            const a = toField(t.frame, v)
            const b = toField(t.frame, all[(i + 1) % all.length])
            return (
              <g key={i}>
                <circle className="ed-mid" cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r={hs * 0.7} {...data(sel.kind, sel.id, 'mid', { part, index: i })} />
                <rect className="ed-vertex" x={a.x - hs} y={a.y - hs} width={hs * 2} height={hs * 2} {...data(sel.kind, sel.id, 'vertex', { part, index: i })} />
              </g>
            )
          })}
      </g>
    )
  }

  const selectedHandles = () => {
    if (!selection) return null
    if (selection.kind === 'mission') {
      const m = getItem(season, 'mission', selection.id)
      if (!m) return null
      return (
        <>
          {shapeHandles(selection, 'body')}
          {shapeHandles(selection, 'zone')}
          {m.plan.via.map((v, i) => (
            <g key={i} className="ed-via">
              <rect x={v.x - hs} y={v.y - hs} width={hs * 2} height={hs * 2} transform={`rotate(45 ${v.x} ${v.y})`} {...data('mission', m.id, 'via', { index: i })} />
            </g>
          ))}
        </>
      )
    }
    if (selection.kind === 'launch') {
      const a = getItem(season, 'launch', selection.id)
      if (!a) return null
      return (
        <>
          {shapeHandles(selection, 'body')}
          <circle className="ed-start" cx={a.start.x} cy={a.start.y} r={hs * 1.2} {...data('launch', a.id, 'start')} />
        </>
      )
    }
    return shapeHandles(selection, 'body')
  }

  // Via routes of the selected mission, drawn as a dashed line to its action zone.
  const viaLine = () => {
    if (selection?.kind !== 'mission') return null
    const m = getItem(season, 'mission', selection.id)
    if (!m?.plan.via.length) return null
    const z = actionZoneFrame(m)
    return <polyline className="ed-via-line" points={svgPoints([...m.plan.via, z])} />
  }

  return (
    <svg
      ref={svg}
      className="ed-canvas"
      data-tool={tool}
      viewBox={`${view.x} ${view.y} ${view.w} ${vh}`}
      role="application"
      aria-label={label}
      style={{ aspectRatio: `${W + 2 * VIEW_MARGIN} / ${H + 2 * VIEW_MARGIN}` }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => onCursor(null)}
      onDoubleClick={onDoubleClick}
    >
      <defs>
        <ArrowMarker />
      </defs>
      <MatBase width={W} height={H} background={background} backgroundOpacity={backgroundOpacity} grid={grid || 100} unit={lang === 'en' ? 'mm' : 'мм'} />
      <FieldFrame height={H}>
        {season.forbiddenZones.map((z) => (
          <g key={z.id} className="ed-item" data-selected={isSel('forbidden', z.id)} {...data('forbidden', z.id, 'item')}>
            <ForbiddenShape zone={z} label={z.id} />
          </g>
        ))}
        {season.launchAreas.map((a) => (
          <g key={a.id} className="ed-item" data-selected={isSel('launch', a.id)} {...data('launch', a.id, 'item')}>
            <LaunchAreaShape area={a} label={localize(a.name, lang) || a.id} />
          </g>
        ))}
        {season.missions.map((m) => (
          <g key={m.id} className="ed-item fll-mission" data-selected={isSel('mission', m.id)} data-todo={m.todo === true}>
            <g {...data('mission', m.id, 'zone')}>
              <MissionZone mission={m} />
            </g>
            <g {...data('mission', m.id, 'item')}>
              <MissionShape mission={m} showZone={false} />
            </g>
          </g>
        ))}
        {viaLine()}
        {selectedHandles()}
      </FieldFrame>
    </svg>
  )
}
