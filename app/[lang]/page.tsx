import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Blocks, Check, Code2, Eye, FileCheck2, Languages, MessageSquareText, Plus, ShieldCheck, SlidersHorizontal } from 'lucide-react'

import { BlockStack } from '@/components/block-stack'
import { CodeView } from '@/components/code-view'
import { HeroDemo } from '@/components/hero-demo'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getDictionary, isLocale } from '@/lib/i18n'
import type { Program } from '@/lib/spike/program'
import { programToPython } from '@/lib/spike/python'

const FEATURE_ICONS = [FileCheck2, Eye, MessageSquareText, SlidersHorizontal, ShieldCheck, Languages]
const FEATURE_TONES = ['var(--yellow-ink)', 'var(--azure-ink)', 'var(--magenta-ink)', 'var(--azure-ink)', 'var(--success)', 'var(--yellow-ink)']
const STEP_TONES = ['var(--blk-events)', 'var(--blk-move)', 'var(--blk-motor)']

export default async function LandingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const t = getDictionary(lang)
  const studio = `/${lang}/workspace`
  const tryLink = (prompt: string) => `${studio}?format=blocks&prompt=${encodeURIComponent(prompt)}`

  const demo: Program = {
    title: t.demo.title,
    description: '',
    steps: [
      { op: 'set_speed', speed: 40 },
      { op: 'start_move', direction: 'forward' },
      { op: 'wait_until', condition: { sensor: 'distance', port: 'C', comparator: '<', value: 10, unit: 'cm' } },
      { op: 'stop_move' },
      { op: 'beep', note: 72, seconds: 0.3 },
      { op: 'show_image', image: 'smile' },
    ],
  }
  const square: Program = {
    title: t.modes.sampleTitle,
    description: '',
    steps: [
      {
        op: 'repeat',
        times: 4,
        steps: [
          { op: 'move', direction: 'forward', value: 30, unit: 'cm' },
          { op: 'turn', direction: 'right', degrees: 90 },
        ],
      },
      { op: 'beep', note: 72, seconds: 0.3 },
    ],
  }

  return (
    <>
      <SiteHeader lang={lang} t={t.nav} />
      <main id="main">
        {/* Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="reveal">
              <span className="hero-badge">
                <span className="dot" aria-hidden="true">
                  <Blocks size={13} />
                </span>
                {t.hero.badge}
              </span>
              <h1>
                {t.hero.title1}
                <span className="hl">
                  <span>{t.hero.title2}</span>
                </span>
              </h1>
              <p className="hero-sub">{t.hero.subtitle}</p>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" href={studio}>
                  {t.hero.ctaPrimary}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="btn btn-lg" href="#examples">
                  {t.hero.ctaSecondary}
                </a>
              </div>
              <ul className="hero-points">
                {t.hero.points.map((p) => (
                  <li key={p}>
                    <Check size={16} aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal" style={{ animationDelay: '0.15s' }}>
              <HeroDemo
                t={t.demo}
                tabs={{ blocks: t.studio.result.blocksTab, python: t.studio.result.pythonTab }}
                labels={t.blocks}
                program={demo}
                python={programToPython(demo)}
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="section" id="how">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">{t.how.eyebrow}</p>
              <h2 className="section-title">{t.how.title}</h2>
            </div>
            <ol className="steps">
              {t.how.steps.map((s, i) => (
                <li key={s.title} className="card step">
                  <span className="step-num" style={{ ['--tone' as string]: STEP_TONES[i] }} aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Blocks ↔ Python */}
        <section className="section" id="modes">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">{t.modes.eyebrow}</p>
              <h2 className="section-title">{t.modes.title}</h2>
              <p className="lead">{t.modes.text}</p>
            </div>
            <div className="modes-grid">
              <div className="card mode-pane">
                <h3>
                  <Blocks size={18} aria-hidden="true" />
                  {t.modes.blocksLabel}
                </h3>
                <div className="canvas">
                  <BlockStack program={square} labels={t.blocks} />
                </div>
              </div>
              <div className="card mode-pane">
                <h3>
                  <Code2 size={18} aria-hidden="true" />
                  {t.modes.pythonLabel}
                </h3>
                <CodeView code={programToPython(square)} label={t.modes.pythonLabel} />
              </div>
            </div>
          </div>
        </section>

        {/* Examples */}
        <section className="section" id="examples">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">{t.examples.eyebrow}</p>
              <h2 className="section-title">{t.examples.title}</h2>
            </div>
            <div className="examples-grid">
              {t.examples.items.map((ex) => (
                <article key={ex.image} className="card example">
                  <div className="example-media">
                    {/* Static WebP; next/image optimization is disabled in next.config */}
                    <img src={`/images/${ex.image}.webp`} alt="" width={800} height={600} loading="lazy" decoding="async" />
                  </div>
                  <div className="example-body">
                    <h3>{ex.title}</h3>
                    <p>{ex.text}</p>
                    <Link className="btn btn-sm" href={tryLink(ex.prompt)}>
                      {t.examples.tryIt}
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <div className="ideas">
              <span className="ideas-label">{t.examples.more}:</span>
              {t.examples.ideas.map((idea) => (
                <Link key={idea} className="chip" href={tryLink(idea)}>
                  <Plus size={14} aria-hidden="true" />
                  {idea}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section" id="features">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">{t.features.eyebrow}</p>
              <h2 className="section-title">{t.features.title}</h2>
            </div>
            <div className="features-grid">
              {t.features.items.map((f, i) => {
                const Icon = FEATURE_ICONS[i]
                return (
                  <div key={f.title} className="card feature" style={{ ['--tone' as string]: FEATURE_TONES[i] }}>
                    <span className="feature-icon" aria-hidden="true">
                      <Icon size={22} />
                    </span>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Teachers */}
        <section className="section" id="teachers">
          <div className="container">
            <div className="card teachers">
              <div>
                <p className="eyebrow">{t.teachers.eyebrow}</p>
                <h2 className="section-title">{t.teachers.title}</h2>
                <p className="lead">{t.teachers.text}</p>
                <div className="hero-actions">
                  <Link className="btn btn-primary" href={studio}>
                    {t.teachers.cta}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <ul className="checklist">
                {t.teachers.points.map((p) => (
                  <li key={p}>
                    <Check size={18} aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" id="faq">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">{t.faq.eyebrow}</p>
              <h2 className="section-title">{t.faq.title}</h2>
            </div>
            <div className="faq">
              {t.faq.items.map((item) => (
                <details key={item.q}>
                  <summary>
                    {item.q}
                    <Plus size={20} aria-hidden="true" />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section">
          <div className="container">
            <div className="cta-band">
              <div className="cta-studs" aria-hidden="true" />
              <h2>{t.cta.title}</h2>
              <p>{t.cta.text}</p>
              <Link className="btn btn-lg" href={studio}>
                {t.cta.button}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter lang={lang} t={t.footer} />
    </>
  )
}
