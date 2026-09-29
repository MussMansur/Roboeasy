'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Blocks,
  Check,
  ChevronDown,
  CircleDot,
  Code2,
  Copy,
  FileCode2,
  FileDown,
  History,
  Link2,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'

import { BlockStack } from '@/components/block-stack'
import { CodeView } from '@/components/code-view'
import { type Format, type GenerateErrorCode, type GenerateResponse, PROMPT_MAX } from '@/lib/api-types'
import { type Locale, fill } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/ru'
import { DEFAULT_ROBOT, PORTS, type Port, type RobotConfig, countSteps, sanitizeRobot } from '@/lib/spike/program'
import {
  type HistoryItem,
  type StudioResult,
  addToHistory,
  decodeShare,
  encodeShare,
  loadFormat,
  loadHistory,
  loadRobot,
  saveFormat,
  saveHistory,
  saveRobot,
} from '@/lib/studio-state'

type Status = 'idle' | 'loading' | 'error' | 'done'
type ErrorState = { code: GenerateErrorCode | 'network' | 'file'; retryAfter?: number; where: 'composer' | 'result' }

interface StudioProps {
  lang: Locale
  t: Dictionary['studio']
  labels: Dictionary['blocks']
}

function fileSafe(name: string) {
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

export function Studio({ lang, t, labels }: StudioProps) {
  const [format, setFormat] = useState<Format>('blocks')
  const [prompt, setPrompt] = useState('')
  const [robot, setRobot] = useState<RobotConfig>(DEFAULT_ROBOT)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<ErrorState | null>(null)
  const [result, setResult] = useState<StudioResult | null>(null)
  const [lastPrompt, setLastPrompt] = useState('')
  const [view, setView] = useState<'blocks' | 'python'>('blocks')
  const [projectName, setProjectName] = useState('')
  const [refineText, setRefineText] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loadingStep, setLoadingStep] = useState(0)
  const [pendingFormat, setPendingFormat] = useState<Format>('blocks')
  const [announce, setAnnounce] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [aiReady, setAiReady] = useState<boolean | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const resultRef = useRef<HTMLElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showToast = useCallback((message: string) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const openResult = useCallback((r: StudioResult) => {
    setResult(r)
    setProjectName(r.title)
    setView('blocks')
    setStatus('done')
    setError(null)
  }, [])

  // Restore saved settings, apply ?prompt=&format= and #r= share links.
  useEffect(() => {
    const savedRobot = loadRobot()
    if (savedRobot) setRobot(savedRobot)
    const savedFormat = loadFormat()
    if (savedFormat) setFormat(savedFormat)
    setHistory(loadHistory())

    const params = new URLSearchParams(window.location.search)
    const qp = params.get('prompt')
    if (qp) setPrompt(qp.slice(0, PROMPT_MAX))
    const qf = params.get('format')
    if (qf === 'blocks' || qf === 'python') setFormat(qf)

    const token = new URLSearchParams(window.location.hash.slice(1)).get('r')
    if (token) {
      void decodeShare(token).then((shared) => {
        if (!shared) return
        openResult(shared)
        if (shared.format === 'blocks') setRobot(shared.robot)
        setFormat(shared.format)
        showToast(t.sharedResult)
      })
    }

    fetch('/api/generate')
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setAiReady(Boolean(d.configured)))
      .catch(() => setAiReady(null))
  }, [openResult, showToast, t.sharedResult])

  // Loading messages advance while the request is in flight.
  useEffect(() => {
    if (status !== 'loading') return
    setLoadingStep(0)
    const a = setTimeout(() => setLoadingStep(1), 1400)
    const b = setTimeout(() => setLoadingStep(2), 4200)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [status])

  const chooseFormat = (f: Format) => {
    setFormat(f)
    saveFormat(f)
  }

  const updateRobot = (patch: Partial<RobotConfig>) => {
    setRobot((prev) => {
      const next = sanitizeRobot({ ...prev, ...patch })
      saveRobot(next)
      return next
    })
  }

  async function generate(mode: 'new' | 'refine') {
    const text = (mode === 'refine' ? refineText : prompt).trim()
    const where = mode === 'refine' ? 'result' : 'composer'
    if (text.length < 2 || text.length > PROMPT_MAX) {
      setError({ code: text.length < 2 ? 'bad_request' : 'prompt_too_long', where })
      if (mode === 'new') textareaRef.current?.focus()
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const requestFormat: Format = mode === 'refine' && result ? result.format : format
    const previous =
      mode === 'refine' && result ? (result.format === 'blocks' ? { program: result.program } : { code: result.code }) : undefined

    setStatus('loading')
    setPendingFormat(requestFormat)
    setError(null)
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, format: requestFormat, lang, robot, previous }),
        signal: controller.signal,
      })
      const data = (await res.json().catch(() => ({ ok: false, error: 'ai_failed' }))) as GenerateResponse
      if (!data.ok) {
        setError({ code: data.error, retryAfter: data.retryAfter, where })
        setStatus(result ? 'done' : 'error')
        return
      }
      const next: StudioResult =
        data.format === 'blocks'
          ? { format: 'blocks', title: data.title, description: data.description, program: data.program, python: data.python, robot, warnings: data.warnings }
          : { format: 'python', title: data.title, description: data.description, code: data.code, warnings: data.warnings }
      openResult(next)
      setAnnounce(next.title)
      const fullPrompt = mode === 'refine' ? `${lastPrompt} → ${text}` : text
      setLastPrompt(fullPrompt)
      if (mode === 'refine') setRefineText('')
      setHistory((h) => {
        const updated = addToHistory(h, fullPrompt, next)
        saveHistory(updated)
        return updated
      })
      if (window.location.hash) clearShareHash()
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError({ code: 'network', where })
      setStatus(result ? 'done' : 'error')
    }
  }

  function clearShareHash() {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  async function download() {
    if (!result) return
    try {
      const name = projectName.trim() || result.title
      // JSZip is only needed here, so it is loaded on the first download.
      const { createLlsp3 } = await import('@/lib/spike/llsp3')
      const blob = await createLlsp3(
        name,
        result.format === 'blocks' ? { format: 'blocks', program: result.program, robot: result.robot } : { format: 'python', code: result.code },
      )
      saveFile(blob, `${fileSafe(name)}.llsp3`)
    } catch {
      setError({ code: 'file', where: 'result' })
    }
  }

  const code = result ? (result.format === 'blocks' ? result.python : result.code) : ''

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      showToast(t.result.copied)
    } catch {
      setError({ code: 'file', where: 'result' })
    }
  }

  function downloadPy() {
    const name = projectName.trim() || result?.title || 'RoboEasy'
    saveFile(new Blob([code], { type: 'text/x-python;charset=utf-8' }), `${fileSafe(name)}.py`)
  }

  async function share() {
    if (!result) return
    try {
      const token = await encodeShare(result)
      const url = `${window.location.origin}/${lang}/workspace#r=${token}`
      await navigator.clipboard.writeText(url)
      showToast(t.result.shared)
    } catch {
      setError({ code: 'file', where: 'result' })
    }
  }

  function reset() {
    abortRef.current?.abort()
    setResult(null)
    setStatus('idle')
    setError(null)
    setPrompt('')
    setRefineText('')
    clearShareHash()
    textareaRef.current?.focus()
  }

  const errorText = error
    ? fill(t.errors[error.code], { max: PROMPT_MAX, s: error.retryAfter ?? 30 })
    : ''
  const loadingSteps = pendingFormat === 'python' ? t.loadingPython : t.loadingBlocks
  const promptOver = prompt.length > PROMPT_MAX
  const examples = format === 'python' ? t.examplesPython : t.examplesBlocks
  const robotSummary = fill(t.robot.summary, {
    L: robot.leftMotor,
    R: robot.rightMotor,
    D: robot.distanceSensor,
    C: robot.colorSensor,
    F: robot.forceSensor,
  })

  const portSelect = (key: 'leftMotor' | 'rightMotor' | 'distanceSensor' | 'colorSensor' | 'forceSensor', label: string) => (
    <label>
      {label}
      <select className="select" value={robot[key]} onChange={(e) => updateRobot({ [key]: e.target.value as Port })}>
        {PORTS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="container studio">
      {/* ── Composer ── */}
      <div className="studio-col">
        <section className="card panel" aria-labelledby="composer-title">
          <div className="studio-head">
            <h1 id="composer-title" className="panel-title">
              {t.composerTitle}
            </h1>
            {aiReady !== null && (
              <span className="ai-pill" data-state={aiReady ? 'on' : 'off'}>
                <i aria-hidden="true" />
                {aiReady ? t.aiOnline : t.aiOffline}
              </span>
            )}
          </div>

          <div className="segmented" role="group" aria-label={t.formatLabel}>
            <button type="button" aria-pressed={format === 'blocks'} onClick={() => chooseFormat('blocks')}>
              <strong>
                <Blocks size={17} aria-hidden="true" />
                {t.blocks}
              </strong>
              <span>{t.blocksHint}</span>
            </button>
            <button type="button" aria-pressed={format === 'python'} onClick={() => chooseFormat('python')}>
              <strong>
                <Code2 size={17} aria-hidden="true" />
                {t.python}
              </strong>
              <span>{t.pythonHint}</span>
            </button>
          </div>

          <label className="field-label" htmlFor="prompt">
            {t.promptLabel}
          </label>
          <div className="textarea-wrap">
            <textarea
              id="prompt"
              ref={textareaRef}
              className="textarea"
              value={prompt}
              placeholder={t.placeholder}
              maxLength={PROMPT_MAX + 200}
              aria-describedby="prompt-meta"
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  void generate('new')
                }
              }}
            />
            <div className="textarea-meta" id="prompt-meta">
              <span>{t.shortcut}</span>
              <span data-over={promptOver}>
                {prompt.length}/{PROMPT_MAX}
              </span>
            </div>
          </div>

          <div className="idea-list" aria-label={t.ideas}>
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                className="chip"
                onClick={() => {
                  setPrompt(ex)
                  textareaRef.current?.focus()
                }}
              >
                {ex}
              </button>
            ))}
          </div>

          <details className="robot-settings">
            <summary>
              <CircleDot size={18} aria-hidden="true" />
              <span className="summary-text">
                <strong>{t.robot.title}</strong>
                <small>{robotSummary}</small>
              </span>
              <ChevronDown size={18} className="chev" aria-hidden="true" />
            </summary>
            <div className="robot-grid">
              {portSelect('leftMotor', t.robot.left)}
              {portSelect('rightMotor', t.robot.right)}
              {portSelect('distanceSensor', t.robot.distance)}
              {portSelect('colorSensor', t.robot.color)}
              {portSelect('forceSensor', t.robot.force)}
              <label>
                {t.robot.wheel}
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min={2}
                  max={20}
                  step={0.1}
                  value={robot.wheelDiameter}
                  onChange={(e) => updateRobot({ wheelDiameter: Number(e.target.value) })}
                />
              </label>
              <label>
                {t.robot.track}
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min={4}
                  max={40}
                  step={0.1}
                  value={robot.trackWidth}
                  onChange={(e) => updateRobot({ trackWidth: Number(e.target.value) })}
                />
              </label>
              <div className="robot-foot">
                <span>{t.robot.hint}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateRobot(DEFAULT_ROBOT)}>
                  <RotateCcw size={15} aria-hidden="true" />
                  {t.robot.reset}
                </button>
              </div>
            </div>
          </details>

          <div className="generate-row">
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => void generate('new')} disabled={status === 'loading'}>
              {status === 'loading' ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
              {status === 'loading' ? t.generating : t.generate}
            </button>
          </div>

          {error?.where === 'composer' && status !== 'loading' && (
            <p className="alert" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{errorText}</span>
            </p>
          )}
        </section>

        <section className="card panel" aria-labelledby="history-title">
          <div className="studio-head">
            <h2 id="history-title" className="panel-title" style={{ fontSize: '1.0625rem' }}>
              <History size={18} aria-hidden="true" />
              {t.history.title}
            </h2>
            {history.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setHistory([])
                  saveHistory([])
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
                {t.history.clear}
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-3)' }}>{t.history.empty}</p>
          ) : (
            <ul className="history-list">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="history-item"
                    onClick={() => {
                      openResult(item.result)
                      setLastPrompt(item.prompt)
                      if (item.result.format === 'blocks') setRobot(item.result.robot)
                      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                  >
                    <span className="history-icon" aria-hidden="true">
                      {item.result.format === 'blocks' ? <Blocks size={16} /> : <Code2 size={16} />}
                    </span>
                    <span className="meta">
                      <strong>{item.result.title}</strong>
                      <small>
                        {new Date(item.createdAt).toLocaleString(lang === 'en' ? 'en-GB' : 'ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Result ── */}
      <p className="sr-only" role="status" aria-live="polite">
        {status === 'loading' ? loadingSteps[loadingStep] : announce}
      </p>
      <section ref={resultRef} className="card panel result" aria-busy={status === 'loading'} aria-label={t.heading}>
        {status === 'loading' ? (
          <div className="result-empty result-loading">
            <div>
              <div className="ghost-stack" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <ol className="loading-steps">
                {loadingSteps.map((s, i) => (
                  <li key={s} data-state={i < loadingStep ? 'done' : i === loadingStep ? 'active' : 'todo'}>
                    {i < loadingStep ? <Check size={16} aria-hidden="true" /> : i === loadingStep ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <CircleDot size={16} aria-hidden="true" />}
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : result ? (
          <ResultView
            lang={lang}
            result={result}
            t={t}
            labels={labels}
            view={view}
            setView={setView}
            projectName={projectName}
            setProjectName={setProjectName}
            onDownload={download}
            onCopy={copyCode}
            onDownloadPy={downloadPy}
            onShare={share}
            onReset={reset}
            refineText={refineText}
            setRefineText={setRefineText}
            onRefine={() => void generate('refine')}
            error={error?.where === 'result' ? errorText : ''}
          />
        ) : (
          <div className="result-empty">
            <div>
              <div className="ghost-stack" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <h2>{t.empty.title}</h2>
              <p>{t.empty.text}</p>
              <ul className="tips">
                {t.empty.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
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

function pluralForm(lang: Locale, n: number, forms: Dictionary['studio']['result']['blocksCount']) {
  const rule = new Intl.PluralRules(lang).select(n)
  return rule in forms ? forms[rule as keyof typeof forms] : forms.other
}

interface ResultViewProps {
  lang: Locale
  result: StudioResult
  t: Dictionary['studio']
  labels: Dictionary['blocks']
  view: 'blocks' | 'python'
  setView: (v: 'blocks' | 'python') => void
  projectName: string
  setProjectName: (v: string) => void
  onDownload: () => void
  onCopy: () => void
  onDownloadPy: () => void
  onShare: () => void
  onReset: () => void
  refineText: string
  setRefineText: (v: string) => void
  onRefine: () => void
  error: string
}

function ResultView(p: ResultViewProps) {
  const { result, t } = p
  const isBlocks = result.format === 'blocks'
  const tab = isBlocks ? p.view : 'python'
  const code = result.format === 'blocks' ? result.python : result.code

  return (
    <div>
      <div className="result-head">
        <div style={{ minWidth: 0 }}>
          <h2>{result.title}</h2>
          {result.description && <p className="result-desc">{result.description}</p>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="format-badge">
            {isBlocks ? <Blocks size={15} aria-hidden="true" /> : <Code2 size={15} aria-hidden="true" />}
            {result.format === 'blocks'
              ? `${countSteps(result.program.steps)} ${pluralForm(p.lang, countSteps(result.program.steps), t.result.blocksCount)}`
              : t.python}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={p.onReset}>
            <RotateCcw size={15} aria-hidden="true" />
            {t.result.newProgram}
          </button>
        </div>
      </div>

      {isBlocks && (
        <div className="tabs" role="tablist" aria-label={t.formatLabel}>
          <button type="button" role="tab" id="tab-blocks" aria-controls="panel-blocks" aria-selected={tab === 'blocks'} onClick={() => p.setView('blocks')}>
            {t.result.blocksTab}
          </button>
          <button type="button" role="tab" id="tab-python" aria-controls="panel-python" aria-selected={tab === 'python'} onClick={() => p.setView('python')}>
            {t.result.pythonTab}
          </button>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="alert alert-warn" role="note">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            {t.result.warnings}
            <ul>
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div style={{ marginTop: isBlocks ? 0 : 18 }}>
        {result.format === 'blocks' && tab === 'blocks' ? (
          <div className="canvas" role="tabpanel" id="panel-blocks" aria-labelledby="tab-blocks">
            <BlockStack program={result.program} labels={p.labels} robot={result.robot} animate />
          </div>
        ) : (
          <div role={isBlocks ? 'tabpanel' : undefined} id="panel-python" aria-labelledby={isBlocks ? 'tab-python' : undefined}>
            {isBlocks && <p className="tab-note">{t.result.pythonOfBlocks}</p>}
            <CodeView code={code} label="Python" />
          </div>
        )}
      </div>

      <div className="toolbar">
        <label className="name-field">
          {t.result.projectName}
          <input className="input" value={p.projectName} maxLength={40} onChange={(e) => p.setProjectName(e.target.value)} />
        </label>
        <button type="button" className="btn btn-primary" onClick={p.onDownload}>
          <FileDown size={18} aria-hidden="true" />
          {t.result.download}
        </button>
        <button type="button" className="btn" onClick={p.onCopy}>
          <Copy size={17} aria-hidden="true" />
          {t.result.copy}
        </button>
        <button type="button" className="btn" onClick={p.onDownloadPy}>
          <FileCode2 size={17} aria-hidden="true" />
          {t.result.downloadPy}
        </button>
        <button type="button" className="btn" onClick={p.onShare}>
          <Link2 size={17} aria-hidden="true" />
          {t.result.share}
        </button>
      </div>

      <form
        className="refine"
        onSubmit={(e) => {
          e.preventDefault()
          p.onRefine()
        }}
      >
        <label className="field-label" htmlFor="refine">
          {t.result.refineLabel}
        </label>
        <input
          id="refine"
          className="input"
          value={p.refineText}
          placeholder={t.result.refinePlaceholder}
          onChange={(e) => p.setRefineText(e.target.value)}
        />
        <button type="submit" className="btn">
          <Wand2 size={17} aria-hidden="true" />
          {t.result.refine}
        </button>
      </form>
      {p.error && (
        <p className="alert" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{p.error}</span>
        </p>
      )}

      <details className="howto">
        <summary>
          <Play size={16} aria-hidden="true" />
          {t.howTo.title}
        </summary>
        <ol>
          {t.howTo.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="safety">{t.howTo.safety}</p>
      </details>
    </div>
  )
}
