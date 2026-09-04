'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Check, CircuitBoard, Download, Loader2, Sparkles, X,
} from 'lucide-react'
import Header from '@/components/header'
import { createLlsp3File, downloadFile } from '@/lib/spike-file'

type GenerationState = 'idle' | 'loading' | 'success' | 'error'

const examplePrompts = {
  en: [
    'Drive forward for 3 seconds',
    'Turn 90 degrees to the right',
    'Stop when obstacle is closer than 10 cm',
    'Show a smiley face on the display',
    'Drive in a square pattern',
    'Follow a line using the color sensor',
  ],
  ru: [
    'Проехать вперёд 3 секунды',
    'Повернуть на 90 градусов вправо',
    'Остановиться перед препятствием (10 см)',
    'Показать смайлик на дисплее',
    'Проехать по квадрату',
    'Ехать по линии используя датчик цвета',
  ],
}

export default function WorkspacePage() {
  const [dark, setDark] = useState(true)
  const [language, setLanguage] = useState<'en' | 'ru'>('en')
  const [format, setFormat] = useState<'blocks' | 'python'>('python')
  const [prompt, setPrompt] = useState('')
  const [state, setState] = useState<GenerationState>('idle')
  const [error, setError] = useState('')
  const [description, setDescription] = useState('')
  const [payload, setPayload] = useState<any>(null)
  const [projectName, setProjectName] = useState('MyRobot')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { document.documentElement.lang = language }, [language])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(language === 'ru' ? 'Опишите, что должен делать робот' : 'Describe what your robot should do')
      setState('error')
      return
    }

    setState('loading')
    setError('')
    setDescription('')
    setPayload(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), language, format }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`)
      }

      setPayload(data.payload)
      setDescription(data.description)
      setState('success')
    } catch (err: any) {
      setError(language === 'ru' ? `Ошибка: ${err.message}` : `Error: ${err.message}`)
      setState('error')
    }
  }

  const handleDownload = async () => {
    if (!payload) return
    try {
      const blob = await createLlsp3File(projectName || 'MyRobot', payload, format)
      const safeName = (projectName || 'MyRobot').replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_')
      downloadFile(blob, `${safeName}.llsp3`)
    } catch {
      setError(language === 'ru' ? 'Ошибка создания файла' : 'Error creating file')
    }
  }

  const useExamplePrompt = (text: string) => {
    setPrompt(text)
    textareaRef.current?.focus()
  }

  const t = language === 'ru'
    ? {
        back: 'На главную',
        promptTitle: 'Что должен делать робот?',
        promptPlaceholder: 'Опишите задачу на русском или английском...\n\nНапример: Проехать вперёд 3 секунды, повернуть на 90 градусов и остановиться',
        examples: 'Попробуйте:',
        generate: 'Сгенерировать',
        generating: 'Генерирую...',
        resultTitle: 'Программа готова',
        projectName: 'Название проекта',
        download: 'Скачать .llsp3',
        howOpen: 'Как открыть файл',
        howOpenSteps: [
          'Откройте приложение LEGO Spike Prime на компьютере или планшете',
          'Нажмите «Открыть проект» или «Импорт»',
          'Выберите скачанный файл .llsp3',
          'Программа с блоками появится в редакторе — запускайте',
        ],
        tryAnother: 'Создать ещё одну программу',
        aiLabel: 'RoboEasy AI',
        ready: 'Готов к работе',
      }
    : {
        back: 'Back to Home',
        promptTitle: 'What should your robot do?',
        promptPlaceholder: 'Describe the task in English or Russian...\n\nFor example: Drive forward for 3 seconds, turn 90 degrees and stop',
        examples: 'Try these:',
        generate: 'Generate',
        generating: 'Generating...',
        resultTitle: 'Program ready',
        projectName: 'Project name',
        download: 'Download .llsp3',
        howOpen: 'How to open the file',
        howOpenSteps: [
          'Open the LEGO Spike Prime app on your computer or tablet',
          'Click "Open Project" or "Import"',
          'Select the downloaded .llsp3 file',
          'The block program will appear in the editor — hit run',
        ],
        tryAnother: 'Create another program',
        aiLabel: 'RoboEasy AI',
        ready: 'Ready',
      }

  const prompts = examplePrompts[language]

  return (
    <div className={dark ? 'app-shell dark' : 'app-shell'}>
      <Header
        language={language}
        onLanguageChange={setLanguage}
        dark={dark}
        onDarkChange={setDark}
      />

      <main className="workspace-main">
        <Link href="/" className="text-link back-link">
          <ArrowLeft size={14} /> {t.back}
        </Link>

        {/* ─── AI STATUS ─── */}
        <div className="ai-status-bar">
          <div className="ai-status-left">
            <span className="ai-status-icon"><CircuitBoard size={14} /></span>
            <span className="ai-status-name">{t.aiLabel}</span>
          </div>
          
          <div className="format-toggle">
            <button 
              className={format === 'python' ? 'active' : ''} 
              onClick={() => setFormat('python')}
            >
              Python
            </button>
            <button 
              className={format === 'blocks' ? 'active' : ''} 
              onClick={() => setFormat('blocks')}
            >
              Blocks (Beta)
            </button>
          </div>

          <span className="ai-status-ready">
            <span className="pulse-dot" /> {t.ready}
          </span>
        </div>

        {/* ─── PROMPT ─── */}
        <section className="ws-section prompt-section">
          <h2 className="ws-title">{t.promptTitle}</h2>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.promptPlaceholder}
            className="prompt-textarea"
            rows={5}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleGenerate()
              }
            }}
          />
          <div className="example-prompts">
            <span className="example-label">{t.examples}</span>
            <div className="example-chips">
              {prompts.map((p) => (
                <button key={p} className="example-chip" onClick={() => useExamplePrompt(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? (
              <><Loader2 size={16} className="spin" /> {t.generating}</>
            ) : (
              <><Sparkles size={16} /> {t.generate}</>
            )}
          </button>
          {state === 'error' && error && (
            <p className="ws-error" role="alert">{error}</p>
          )}
        </section>

        {/* ─── RESULT ─── */}
        {state === 'success' && payload && (
          <section className="ws-section result-section">
            <div className="result-header">
              <Check size={18} />
              <h2 className="ws-title">{t.resultTitle}</h2>
            </div>

            <div className="result-description">
              <p>{description}</p>
            </div>

            <div className="download-area">
              <label className="project-name-label">
                {t.projectName}
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="project-name-input"
                />
              </label>
              <button className="primary-button download-btn" onClick={handleDownload}>
                <Download size={16} /> {t.download}
              </button>
            </div>

            <div className="how-to-open">
              <h3>{t.howOpen}</h3>
              <ol>
                {t.howOpenSteps.map((step, i) => (
                  <li key={i}>
                    <span>{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <button className="text-link try-another" onClick={() => { setState('idle'); setPrompt(''); setPayload(null); setDescription('') }}>
              {t.tryAnother}
            </button>
          </section>
        )}
      </main>

      <footer>
        <div className="brand">
          <span className="brand-mark"><CircuitBoard size={17} /></span>
          <span>RoboEasy <b>AI</b></span>
        </div>
        <span>{language === 'ru' ? 'Создано для юных робототехников.' : 'Made for young robotics enthusiasts.'}</span>
      </footer>
    </div>
  )
}
