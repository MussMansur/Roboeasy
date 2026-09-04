'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Blocks, Bot, ChevronRight, CircuitBoard, Download, Sparkles, Zap, Cpu, ArrowRight, Play,
} from 'lucide-react'
import Header from '@/components/header'

/* ─── Intersection Observer hook for scroll animations ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

export default function LandingPage() {
  const [dark, setDark] = useState(true)
  const [language, setLanguage] = useState<'en' | 'ru'>('en')
  const [mounted, setMounted] = useState(false)

  const howSection = useInView()
  const featSection = useInView()
  const ctaSection = useInView(0.3)

  useEffect(() => { document.documentElement.lang = language }, [language])
  useEffect(() => { setMounted(true) }, [])

  const t = language === 'ru'
    ? {
        badge: 'LEGO SPIKE × ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ',
        h1a: 'Опиши задачу.',
        h1b: 'Получи программу.',
        subtitle: 'Напиши обычным языком, что должен делать робот — наш ИИ сгенерирует готовый файл с блоками для LEGO Spike Prime. Скачай и открой за секунды.',
        start: 'Начать бесплатно',
        learnMore: 'Как это работает',
        demoLabel: 'ДЕМО',
        demoPrompt: '«Проехать вперёд 20 см и повернуть направо»',
        demoResult: '✅ Сгенерировано 5 блоков · Файл готов к скачиванию',
        howTitle: 'КАК ЭТО РАБОТАЕТ',
        howH2: 'Три простых шага к программе.',
        step1t: 'Опиши',
        step1d: 'Напиши на русском или английском, что должен делать робот. Без кода — обычными словами.',
        step2t: 'Сгенерируй',
        step2d: 'RoboEasy AI создаст программу из блоков — как если бы ты собрал её вручную в LEGO Spike.',
        step3t: 'Скачай и запусти',
        step3d: 'Готовый файл .llsp3 открывается в приложении LEGO Spike Prime — загрузи и нажми «Старт»!',
        featTitle: 'ПОЧЕМУ ROBOEASY',
        featH2: 'Создан для начинающих.',
        feat1t: 'ИИ генерация блоков',
        feat1d: 'Не нужно знать программирование. Описываешь задачу словами — получаешь блочную программу.',
        feat2t: 'Настоящий формат Spike',
        feat2d: 'Генерируем .llsp3 файлы, которые открываются в официальном приложении LEGO Education.',
        feat3t: 'Мгновенный результат',
        feat3d: 'От идеи до работающей программы — за 10 секунд. Без установки и регистрации.',
        feat4t: 'Русский и English',
        feat4d: 'Описывай задачу на любом языке — ИИ понимает оба.',
        ctaH2: 'Готов собрать своего первого робота?',
        ctaP: 'Опиши задачу — мы создадим программу. Бесплатно.',
        ctaBtn: 'Запустить платформу',
        footer: 'Создано для юных робототехников.',
        poweredBy: 'Технологии',
      }
    : {
        badge: 'LEGO SPIKE × ARTIFICIAL INTELLIGENCE',
        h1a: 'Describe the task.',
        h1b: 'Get the program.',
        subtitle: 'Tell the AI what your robot should do in plain language — it generates a ready-to-use block program for LEGO Spike Prime. Download and open in seconds.',
        start: 'Get Started Free',
        learnMore: 'How it works',
        demoLabel: 'DEMO',
        demoPrompt: '"Drive forward 20 cm and turn right"',
        demoResult: '✅ Generated 5 blocks · File ready to download',
        howTitle: 'HOW IT WORKS',
        howH2: 'Three steps to a program.',
        step1t: 'Describe',
        step1d: 'Write what your robot should do in plain English or Russian. No code needed — just words.',
        step2t: 'Generate',
        step2d: 'RoboEasy AI creates a block program — just like you\'d build it manually in LEGO Spike.',
        step3t: 'Download & Run',
        step3d: 'The .llsp3 file opens directly in the LEGO Spike Prime app — load it up and hit "Start"!',
        featTitle: 'WHY ROBOEASY',
        featH2: 'Built for beginners.',
        feat1t: 'AI Block Generation',
        feat1d: 'No programming knowledge needed. Describe the task in words — get a complete block program.',
        feat2t: 'Real Spike Format',
        feat2d: 'We generate .llsp3 files that open directly in the official LEGO Education app.',
        feat3t: 'Instant Results',
        feat3d: 'From idea to working program — in 10 seconds. No installation, no signup.',
        feat4t: 'Russian & English',
        feat4d: 'Describe your task in any language — the AI understands both.',
        ctaH2: 'Ready to build your first robot program?',
        ctaP: 'Describe the task — we\'ll create the program. Free.',
        ctaBtn: 'Launch Platform',
        footer: 'Made for young robotics enthusiasts.',
        poweredBy: 'Technologies',
      }

  return (
    <div className={dark ? 'app-shell dark' : 'app-shell'}>
      <Header
        language={language}
        onLanguageChange={setLanguage}
        dark={dark}
        onDarkChange={setDark}
        navLinks={[
          { label: language === 'ru' ? 'Как это работает' : 'How it works', href: '#how' },
          { label: language === 'ru' ? 'Возможности' : 'Features', href: '#features' },
        ]}
        showWorkspaceLink
      />

      <main>
        {/* ═══ HERO ═══ */}
        <section className="hero landing-hero">
          {/* Animated gradient orbs */}
          <div className="hero-orb orb-yellow" />
          <div className="hero-orb orb-cyan" />
          <div className="hero-orb orb-magenta" />

          <div className={`hero-content ${mounted ? 'animate-in' : ''}`}>
            <div className="hero-badge">
              <Cpu size={13} />
              <span>{t.badge}</span>
            </div>
            <h1>
              {t.h1a}
              <br />
              <em>{t.h1b}</em>
            </h1>
            <p>{t.subtitle}</p>
            <div className="hero-actions">
              <Link className="primary-button glow-button" href="/workspace">
                <Sparkles size={16} /> {t.start}
                <ArrowRight size={14} className="arrow-slide" />
              </Link>
              <a className="text-link" href="#how">
                {t.learnMore} <ChevronRight size={15} />
              </a>
            </div>
          </div>

          {/* Animated demo preview card */}
          <div className={`hero-demo ${mounted ? 'animate-in delay-2' : ''}`}>
            <div className="demo-card">
              <div className="demo-header">
                <span className="demo-badge">{t.demoLabel}</span>
                <div className="demo-dots">
                  <span className="dot yellow" />
                  <span className="dot cyan" />
                  <span className="dot magenta" />
                </div>
              </div>
              <div className="demo-prompt">
                <Bot size={16} className="demo-bot-icon" />
                <span>{t.demoPrompt}</span>
              </div>
              <div className="demo-blocks">
                <div className="demo-block b1"><Play size={10} /> When program starts</div>
                <div className="demo-block b2">Set speed to 50%</div>
                <div className="demo-block b3">Motor A + B run for 2 rotations</div>
                <div className="demo-block b4">Motor A run for 1 rotation</div>
                <div className="demo-block b5">Stop all motors</div>
              </div>
              <div className="demo-result">{t.demoResult}</div>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section id="how" className="section" ref={howSection.ref}>
          <div className="section-heading">
            <div>
              <div className="eyebrow">01 / {t.howTitle}</div>
              <h2>{t.howH2}</h2>
            </div>
          </div>
          <div className={`steps-grid ${howSection.inView ? 'animate-stagger' : 'pre-animate'}`}>
            <div className="step-card">
              <div className="step-number yellow">01</div>
              <div className="step-icon yellow"><Bot size={28} /></div>
              <h3>{t.step1t}</h3>
              <p>{t.step1d}</p>
            </div>
            <div className="step-card">
              <div className="step-number cyan">02</div>
              <div className="step-icon cyan"><Sparkles size={28} /></div>
              <h3>{t.step2t}</h3>
              <p>{t.step2d}</p>
            </div>
            <div className="step-card">
              <div className="step-number magenta">03</div>
              <div className="step-icon magenta"><Download size={28} /></div>
              <h3>{t.step3t}</h3>
              <p>{t.step3d}</p>
            </div>
          </div>

          {/* Animated connection line */}
          <div className={`steps-connector ${howSection.inView ? 'connector-animate' : ''}`}>
            <div className="connector-line" />
            <div className="connector-dot d1" />
            <div className="connector-dot d2" />
            <div className="connector-dot d3" />
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section id="features" className="section" ref={featSection.ref}>
          <div className="section-heading">
            <div>
              <div className="eyebrow cyan-text">02 / {t.featTitle}</div>
              <h2>{t.featH2}</h2>
            </div>
          </div>
          <div className={`features-grid ${featSection.inView ? 'animate-stagger' : 'pre-animate'}`}>
            <div className="feature-card">
              <div className="feature-icon yellow"><Sparkles size={22} /></div>
              <h3>{t.feat1t}</h3>
              <p>{t.feat1d}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon cyan"><Blocks size={22} /></div>
              <h3>{t.feat2t}</h3>
              <p>{t.feat2d}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon magenta"><Zap size={22} /></div>
              <h3>{t.feat3t}</h3>
              <p>{t.feat3d}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><CircuitBoard size={22} /></div>
              <h3>{t.feat4t}</h3>
              <p>{t.feat4d}</p>
            </div>
          </div>
        </section>

        {/* ═══ TECH BADGE ═══ */}
        <section className="section tech-section">
          <div className="tech-badges">
            <span className="tech-badge">{t.poweredBy}</span>
            <span className="tech-pill">RoboEasy AI</span>
            <span className="tech-pill">LEGO Spike Prime</span>
            <span className="tech-pill">.llsp3 / Scratch 3.0</span>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="section cta-section" ref={ctaSection.ref}>
          <div className={`cta-box ${ctaSection.inView ? 'animate-in' : 'pre-animate'}`}>
            <div className="cta-glow" />
            <h2>{t.ctaH2}</h2>
            <p>{t.ctaP}</p>
            <Link className="primary-button glow-button" href="/workspace">
              <Sparkles size={16} /> {t.ctaBtn}
              <ArrowRight size={14} className="arrow-slide" />
            </Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="brand">
          <span className="brand-mark"><CircuitBoard size={17} /></span>
          <span>RoboEasy <b>AI</b></span>
        </div>
        <span>{t.footer}</span>
      </footer>
    </div>
  )
}
