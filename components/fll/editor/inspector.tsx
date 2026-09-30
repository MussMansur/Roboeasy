'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { Copy, Plus, Trash2, X } from 'lucide-react'

import { type ItemKind, type Selection, getItem, renameItem, toggleShapeKind, updateItem } from '@/lib/fll/editor-model'
import { actionZoneFrame } from '@/lib/fll/geometry'
import { EDITIONS, type Localized, MISSION_ACTIONS, PLATFORMS, SEASON_STATUSES, type Season, type Shape, localize } from '@/lib/fll/season'
import { fill } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/ru'

type FllT = Dictionary['fll']
type EdT = FllT['editor']

/** Number input that lets the user type freely and commits valid numbers only. */
function NumField({ label, value, onChange, min, max, placeholder }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; min?: number; max?: number; placeholder?: string }) {
  const [text, setText] = useState(value === undefined ? '' : String(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(value === undefined ? '' : String(value))
  }, [value, focused])
  return (
    <label className="ed-field">
      <span>{label}</span>
      <input
        className="input"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value)
          const raw = e.target.value.replace(',', '.').trim()
          if (raw === '' && placeholder !== undefined) return onChange(undefined)
          const n = Number(raw)
          if (raw === '' || !Number.isFinite(n)) return
          onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)))
        }}
      />
    </label>
  )
}

function TextField({ label, value, onChange, maxLength = 120 }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number }) {
  return (
    <label className="ed-field">
      <span>{label}</span>
      <input className="input" value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[] | { value: T; label: string }[]; onChange: (v: T) => void }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <label className="ed-field">
      <span>{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="ed-group">
      <legend>{title}</legend>
      <div className="ed-fields">{children}</div>
    </fieldset>
  )
}

interface InspectorProps {
  season: Season
  selection: Selection | null
  lang: 'ru' | 'kk' | 'en'
  t: EdT
  fllT: FllT
  onChange: (next: Season, key: string) => void
  onSelect: (sel: Selection | null) => void
  onDelete: () => void
  onDuplicate: () => void
}

export function Inspector({ season, selection, lang, t, fllT, onChange, onSelect, onDelete, onDuplicate }: InspectorProps) {
  const p = t.props
  const [idError, setIdError] = useState(false)
  useEffect(() => setIdError(false), [selection?.id])

  const names = (value: Localized, set: (v: Localized) => void, key: string) => (
    <Group title={p.name}>
      <TextField label={p.nameRu} value={value.ru} onChange={(ru) => set({ ...value, ru })} key={`${key}-ru`} />
      <TextField label={p.nameEn} value={value.en} onChange={(en) => set({ ...value, en })} key={`${key}-en`} />
      <TextField label={p.nameKk} value={value.kk ?? ''} onChange={(kk) => set({ ...value, kk: kk || undefined })} key={`${key}-kk`} />
    </Group>
  )

  const shapeFields = (shape: Shape, set: (s: Shape) => void, key: string) => (
    <>
      <SelectField
        label={p.outline}
        value={shape.kind}
        options={[
          { value: 'rect', label: p.rect },
          { value: 'polygon', label: p.polygon },
        ]}
        onChange={(kind) => kind !== shape.kind && set(toggleShapeKind(shape))}
      />
      {shape.kind === 'rect' ? (
        <>
          <NumField label={p.width} value={shape.width} min={10} max={3000} onChange={(v) => v !== undefined && set({ ...shape, width: v })} key={`${key}-w`} />
          <NumField label={p.height} value={shape.height} min={10} max={3000} onChange={(v) => v !== undefined && set({ ...shape, height: v })} key={`${key}-h`} />
        </>
      ) : (
        <p className="ed-hint">{p.vertexHint}</p>
      )}
    </>
  )

  // --- Season properties (nothing selected) ---------------------------------
  if (!selection) {
    const set = (patch: Partial<Season>, field: string) => onChange({ ...season, ...patch }, `season:${field}`)
    const lists: { kind: ItemKind; title: string; items: { id: string; label: string }[] }[] = [
      { kind: 'mission', title: t.missions, items: season.missions.map((m) => ({ id: m.id, label: `${m.number}. ${localize(m.name, lang) || m.id}` })) },
      { kind: 'launch', title: t.launchAreas, items: season.launchAreas.map((a) => ({ id: a.id, label: localize(a.name, lang) || a.id })) },
      { kind: 'forbidden', title: t.forbiddenZones, items: season.forbiddenZones.map((z) => ({ id: z.id, label: localize(z.name, lang) || z.id })) },
    ]
    return (
      <div className="ed-inspector">
        <h2 className="panel-title">{t.seasonTitle}</h2>
        <Group title={fllT.season}>
          <TextField label={p.id} value={season.id} maxLength={40} onChange={(id) => set({ id: id.toLowerCase().replace(/[^a-z0-9-]/g, '') }, 'id')} />
          <TextField label={p.years} value={season.years} maxLength={20} onChange={(years) => set({ years }, 'years')} />
          <SelectField label={p.status} value={season.status} options={SEASON_STATUSES.map((s) => ({ value: s, label: fllT.seasonStatus[s] }))} onChange={(status) => set({ status }, 'status')} />
          <SelectField label={p.edition} value={season.edition} options={EDITIONS.map((s) => ({ value: s, label: fllT.editions[s] }))} onChange={(edition) => set({ edition }, 'edition')} />
          <SelectField label={p.platform} value={season.platform} options={PLATFORMS.map((s) => ({ value: s, label: fllT.platforms[s] }))} onChange={(platform) => set({ platform }, 'platform')} />
        </Group>
        {names(season.name, (name) => set({ name }, 'name'), 'season')}
        <Group title={fllT.fieldTitle}>
          <NumField label={p.fieldWidth} value={season.field.widthMm} min={500} max={5000} onChange={(v) => v !== undefined && set({ field: { ...season.field, widthMm: v } }, 'fw')} />
          <NumField label={p.fieldHeight} value={season.field.heightMm} min={300} max={5000} onChange={(v) => v !== undefined && set({ field: { ...season.field, heightMm: v } }, 'fh')} />
          <TextField label={p.todo} value={season.field.todo ?? ''} maxLength={300} onChange={(todo) => set({ field: { ...season.field, todo: todo || undefined } }, 'ftodo')} />
        </Group>
        <TextField label={p.todo} value={season.todo ?? ''} maxLength={400} onChange={(todo) => set({ todo: todo || undefined }, 'todo')} />

        <h2 className="panel-title ed-objects-title">{t.objects}</h2>
        {lists.map((l) => (
          <div key={l.kind} className="ed-list">
            <h3>{l.title}</h3>
            {l.items.length === 0 ? (
              <p className="ed-hint">{t.none}</p>
            ) : (
              <ul>
                {l.items.map((it) => (
                  <li key={it.id}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelect({ kind: l.kind, id: it.id })}>
                      {it.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    )
  }

  // --- Selected object -------------------------------------------------------
  const key = `${selection.kind}:${selection.id}`
  const rename = (id: string) => {
    const next = renameItem(season, selection, id)
    setIdError(!next)
    if (next) {
      onChange(next, `${key}:id`)
      onSelect({ ...selection, id: id.trim() })
    }
  }

  const header = (
    <div className="ed-inspector-head">
      <h2 className="panel-title">{t.tool[selection.kind === 'launch' ? 'launch' : selection.kind]}</h2>
      <div className="toolbar">
        <button type="button" className="btn btn-sm" onClick={onDuplicate}>
          <Copy size={16} aria-hidden="true" />
          {t.duplicate}
        </button>
        <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
          <Trash2 size={16} aria-hidden="true" />
          {t.delete}
        </button>
        <button type="button" className="icon-btn" aria-label={t.deselect} title={t.deselect} onClick={() => onSelect(null)}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  )

  const idField = (value: string) => (
    <label className="ed-field">
      <span>{p.id}</span>
      <input className="input" defaultValue={value} key={value} maxLength={20} aria-invalid={idError} onBlur={(e) => e.target.value !== value && rename(e.target.value)} />
      {idError && <small className="ed-error">{t.idTaken}</small>}
    </label>
  )

  const pos = (x: number, y: number, rot: number, set: (patch: { x?: number; y?: number; rotationDeg?: number }) => void) => (
    <>
      <NumField label={p.x} value={x} onChange={(v) => v !== undefined && set({ x: v })} key={`${key}-x`} />
      <NumField label={p.y} value={y} onChange={(v) => v !== undefined && set({ y: v })} key={`${key}-y`} />
      <NumField label={p.rotation} value={rot} min={-180} max={180} onChange={(v) => v !== undefined && set({ rotationDeg: v })} key={`${key}-r`} />
    </>
  )

  if (selection.kind === 'mission') {
    const m = getItem(season, 'mission', selection.id)
    if (!m) return null
    const set = (patch: Partial<typeof m>, field: string) => onChange(updateItem(season, 'mission', m.id, (x) => ({ ...x, ...patch })), `${key}:${field}`)
    const zone = actionZoneFrame(m)
    return (
      <div className="ed-inspector">
        {header}
        <Group title={t.tool.mission}>
          {idField(m.id)}
          <NumField label={p.number} value={m.number} min={0} max={99} onChange={(v) => v !== undefined && set({ number: Math.round(v) }, 'number')} key={`${key}-n`} />
          <NumField label={p.points} value={m.points} min={0} max={500} onChange={(v) => v !== undefined && set({ points: Math.round(v) }, 'points')} key={`${key}-p`} />
          <SelectField label={p.action} value={m.action} options={MISSION_ACTIONS.map((a) => ({ value: a, label: fllT.actions[a] }))} onChange={(action) => set({ action }, 'action')} />
          <label className="ed-check">
            <input type="checkbox" checked={m.todo === true} onChange={(e) => set({ todo: e.target.checked || undefined }, 'todo')} />
            <span>{p.todoFlag}</span>
          </label>
        </Group>
        {names(m.name, (name) => set({ name }, 'name'), key)}
        <Group title={p.outline}>
          {pos(m.x, m.y, m.rotationDeg, (patch) => set(patch, 'pos'))}
          {shapeFields(m.outline, (outline) => set({ outline }, 'outline'), `${key}-o`)}
        </Group>
        <Group title={p.zone}>
          <NumField label={p.dx} value={m.actionZone.dx} onChange={(v) => v !== undefined && set({ actionZone: { ...m.actionZone, dx: v } }, 'zdx')} key={`${key}-zdx`} />
          <NumField label={p.dy} value={m.actionZone.dy} onChange={(v) => v !== undefined && set({ actionZone: { ...m.actionZone, dy: v } }, 'zdy')} key={`${key}-zdy`} />
          <NumField
            label={p.rotation}
            value={m.actionZone.rotationDeg}
            min={-180}
            max={180}
            onChange={(v) => v !== undefined && set({ actionZone: { ...m.actionZone, rotationDeg: v } }, 'zr')}
            key={`${key}-zr`}
          />
          {shapeFields(m.actionZone.shape, (shape) => set({ actionZone: { ...m.actionZone, shape } }, 'zshape'), `${key}-z`)}
          <p className="ed-hint">
            {p.x} {Math.round(zone.x)} · {p.y} {Math.round(zone.y)}
          </p>
        </Group>
        <Group title={p.plan}>
          <NumField
            label={p.heading}
            value={m.plan.headingDeg}
            min={-180}
            max={180}
            placeholder={p.headingAuto}
            onChange={(headingDeg) => set({ plan: { ...m.plan, headingDeg } }, 'heading')}
            key={`${key}-hd`}
          />
          <NumField label={p.actionMm} value={m.plan.actionMm} min={0} max={1000} onChange={(v) => v !== undefined && set({ plan: { ...m.plan, actionMm: v } }, 'amm')} key={`${key}-amm`} />
          <NumField
            label={p.attachmentDeg}
            value={m.plan.attachmentDeg}
            min={1}
            max={3600}
            onChange={(v) => v !== undefined && set({ plan: { ...m.plan, attachmentDeg: v } }, 'adeg')}
            key={`${key}-adeg`}
          />
          <div className="ed-via-list">
            <span>{p.via}</span>
            {m.plan.via.map((v, i) => (
              <div key={i} className="ed-via-row">
                <NumField label={`${i + 1}: ${p.x}`} value={v.x} onChange={(x) => x !== undefined && set({ plan: { ...m.plan, via: m.plan.via.map((q, j) => (j === i ? { ...q, x } : q)) } }, `via${i}x`)} />
                <NumField label={`${i + 1}: ${p.y}`} value={v.y} onChange={(y) => y !== undefined && set({ plan: { ...m.plan, via: m.plan.via.map((q, j) => (j === i ? { ...q, y } : q)) } }, `via${i}y`)} />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={fill(p.removeVia, { n: i + 1 })}
                  title={fill(p.removeVia, { n: i + 1 })}
                  onClick={() => set({ plan: { ...m.plan, via: m.plan.via.filter((_, j) => j !== i) } }, `via-del${i}`)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                const last = m.plan.via.at(-1) ?? zone
                set({ plan: { ...m.plan, via: [...m.plan.via, { x: Math.round(last.x - 150), y: Math.round(last.y) }] } }, `via-add${m.plan.via.length}`)
              }}
            >
              <Plus size={16} aria-hidden="true" />
              {p.addVia}
            </button>
          </div>
        </Group>
        <Group title={p.notes}>
          <TextField label={p.nameRu} value={m.notes?.ru ?? ''} maxLength={400} onChange={(ru) => set({ notes: { ru, en: m.notes?.en ?? '', kk: m.notes?.kk } }, 'nru')} />
          <TextField label={p.nameEn} value={m.notes?.en ?? ''} maxLength={400} onChange={(en) => set({ notes: { ru: m.notes?.ru ?? '', en, kk: m.notes?.kk } }, 'nen')} />
          <TextField label={p.nameKk} value={m.notes?.kk ?? ''} maxLength={400} onChange={(kk) => set({ notes: { ru: m.notes?.ru ?? '', en: m.notes?.en ?? '', kk: kk || undefined } }, 'nkk')} />
        </Group>
      </div>
    )
  }

  if (selection.kind === 'launch') {
    const a = getItem(season, 'launch', selection.id)
    if (!a) return null
    const set = (patch: Partial<typeof a>, field: string) => onChange(updateItem(season, 'launch', a.id, (x) => ({ ...x, ...patch })), `${key}:${field}`)
    return (
      <div className="ed-inspector">
        {header}
        <Group title={t.tool.launch}>
          {idField(a.id)}
          {pos(a.x, a.y, a.rotationDeg, (patch) => set(patch, 'pos'))}
          {shapeFields(a.shape, (shape) => set({ shape }, 'shape'), `${key}-s`)}
        </Group>
        {names(a.name, (name) => set({ name }, 'name'), key)}
        <Group title={p.start}>
          <NumField label={p.x} value={a.start.x} onChange={(x) => x !== undefined && set({ start: { ...a.start, x } }, 'sx')} key={`${key}-sx`} />
          <NumField label={p.y} value={a.start.y} onChange={(y) => y !== undefined && set({ start: { ...a.start, y } }, 'sy')} key={`${key}-sy`} />
          <NumField label={p.heading} value={a.start.headingDeg} min={-180} max={180} onChange={(h) => h !== undefined && set({ start: { ...a.start, headingDeg: h } }, 'sh')} key={`${key}-shd`} />
        </Group>
      </div>
    )
  }

  const z = getItem(season, 'forbidden', selection.id)
  if (!z) return null
  const set = (patch: Partial<typeof z>, field: string) => onChange(updateItem(season, 'forbidden', z.id, (x) => ({ ...x, ...patch })), `${key}:${field}`)
  return (
    <div className="ed-inspector">
      {header}
      <Group title={t.tool.forbidden}>
        {idField(z.id)}
        {pos(z.x, z.y, z.rotationDeg, (patch) => set(patch, 'pos'))}
        {shapeFields(z.shape, (shape) => set({ shape }, 'shape'), `${key}-s`)}
      </Group>
      {names(z.name ?? { ru: '', en: '' }, (name) => set({ name: name.ru || name.en || name.kk ? name : undefined }, 'name'), key)}
    </div>
  )
}
