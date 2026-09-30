'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Compass, FileDown, Info, Lightbulb, Loader2, PencilRuler, Plus, Ruler, Trash2 } from 'lucide-react'

import { BlockStack } from '@/components/block-stack'
import { BackgroundControls, useFieldBackground } from '@/components/fll/background'
import { Field, RUN_COLORS } from '@/components/fll/field'
import { SeasonSelect, useSeasonChoice } from '@/components/fll/season-select'
import { type CodeFormat, compilerFor } from '@/lib/compilers'
import { ATTACHMENT_KINDS, type AttachmentKind, DEFAULT_ROBOT, PORTS, type Port, type Program, type RobotProfile } from '@/lib/dsl/types'
import { CALIBRATION, applyCalibration, distanceTestProgram, turnTestProgram } from '@/lib/fll/calibration'
import type { PlanResponse } from '@/lib/fll/plan'
import { buildRun } from '@/lib/fll/run'
import { type Season, localize } from '@/lib/fll/season'
import { type Locale, fill } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/ru'
import { loadRobot, saveRobot } from '@/lib/studio-state'

type OkPlan = Extract<PlanResponse, { ok: true }>

interface PlannerProps {
  lang: Locale
  seasons: Season[]
  defaultSeasonId: string
  t: Dictionary['fll']
  robotT: Dictionary['studio']['robot']
  labels: Dictionary['blocks']
  formatT: { blocks: string; python: string }
}

function fileName(name: string) {
  return name.replace(/[^\p{L}\p{N}_\- ]+/gu, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'RoboEasy'
}

function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function FllPlanner({ lang, seasons, defaultSeasonId, t, robotT, labels, formatT }: PlannerProps) {
  const [seasonId, chooseSeason] = useSeasonChoice(seasons, defaultSeasonId)
  const season = seasons.find((s) => s.id === seasonId) ?? seasons[0]
  const compiler = compilerFor(season.platform)
  const bg = useFieldBackground(season.id)
  const [robot, setRobot] = useState<RobotProfile>(DEFAULT_ROBOT)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [format, setFormat] = useState<CodeFormat>('blocks')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [response, setResponse] = useState<OkPlan | null>(null)
  const [error, setError] = useState('')
  const [measured, setMeasured] = useState({ distance: '', turn: '' })
  const [openRuns, setOpenRuns] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState('')

  useEffect(() => {
    const saved = loadRobot()
    if (saved) setRobot(saved)
  }, [])

  // A different season: start over.
  useEffect(() => {
    setSelected(new Set())
    setResponse(null)
    setOpenRuns(new Set())
    setError('')
    setStatus('idle')
  }, [season.id])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const update = (next: RobotProfile) => {
    setRobot(next)
    saveRobot(next)
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectedPoints = season.missions.filter((m) => selected.has(m.id)).reduce((sum, m) => sum + m.points, 0)

  // Geometry is recomputed from the coordinates whenever the plan or the robot changes.
  const runs = useMemo(() => (response ? response.plan.runs.map((run) => buildRun(season, run, robot, lang)) : []), [response, season, robot, lang])

  async function plan() {
    if (!selected.size) {
      setError(t.noSelection)
      setStatus('error')
      return
    }
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/fll/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: season.id, missionIds: [...selected], robot, lang }),
      })
      const data = (await res.json()) as PlanResponse
      if (!data.ok) {
        setError(fill(t.errors[data.error], { s: data.retryAfter ?? 30 }))
        setStatus('error')
        return
      }
      setResponse(data)
      setOpenRuns(new Set())
      setStatus('done')
    } catch {
      setError(t.errors.network)
      setStatus('error')
    }
  }

  async function download(program: Program) {
    if (!compiler) {
      setError(t.unsupportedPlatform)
      return
    }
    try {
      const blob = await compiler.pack(program.title, program, robot, compiler.formats.includes(format) ? format : compiler.formats[0])
      saveFile(blob, `${fileName(program.title)}${compiler.fileExtension}`)
    } catch {
      setError(t.errors.file)
    }
  }

  const applyMeasured = () => {
    const num = (s: string) => Number.parseFloat(s.replace(',', '.'))
    const next = applyCalibration(robot, { distanceCm: num(measured.distance) || undefined, turnDeg: num(measured.turn) || undefined })
    update(next)
    setMeasured({ distance: '', turn: '' })
    setToast(t.applied)
  }

  const portSelect = (value: Port, onChange: (p: Port) => void, label: string) => (
    <label>
      {label}
      <select className="select" value={value} onChange={(e) => onChange(e.target.value as Port)}>
        {PORTS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </label>
  )

  const setAttachment = (i: number, patch: Partial<RobotProfile['attachments'][number]>) =>
    update({ ...robot, attachments: robot.attachments.map((a, j) => (j === i ? { ...a, ...patch } : a)) })

  const addAttachment = () => {
    const used = new Set<Port>([robot.leftMotor, robot.rightMotor, robot.distanceSensor, robot.colorSensor, robot.forceSensor, ...robot.attachments.map((a) => a.port)])
    const port = PORTS.find((p) => !used.has(p)) ?? 'C'
    update({ ...robot, attachments: [...robot.attachments, { port, kind: 'arm', name: '' }] })
  }

  return (
    <div className="container fll">
      <header className="fll-head">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
        <div className="fll-season-row">
          <SeasonSelect seasons={seasons} value={season.id} onChange={chooseSeason} lang={lang} t={t} />
          <span className="format-badge">{t.editions[season.edition]}</span>
          <span className="format-badge">{t.platforms[season.platform]}</span>
          <a className="btn btn-sm" href={`/${lang}/fll/editor${season.id === defaultSeasonId ? '' : `?season=${season.id}`}`}>
            <PencilRuler size={16} aria-hidden="true" />
            {t.openEditor}
          </a>
        </div>
        {season.todo && (
          <p className="alert alert-warn" role="note">
            <Info size={18} aria-hidden="true" />
            <span>{t.seasonTodo}</span>
          </p>
        )}
        {!compiler && (
          <p className="alert alert-warn" role="note">
            <Info size={18} aria-hidden="true" />
            <span>{t.unsupportedPlatform}</span>
          </p>
        )}
      </header>

      <div className="fll-grid">
        <section className="card panel" aria-labelledby="fll-field-title">
          <h2 id="fll-field-title" className="panel-title">
            <Compass size={18} aria-hidden="true" />
            {t.fieldTitle}
          </h2>
          <p className="tab-note">{t.fieldHint}</p>
          <Field
            season={season}
            lang={lang}
            selected={selected}
            onToggle={toggle}
            routes={runs.map((r) => r.trace)}
            background={bg.url}
            backgroundOpacity={bg.opacity}
            label={t.fieldTitle}
          />
          <BackgroundControls state={bg} field={season.field} t={t.background} />

          <h3 className="fll-subtitle">{t.missionsTitle}</h3>
          {season.missions.length === 0 || season.launchAreas.length === 0 ? (
            <p className="alert alert-warn" role="note">
              <Info size={18} aria-hidden="true" />
              <span>{season.missions.length === 0 ? t.noMissions : t.errors.season_incomplete}</span>
            </p>
          ) : (
            <p className="fll-selected">{fill(t.selected, { n: selected.size, p: selectedPoints })}</p>
          )}
          <ul className="fll-missions">
            {season.missions.map((m) => (
              <li key={m.id}>
                <label>
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                  <span className="fll-id">{m.number}</span>
                  <span className="fll-mname">{localize(m.name, lang) || m.id}</span>
                  <span className="fll-meta">
                    {t.actions[m.action]} · {fill(t.points, { p: m.points })}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <div className="fll-side">
          <section className="card panel" aria-labelledby="fll-robot-title">
            <h2 id="fll-robot-title" className="panel-title">
              {t.robotTitle}
            </h2>
            <p className="tab-note">{t.robotHint}</p>
            <div className="robot-grid fll-robot">
              {portSelect(robot.leftMotor, (p) => update({ ...robot, leftMotor: p }), robotT.left)}
              {portSelect(robot.rightMotor, (p) => update({ ...robot, rightMotor: p }), robotT.right)}
              <label>
                {robotT.wheel}
                <input
                  className="input"
                  type="number"
                  min={20}
                  max={200}
                  value={robot.wheelDiameterMm}
                  onChange={(e) => update({ ...robot, wheelDiameterMm: Number(e.target.value) || DEFAULT_ROBOT.wheelDiameterMm })}
                />
              </label>
              <label>
                {robotT.track}
                <input
                  className="input"
                  type="number"
                  min={40}
                  max={400}
                  value={robot.trackWidthMm}
                  onChange={(e) => update({ ...robot, trackWidthMm: Number(e.target.value) || DEFAULT_ROBOT.trackWidthMm })}
                />
              </label>
            </div>

            <h3 className="fll-subtitle">{t.attachments}</h3>
            {robot.attachments.length === 0 && <p className="tab-note">{t.noAttachments}</p>}
            <ul className="fll-attachments">
              {robot.attachments.map((a, i) => (
                <li key={i}>
                  <label>
                    <span className="sr-only">{t.attachmentName}</span>
                    <input
                      className="input"
                      value={a.name}
                      maxLength={30}
                      placeholder={t.attachmentName}
                      onChange={(e) => setAttachment(i, { name: e.target.value })}
                    />
                  </label>
                  <label>
                    <span className="sr-only">{t.attachmentKind}</span>
                    <select className="select" value={a.kind} onChange={(e) => setAttachment(i, { kind: e.target.value as AttachmentKind })}>
                      {ATTACHMENT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {t.kinds[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">{t.attachmentPort}</span>
                    <select className="select" value={a.port} onChange={(e) => setAttachment(i, { port: e.target.value as Port })}>
                      {PORTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t.attachmentRemove}
                    title={t.attachmentRemove}
                    onClick={() => update({ ...robot, attachments: robot.attachments.filter((_, j) => j !== i) })}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            {robot.attachments.length < 6 && (
              <button type="button" className="btn btn-sm" onClick={addAttachment}>
                <Plus size={16} aria-hidden="true" />
                {t.attachmentAdd}
              </button>
            )}
          </section>

          <section className="card panel" aria-labelledby="fll-calib-title">
            <h2 id="fll-calib-title" className="panel-title">
              <Ruler size={18} aria-hidden="true" />
              {t.calibrationTitle}
            </h2>
            <p className="tab-note">{t.calibrationLead}</p>
            <ol className="fll-calib">
              <li>
                <p>{fill(t.calibDistance, { d: CALIBRATION.distanceCm })}</p>
                <div className="fll-calib-row">
                  <button type="button" className="btn btn-sm" disabled={!compiler} onClick={() => void download(distanceTestProgram(`Test ${CALIBRATION.distanceCm} cm`))}>
                    <FileDown size={16} aria-hidden="true" />
                    {t.downloadTest}
                  </button>
                  <label>
                    {t.measuredDistance}
                    <input
                      className="input"
                      inputMode="decimal"
                      value={measured.distance}
                      placeholder={String(CALIBRATION.distanceCm)}
                      onChange={(e) => setMeasured((m) => ({ ...m, distance: e.target.value }))}
                    />
                  </label>
                </div>
              </li>
              <li>
                <p>{fill(t.calibTurn, { t: CALIBRATION.turnDeg })}</p>
                <div className="fll-calib-row">
                  <button type="button" className="btn btn-sm" disabled={!compiler} onClick={() => void download(turnTestProgram(`Test ${CALIBRATION.turnDeg}`))}>
                    <FileDown size={16} aria-hidden="true" />
                    {t.downloadTest}
                  </button>
                  <label>
                    {t.measuredTurn}
                    <input
                      className="input"
                      inputMode="decimal"
                      value={measured.turn}
                      placeholder={String(CALIBRATION.turnDeg)}
                      onChange={(e) => setMeasured((m) => ({ ...m, turn: e.target.value }))}
                    />
                  </label>
                </div>
              </li>
            </ol>
            <div className="fll-calib-foot">
              <button type="button" className="btn btn-primary btn-sm" onClick={applyMeasured} disabled={!measured.distance && !measured.turn}>
                <Check size={16} aria-hidden="true" />
                {t.apply}
              </button>
              <span>{fill(t.factors, { d: robot.distanceFactor, t: robot.turnFactor })}</span>
              {(robot.distanceFactor !== 1 || robot.turnFactor !== 1) && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ ...robot, distanceFactor: 1, turnFactor: 1 })}>
                  {t.resetFactors}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="card panel fll-plan" aria-labelledby="fll-plan-title" aria-busy={status === 'loading'}>
        <div className="studio-head">
          <h2 id="fll-plan-title" className="panel-title">
            {t.planTitle}
          </h2>
          {compiler && compiler.formats.length > 1 && (
            <div className="tabs" role="group" aria-label={t.format} style={{ margin: 0 }}>
              {compiler.formats.map((f) => (
                <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)}>
                  {formatT[f]}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn btn-primary btn-lg" onClick={() => void plan()} disabled={status === 'loading' || season.missions.length === 0 || season.launchAreas.length === 0}>
          {status === 'loading' ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Lightbulb size={18} aria-hidden="true" />}
          {status === 'loading' ? t.planning : t.planButton}
        </button>
        <p className="tab-note" style={{ marginTop: 12 }}>
          {fill(t.selected, { n: selected.size, p: selectedPoints })}
        </p>

        {error && (
          <p className="alert" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {response && (
          <div className="fll-result" aria-live="polite">
            <p className="format-badge">{t.source[response.source]}</p>
            {response.notice && (
              <p className="alert alert-warn" role="note">
                <Info size={18} aria-hidden="true" />
                <span>{t.notices[response.notice]}</span>
              </p>
            )}
            {response.plan.summary && <p className="result-desc">{response.plan.summary}</p>}

            <ol className="fll-runs">
              {response.plan.runs.map((run, i) => {
                const built = runs[i]
                const area = season.launchAreas.find((a) => a.id === run.launchAreaId)
                const open = openRuns.has(i)
                return (
                  <li key={i} className="fll-run" style={{ ['--run' as string]: RUN_COLORS[i % RUN_COLORS.length] }}>
                    <div className="fll-run-head">
                      <h3>{run.name}</h3>
                      <span className="format-badge">{fill(t.points, { p: built?.points ?? 0 })}</span>
                    </div>
                    <p className="fll-meta">
                      {fill(t.launch, { area: area ? localize(area.name, lang) : run.launchAreaId })} ·{' '}
                      {run.missions.map((m) => m.id + (m.attachment ? ` (${m.attachment})` : '')).join(' → ')}
                    </p>
                    <p>
                      <strong>{t.why}: </strong>
                      {run.explanation}
                    </p>
                    {built?.warnings.map((w, j) => (
                      <p key={j} className="alert alert-warn" role="note">
                        <AlertTriangle size={16} aria-hidden="true" />
                        <span>{fill(t.warnings[w.kind], { id: w.kind === 'unknown_launch_area' ? w.launchAreaId : w.kind === 'forbidden_zone' ? w.zoneId : w.missionId })}</span>
                      </p>
                    ))}
                    <div className="toolbar">
                      {compiler && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => built && void download(built.program)}>
                          <FileDown size={16} aria-hidden="true" />
                          {fill(t.download, { ext: compiler.fileExtension })}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-expanded={open}
                        onClick={() =>
                          setOpenRuns((prev) => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            return next
                          })
                        }
                      >
                        {open ? t.hideCommands : t.showCommands}
                      </button>
                    </div>
                    {open && built && (
                      <div className="canvas fll-commands">
                        <BlockStack program={built.program} labels={labels} robot={robot} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>

            {response.plan.tips.length > 0 && (
              <div className="fll-tips">
                <h3 className="fll-subtitle">{t.tipsTitle}</h3>
                <ul className="tips">
                  {response.plan.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="alert alert-warn" role="note">
              <Info size={18} aria-hidden="true" />
              <span>
                {t.coachNote} {t.routeNote}
              </span>
            </p>
          </div>
        )}
      </section>

      {toast && (
        <div className="toast" role="status">
          <Check size={18} aria-hidden="true" />
          {toast}
        </div>
      )}
    </div>
  )
}
