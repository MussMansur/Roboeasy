import Link from 'next/link'
import {
  ArrowRight,
  Award,
  Blocks,
  BookOpen,
  Bot,
  Check,
  CircleCheckBig,
  Code2,
  Cog,
  Compass,
  Flame,
  Hammer,
  Info,
  Lightbulb,
  MonitorPlay,
  Plus,
  Radar,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react'

import { PathTrail } from '@/components/learn/path-trail'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Locale } from '@/lib/i18n/config'
import type { LearnLandingCopy, TrackKey } from '@/lib/i18n/learn-landing'

const TRACKS: { key: TrackKey; icon: typeof Rocket; color: string; kit: 'none' | 'part' }[] = [
  { key: 'start', icon: Rocket, color: 'var(--blk-events)', kit: 'none' },
  { key: 'build', icon: Hammer, color: 'var(--blk-control)', kit: 'part' },
  { key: 'blocks', icon: Blocks, color: 'var(--blk-move)', kit: 'none' },
  { key: 'sensors', icon: Radar, color: 'var(--blk-sensors)', kit: 'none' },
  { key: 'navigation', icon: Compass, color: 'var(--blk-motor)', kit: 'none' },
  { key: 'python', icon: Code2, color: 'var(--blk-light)', kit: 'none' },
  { key: 'mechanisms', icon: Cog, color: 'var(--blk-sound)', kit: 'part' },
  { key: 'fll', icon: Trophy, color: 'var(--blk-events)', kit: 'part' },
]

function Head({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="section-head">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  )
}

/** The landing of the learning platform (phase 13 preview). */
export function LearnLanding({ lang, t }: { lang: Locale; t: LearnLandingCopy }) {
  const trail = t.hero.path.map((label, i) => ({ label, state: i < 2 ? ('done' as const) : i === 2 ? ('current' as const) : i === 3 ? ('open' as const) : ('locked' as const) }))
  const stepIcons = [BookOpen, Wrench, CircleCheckBig]
  const motivationIcons = [Flame, Star, Award]

  return (
    <>
      <div className="container pt-4">
        <p className="alert alert-warn m-0" role="note">
          <Info size={18} aria-hidden="true" />
          <span>{t.previewNote}</span>
        </p>
      </div>

      {/* Hero */}
      <section className="container grid items-center gap-10 py-10 md:grid-cols-[1.15fr_0.85fr] md:py-16">
        <div className="grid gap-6">
          <Badge variant="outline" className="py-1.5">
            <Bot aria-hidden="true" />
            {t.hero.badge}
          </Badge>
          <h1 className="m-0 text-(length:--text-4xl) leading-[1.05]">
            {t.hero.title}{' '}
            <span className="relative isolate inline-block">
              <span className="absolute inset-x-[-4px] bottom-[0.08em] -z-10 h-[0.42em] rounded-sm bg-primary" aria-hidden="true" />
              {t.hero.accent}
            </span>
          </h1>
          <p className="lead m-0">{t.hero.sub}</p>
          <div className="flex flex-wrap gap-3">
            <a className={buttonVariants({ variant: 'primary', size: 'lg' })} href="#tracks">
              {t.hero.cta}
              <ArrowRight aria-hidden="true" />
            </a>
            <a className={buttonVariants({ size: 'lg' })} href="#tracks">
              {t.hero.ctaTest}
            </a>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {t.hero.chips.map((c) => (
              <li key={c}>
                <Badge>
                  <Check aria-hidden="true" />
                  {c}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
        <Card className="bg-[radial-gradient(var(--dots)_1.6px,transparent_2px)] bg-size-[20px_20px] py-8">
          <PathTrail nodes={trail} station={t.hero.station} />
        </Card>
      </section>

      {/* How */}
      <section className="section" id="how">
        <div className="container">
          <Head eyebrow={t.how.eyebrow} title={t.how.title} />
          <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
            {t.how.steps.map((s, i) => {
              const Icon = stepIcons[i]
              return (
                <li key={s.title}>
                  <Card className="h-full">
                    <span className="grid size-12 place-items-center rounded-(--radius-sm) border-(length:--stroke) border-outline bg-primary text-primary-foreground shadow-(--shadow-press)">
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <h3 className="m-0 text-xl">
                      {i + 1}. {s.title}
                    </h3>
                    <p className="m-0 text-muted-foreground">{s.text}</p>
                  </Card>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Tracks */}
      <section className="section" id="tracks">
        <div className="container">
          <Head eyebrow={t.tracks.eyebrow} title={t.tracks.title} lead={t.tracks.lead} />
          <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {TRACKS.map(({ key, icon: Icon, color, kit }, i) => {
              const tr = t.tracks.items[key]
              return (
                <li key={key}>
                  <Card className="h-full gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="grid size-12 place-items-center rounded-(--radius-sm) border-(length:--stroke) border-outline text-(--blk-text) shadow-(--shadow-press)"
                        style={{ background: color }}
                      >
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                      <span className="font-mono text-sm font-semibold text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="m-0 text-lg">{tr.title}</h3>
                    <p className="m-0 text-sm text-muted-foreground">{tr.text}</p>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      <Badge>{tr.time}</Badge>
                      <Badge variant={kit === 'none' ? 'success' : 'warn'}>{kit === 'none' ? t.tracks.noKit : t.tracks.partKit}</Badge>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Virtual robot */}
      <section className="section">
        <div className="container grid items-center gap-10 md:grid-cols-2">
          <div>
            <Head eyebrow={t.virtual.eyebrow} title={t.virtual.title} lead={t.virtual.text} />
            <ul className="checklist">
              {t.virtual.points.map((p) => (
                <li key={p}>
                  <Check size={18} aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <Card className="gap-3">
            <div className="flex items-center gap-2 font-display font-bold">
              <MonitorPlay className="size-5" aria-hidden="true" />
              {t.how.steps[1].title}
            </div>
            {/* A schematic task field: start, line, wall, finish */}
            <svg viewBox="0 0 320 180" className="w-full rounded-(--radius-sm) border-(length:--stroke-thin) border-outline bg-surface-2" aria-hidden="true">
              <rect x="20" y="120" width="56" height="44" rx="6" fill="color-mix(in srgb, var(--link) 18%, transparent)" stroke="var(--link)" strokeWidth="3" strokeDasharray="8 6" />
              <path d="M48 120 C 48 60, 150 70, 170 60 S 250 40, 268 90" fill="none" stroke="var(--text)" strokeWidth="10" strokeLinecap="round" opacity="0.85" />
              <rect x="226" y="24" width="12" height="70" rx="3" fill="var(--blk-move)" stroke="var(--outline)" strokeWidth="2.5" />
              <rect x="244" y="104" width="60" height="56" rx="6" fill="color-mix(in srgb, var(--success) 22%, transparent)" stroke="var(--success)" strokeWidth="3" />
              <g transform="translate(150 66) rotate(-18)">
                <rect x="-22" y="-16" width="44" height="32" rx="6" fill="var(--accent)" stroke="var(--outline)" strokeWidth="3" />
                <rect x="-26" y="-20" width="12" height="8" rx="2" fill="var(--outline)" />
                <rect x="-26" y="12" width="12" height="8" rx="2" fill="var(--outline)" />
                <circle cx="14" cy="0" r="4" fill="var(--outline)" />
              </g>
            </svg>
            <div className="flex flex-wrap gap-2">
              <span className={buttonVariants({ variant: 'primary', size: 'sm' })}>▶</span>
              <Badge variant="success">
                <Check aria-hidden="true" />
                {t.how.steps[2].title}
              </Badge>
            </div>
          </Card>
        </div>
      </section>

      {/* Motivation */}
      <section className="section">
        <div className="container">
          <Head eyebrow={t.motivation.eyebrow} title={t.motivation.title} />
          <div className="grid gap-4 md:grid-cols-3">
            {t.motivation.items.map((m, i) => {
              const Icon = motivationIcons[i]
              return (
                <Card key={m.title} className="gap-3">
                  <span className="grid size-12 place-items-center rounded-full border-(length:--stroke) border-outline bg-primary text-primary-foreground shadow-(--shadow-press)">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="m-0 text-xl">{m.title}</h3>
                  <p className="m-0 text-muted-foreground">{m.text}</p>
                </Card>
              )
            })}
          </div>
          <p className="mt-6 mb-0 flex items-center gap-2 font-bold text-muted-foreground">
            <Sparkles className="size-5" aria-hidden="true" />
            {t.motivation.note}
          </p>
        </div>
      </section>

      {/* Mentor */}
      <section className="section">
        <div className="container grid items-center gap-10 md:grid-cols-2">
          <div>
            <Head eyebrow={t.mentor.eyebrow} title={t.mentor.title} lead={t.mentor.text} />
            <ol className="m-0 grid list-none gap-2 p-0">
              {t.mentor.levels.map((l, i) => (
                <li key={l} className="flex items-center gap-3 font-bold">
                  <span className="grid size-8 place-items-center rounded-full border-(length:--stroke-thin) border-outline bg-card font-display">{i + 1}</span>
                  {l}
                </li>
              ))}
            </ol>
          </div>
          <Card className="gap-3">
            <p className="m-0 max-w-[85%] self-end rounded-(--radius-sm) border-(length:--stroke-thin) border-outline bg-surface-2 px-3 py-2 font-bold">{t.mentor.question}</p>
            <div className="flex max-w-[90%] gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border-(length:--stroke-thin) border-outline bg-primary text-primary-foreground">
                <Lightbulb className="size-5" aria-hidden="true" />
              </span>
              <p className="m-0 rounded-(--radius-sm) border-(length:--stroke-thin) border-outline bg-card px-3 py-2">{t.mentor.answer}</p>
            </div>
            <Badge variant="outline" className="self-start">
              1 / 3 · {t.mentor.levels[0]}
            </Badge>
          </Card>
        </div>
      </section>

      {/* Competitions */}
      <section className="section">
        <div className="container">
          <Card className="items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid gap-2">
              <p className="eyebrow m-0">{t.compete.eyebrow}</p>
              <h2 className="m-0 text-(length:--text-2xl)">{t.compete.title}</h2>
              <p className="m-0 max-w-[60ch] text-muted-foreground">{t.compete.text}</p>
            </div>
            <Link className={buttonVariants({ size: 'lg' })} href={`/${lang}/fll`}>
              <Trophy aria-hidden="true" />
              {t.compete.cta}
            </Link>
          </Card>
        </div>
      </section>

      {/* Teachers and parents */}
      <section className="section">
        <div className="container">
          <Head eyebrow={t.adults.eyebrow} title={t.adults.title} />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { block: t.adults.teachers, icon: Users },
              { block: t.adults.parents, icon: ShieldCheck },
            ].map(({ block, icon: Icon }) => (
              <Card key={block.title} className="gap-3">
                <h3 className="m-0 flex items-center gap-2 text-xl">
                  <Icon className="size-6" aria-hidden="true" />
                  {block.title}
                </h3>
                <ul className="checklist">
                  {block.items.map((it) => (
                    <li key={it}>
                      <Check size={18} aria-hidden="true" />
                      {it}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq">
        <div className="container">
          <Head eyebrow="FAQ" title={t.faq.title} />
          <div className="faq">
            {t.faq.items.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h2>{t.final.title}</h2>
            <p>{t.final.text}</p>
            <a className={buttonVariants({ size: 'lg' })} href="#tracks">
              {t.final.cta}
              <ArrowRight aria-hidden="true" />
            </a>
            <div className="cta-studs" aria-hidden="true" />
          </div>
        </div>
      </section>
    </>
  )
}
