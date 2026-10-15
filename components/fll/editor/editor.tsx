'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Ban, Check, Download, Maximize, MousePointer2, Redo2, Rocket, RotateCcw, Target, Undo2, Upload, ZoomIn, ZoomOut } from 'lucide-react'

import { BackgroundControls, useFieldBackground } from '@/components/fll/background'
import { EditorCanvas, type Tool, type View, VIEW_MARGIN, fitView } from '@/components/fll/editor/canvas'
import { Inspector } from '@/components/fll/editor/inspector'
import { SeasonSelect, useSeasonChoice } from '@/components/fll/season-select'
import {
  type History,
  type Selection,
  addForbiddenZone,
  addLaunchArea,
  addMission,
  commit,
  duplicateItem,
  getItem,
  initHistory,
  moveItem,
  redo,
  removeItem,
  seasonIssues,
  seasonToJson,
  undo,
  validateSeason,
} from '@/lib/fll/editor-model'
import { SEASON_SCHEMA_VERSION, type Season, safeParseSeason } from '@/lib/fll/season'
import { deleteDraft, loadDraft, saveDraft } from '@/lib/fll/drafts'
import { type Locale, fill } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/ru'

interface EditorProps {
  lang: Locale
  seasons: Season[]
  defaultSeasonId: string
  t: Dictionary['fll']
}

const GRIDS = [0, 10, 25, 50, 100] as const
const TOOLS: { id: Tool; icon: typeof Target; key: string }[] = [
  { id: 'select', icon: MousePointer2, key: 'v' },
  { id: 'mission', icon: Target, key: 'm' },
  { id: 'launch', icon: Rocket, key: 'l' },
  { id: 'forbidden', icon: Ban, key: 'f' },
]

function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName))

export default function SeasonEditor({ lang, seasons, defaultSeasonId, t: fllT }: EditorProps) {
  const t = fllT.editor
  const [seasonId, chooseSeason] = useSeasonChoice(seasons, defaultSeasonId)
  const shipped = seasons.find((s) => s.id === seasonId) ?? seasons[0]

  // The document being edited and the draft key it belongs to.
  const [doc, setDoc] = useState<{ key: string; base: Season; history: History<Season> } | null>(null)
  const [draftInfo, setDraftInfo] = useState<{ restored: boolean; savedAt: number | null; error: boolean }>({ restored: false, savedAt: null, error: false })
  const [selection, setSelection] = useState<Selection | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [grid, setGrid] = useState<number>(50)
  const [snapOn, setSnapOn] = useState(true)
  const [view, setView] = useState<View>(() => fitView(shipped))
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const bg = useFieldBackground(seasonId)

  // Load the draft of the chosen season (or the shipped data).
  useEffect(() => {
    let alive = true
    setDoc(null)
    setSelection(null)
    setView(fitView(shipped))
    const open = (season: Season, restored: boolean, savedAt: number | null, error = false) => {
      if (!alive) return
      setDoc({ key: shipped.id, base: season, history: initHistory(season) })
      setDraftInfo({ restored, savedAt, error })
    }
    loadDraft(shipped.id)
      .then((draft) => (draft ? open(draft.season, true, null) : open(shipped, false, null)))
      .catch(() => open(shipped, false, null, true))
    return () => {
      alive = false
    }
  }, [shipped])

  const present = doc?.history.present ?? null

  // Autosave the draft shortly after each change.
  useEffect(() => {
    if (!doc || doc.history.present === doc.base) return
    const { key } = doc
    const season = doc.history.present
    const id = setTimeout(() => {
      const savedAt = Date.now()
      saveDraft(key, season, savedAt)
        .then(() => setDraftInfo((d) => ({ ...d, savedAt, error: false })))
        .catch(() => setDraftInfo((d) => ({ ...d, error: true })))
    }, 600)
    return () => clearTimeout(id)
  }, [doc])

  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(null), message.kind === 'ok' ? 3000 : 8000)
    return () => clearTimeout(id)
  }, [message])

  const change = useCallback((next: Season, key: string | null) => setDoc((d) => (d ? { ...d, history: commit(d.history, next, key) } : d)), [])
  const onCanvasChange = useCallback((next: Season, key: string) => change(next, key), [change])
  const step = (fn: (h: History<Season>) => History<Season>) => setDoc((d) => (d ? { ...d, history: fn(d.history) } : d))

  const place = (at: { x: number; y: number }) => {
    if (!present) return
    const [next, sel] = tool === 'mission' ? addMission(present, at) : tool === 'launch' ? addLaunchArea(present, at) : addForbiddenZone(present, at)
    change(next, null)
    setSelection(sel)
    setTool('select')
  }

  const remove = () => {
    if (!present || !selection) return
    change(removeItem(present, selection), null)
    setSelection(null)
  }

  const duplicate = () => {
    if (!present || !selection) return
    const r = duplicateItem(present, selection)
    if (!r) return
    change(r[0], null)
    setSelection(r[1])
  }

  // Keyboard shortcuts (not while typing in a field).
  const keyState = useRef({ present, selection, grid, snapOn })
  useEffect(() => {
    keyState.current = { present, selection, grid, snapOn }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || document.querySelector('[aria-modal="true"]')) return
      const { present: s, selection: sel, grid: gr, snapOn: sn } = keyState.current
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      if (mod && k === 'z') {
        e.preventDefault()
        step(e.shiftKey ? redo : undo)
      } else if (mod && k === 'y') {
        e.preventDefault()
        step(redo)
      } else if (!mod && (e.key === 'Delete' || e.key === 'Backspace') && sel && s) {
        e.preventDefault()
        change(removeItem(s, sel), null)
        setSelection(null)
      } else if (e.key === 'Escape') {
        setSelection(null)
        setTool('select')
      } else if (!mod && e.key.startsWith('Arrow') && sel && s) {
        e.preventDefault()
        const d = (sn && gr ? gr : 1) * (e.shiftKey ? 10 : 1)
        const [dx, dy] = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key] ?? [0, 0]
        change(moveItem(s, sel, dx, dy), `nudge:${sel.kind}:${sel.id}`)
      } else if (!mod && !e.altKey) {
        const tl = TOOLS.find((x) => x.key === k)
        if (tl) setTool(tl.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [change])

  async function onImport(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = ''
    if (!file) return
    try {
      const raw: unknown = JSON.parse(await file.text())
      const r = safeParseSeason(raw)
      if (!r.ok) {
        setMessage({ kind: 'error', text: fill(t.importError, { error: r.error.slice(0, 600) }) })
        return
      }
      change(r.season, null)
      setSelection(null)
      setView(fitView(r.season))
      setMessage({ kind: 'ok', text: r.migrated ? `${t.imported}. ${fill(t.migrated, { v: SEASON_SCHEMA_VERSION })}` : t.imported })
    } catch (error) {
      setMessage({ kind: 'error', text: fill(t.importError, { error: error instanceof Error ? error.message : 'JSON' }) })
    }
  }

  const validation = useMemo(() => (present ? validateSeason(present) : null), [present])
  const issues = useMemo(() => (present ? seasonIssues(present) : []), [present])

  function onExport() {
    if (!present) return
    if (validation && !validation.ok) {
      setMessage({ kind: 'error', text: t.exportBlocked })
      return
    }
    download(seasonToJson(present), `${present.id}.json`)
  }

  async function onReset() {
    if (!window.confirm(t.resetConfirm)) return
    try {
      await deleteDraft(shipped.id)
    } catch {
      /* the draft stays only in memory */
    }
    setDoc({ key: shipped.id, base: shipped, history: initHistory(shipped) })
    setDraftInfo({ restored: false, savedAt: null, error: false })
    setSelection(null)
  }

  const zoom = (factor: number) =>
    setView((v) => {
      const s = present ?? shipped
      const w = Math.min((s.field.widthMm + 2 * VIEW_MARGIN) * 2, Math.max(s.field.widthMm / 25, v.w * factor))
      const h = (s.field.heightMm + 2 * VIEW_MARGIN) / (s.field.widthMm + 2 * VIEW_MARGIN)
      const cx = v.x + v.w / 2
      const cy = v.y + (v.w * h) / 2
      return { x: cx - w / 2, y: cy - (w * h) / 2, w }
    })

  const itemName = (sel: Selection) => {
    if (!present) return sel.id
    if (sel.kind === 'mission') {
      const m = getItem(present, 'mission', sel.id)
      return m ? `${t.tool.mission} ${m.number} (${m.id})` : sel.id
    }
    return `${t.tool[sel.kind === 'launch' ? 'launch' : 'forbidden']} ${sel.id}`
  }

  const canUndo = (doc?.history.past.length ?? 0) > 0
  const canRedo = (doc?.history.future.length ?? 0) > 0
  const time = draftInfo.savedAt ? new Date(draftInfo.savedAt).toLocaleTimeString(lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className="container ed">
      <header className="fll-head">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
        <div className="toolbar">
          <a className="btn btn-sm" href={`/${lang}/fll${seasonId === defaultSeasonId ? '' : `?season=${seasonId}`}`}>
            {t.back}
          </a>
        </div>
      </header>

      <section className="card panel ed-top" aria-label={fllT.season}>
        <SeasonSelect seasons={seasons} value={seasonId} onChange={chooseSeason} lang={lang} t={fllT} />
        <p className="ed-draft" aria-live="polite">
          {draftInfo.error ? t.draftError : draftInfo.savedAt ? fill(t.draftSaved, { time }) : draftInfo.restored ? t.draftRestored : ''}
        </p>
        <div className="toolbar">
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
          <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            {t.import}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onExport} disabled={!present}>
            <Download size={16} aria-hidden="true" />
            {t.export}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void onReset()} disabled={!draftInfo.restored && !draftInfo.savedAt}>
            <RotateCcw size={16} aria-hidden="true" />
            {t.reset}
          </button>
        </div>
      </section>

      {message && (
        <p className={message.kind === 'ok' ? 'alert alert-ok' : 'alert'} role={message.kind === 'ok' ? 'status' : 'alert'}>
          {message.kind === 'ok' ? <Check size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
          <span>{message.text}</span>
        </p>
      )}

      <div className="ed-grid">
        <section className="card panel ed-stage" aria-label={fllT.fieldTitle}>
          <div className="ed-toolbar" role="toolbar" aria-label={t.tools}>
            <div className="tabs" role="group" aria-label={t.tools}>
              {TOOLS.map(({ id, icon: Icon, key }) => (
                <button key={id} type="button" aria-pressed={tool === id} onClick={() => setTool(id)} title={`${t.tool[id]} (${key.toUpperCase()})`}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{t.tool[id]}</span>
                </button>
              ))}
            </div>
            <div className="ed-toolbar-group">
              <button type="button" className="icon-btn" onClick={() => step(undo)} disabled={!canUndo} aria-label={t.undo} title={`${t.undo} (Ctrl+Z)`}>
                <Undo2 size={18} aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" onClick={() => step(redo)} disabled={!canRedo} aria-label={t.redo} title={`${t.redo} (Ctrl+Shift+Z)`}>
                <Redo2 size={18} aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" onClick={() => zoom(1 / 1.3)} aria-label={t.zoomIn} title={t.zoomIn}>
                <ZoomIn size={18} aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" onClick={() => zoom(1.3)} aria-label={t.zoomOut} title={t.zoomOut}>
                <ZoomOut size={18} aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" onClick={() => setView(fitView(present ?? shipped))} aria-label={t.zoomFit} title={t.zoomFit}>
                <Maximize size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="ed-toolbar-group">
              <label className="ed-inline">
                <span>{t.grid}</span>
                <select className="select" value={grid} onChange={(e) => setGrid(Number(e.target.value))}>
                  {GRIDS.map((g) => (
                    <option key={g} value={g}>
                      {g || t.gridOff}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ed-inline ed-check">
                <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} />
                <span>{t.snap}</span>
              </label>
            </div>
          </div>
          <p className="tab-note">{t.toolHint[tool]}</p>

          <div className="ed-canvas-wrap">
            {present ? (
              <EditorCanvas
                season={present}
                lang={lang}
                tool={tool}
                selection={selection}
                grid={grid}
                snapOn={snapOn}
                view={view}
                onView={setView}
                background={bg.url}
                backgroundOpacity={bg.opacity}
                onSelect={setSelection}
                onChange={onCanvasChange}
                onPlace={place}
                onCursor={setCursor}
                label={fllT.fieldTitle}
              />
            ) : (
              <div className="ed-canvas ed-loading" style={{ aspectRatio: `${shipped.field.widthMm} / ${shipped.field.heightMm}` }} />
            )}
            {cursor && (
              <span className="ed-cursor" aria-hidden="true">
                {fill(t.cursor, { x: cursor.x, y: cursor.y })}
              </span>
            )}
          </div>
          <BackgroundControls state={bg} field={(present ?? shipped).field} t={fllT.background} />
        </section>

        <aside className="card panel ed-side">
          {validation && (
            <div className="ed-status" data-ok={validation.ok && issues.length === 0}>
              {validation.ok ? (
                <p>
                  <Check size={16} aria-hidden="true" /> {t.valid}
                </p>
              ) : (
                <>
                  <p>
                    <AlertTriangle size={16} aria-hidden="true" /> {t.invalid}
                  </p>
                  <pre>{validation.error}</pre>
                </>
              )}
              {issues.length > 0 && (
                <ul>
                  {issues.map((i, n) => (
                    <li key={n}>
                      <button type="button" className="link-btn" onClick={() => setSelection(i.sel)}>
                        {fill(t.issues[i.kind], { name: itemName(i.sel) })}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {present && (
            <Inspector
              season={present}
              selection={selection}
              lang={lang}
              t={t}
              fllT={fllT}
              onChange={change}
              onSelect={setSelection}
              onDelete={remove}
              onDuplicate={duplicate}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
