import Link from 'next/link'
import {
  ArrowRight,
  Award,
  Blocks,
  BookOpen,
  Bot,
  Brain,
  Check,
  CircleCheckBig,
  Code2,
  Cog,
  Compass,
  Flame,
  Gauge,
  Gift,
  Hammer,
  Library,
  Lightbulb,
  MonitorPlay,
  Palette,
  Plus,
  Puzzle,
  Radar,
  Rocket,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Wrench,
  Zap,
} from 'lucide-react'

import { Buddy } from '@/components/learn/buddy'
import { CoinIcon } from '@/components/learn/coin'
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

const GAMES = [
  { icon: Route, color: 'var(--blk-move)' },
  { icon: Puzzle, color: 'var(--blk-events)' },
  { icon: Brain, color: 'var(--blk-sound)' },
  { icon: Zap, color: 'var(--blk-control)' },
]

/** Sample robots for the buddy section (all are free or in the garage). */
const SAMPLE_ROBOTS = [
  { model: 'rover', color: 'sun', hat: 'cap', eyes: 'happy', sticker: 'star' },
  { model: 'tank', color: 'grape', hat: 'headphones', eyes: 'round', sticker: 'bolt' },
  { model: 'racer', color: 'brick', hat: 'none', eyes: 'visor', sticker: 'fire', wheels: 'racing' },
  { model: 'spider', color: 'mint', hat: 'crown', eyes: 'heart', sticker: 'none' },
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

function StatChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border-(length:--stroke-thin) border-outline bg-card px-3 py-1.5 text-sm font-extrabold shadow-(--shadow-press) ${className ?? ''}`}
    >
      {children}
    </span>
  )
}

/** The home page: self-paced robotics with a robot buddy, games and daily quests. */
export function LearnLanding({ lang, t }: { lang: Locale; t: LearnLandingCopy }) {
  const stepIcons = [BookOpen, Wrench, CircleCheckBig]
  const motivationIcons = [Flame, Star, Award]
  const buddyIcons = [Gauge, Palette, CoinIcon]
  const selfIcons = [Timer, Lightbulb, Library]

  return (
    <>
      {/* Hero */}
      <section className="container grid items-center gap-8 py-8 md:grid-cols-[1.1fr_0.9fr] md:gap-10 md:py-16">
        <div className="grid gap-5 md:gap-6">
          <Badge variant="outline" className="py-1.5">
            <Bot aria-hidden="true" />
            {t.hero.badge}
          </Badge>
          <h1 className="m-0 text-(length:--text-4xl) leading-[1.08]">
            {t.hero.title}{' '}
            <span className="mt-1 inline-block -rotate-2 rounded-(--radius-sm) border-(length:--stroke) border-outline bg-primary px-3 pb-1 text-primary-foreground shadow-(--shadow-hard-sm)">
              {t.hero.accent}
            </span>
          </h1>
          <p className="lead m-0">{t.hero.sub}</p>
          <div className="flex flex-wrap gap-3">
            <Link className={buttonVariants({ variant: 'primary', size: 'lg', className: 'max-sm:w-full' })} href={`/${lang}/path`}>
              {t.hero.cta}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={buttonVariants({ size: 'lg', className: 'max-sm:w-full' })} href={`/${lang}/learn/placement`}>
              {t.hero.ctaTest}
            </Link>
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
        <Card className="gap-3 bg-[radial-gradient(var(--dots)_1.6px,transparent_2px)] bg-size-[20px_20px] p-4 sm:p-6" aria-hidden="true">
          <div className="flex flex-wrap justify-between gap-2">
            <StatChip className="-rotate-2">
              <Flame className="size-4 text-[#e8442e]" />
              {t.hero.stats.streak}
            </StatChip>
            <StatChip className="rotate-2">
              <CoinIcon className="size-4" />
              {t.hero.stats.coins}
            </StatChip>
          </div>
          <Buddy model="rover" color="sky" hat="cap" eyes="happy" sticker="star" tiers={{ motor: 2, cpu: 1 }} className="mx-auto w-48 sm:w-60" animate />
          <div className="flex flex-wrap justify-between gap-2">
            <StatChip className="rotate-1">
              <Sparkles className="size-4 text-[#c98a00]" />
              {t.hero.stats.level}
            </StatChip>
            <StatChip className="-rotate-1 bg-(--ok-bg)">
              <Check className="size-4 text-success" />
              {t.hero.stats.quest}
            </StatChip>
          </div>
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

      {/* Robot buddy */}
      <section className="section" id="buddy">
        <div className="container grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Head eyebrow={t.buddy.eyebrow} title={t.buddy.title} lead={t.buddy.text} />
            <ul className="m-0 grid list-none gap-4 p-0">
              {t.buddy.points.map((pt, i) => {
                const Icon = buddyIcons[i]
                return (
                  <li key={pt.title} className="flex gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border-(length:--stroke-thin) border-outline bg-card shadow-(--shadow-press)">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="grid gap-0.5">
                      <strong className="font-display text-lg">{pt.title}</strong>
                      <span className="text-muted-foreground">{pt.text}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
          <Card className="gap-4">
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4" aria-hidden="true">
              {SAMPLE_ROBOTS.map((r) => (
                <li key={r.model} className="rounded-(--radius-md) border-(length:--stroke-thin) border-outline bg-surface-2 p-2">
                  <Buddy {...r} />
                </li>
              ))}
            </ul>
            <div className="grid gap-2">
              <p className="m-0 flex items-center gap-2 font-display text-lg font-extrabold">
                <Wrench className="size-5" aria-hidden="true" />
                {t.buddy.shop.title}
              </p>
              <ul className="m-0 grid list-none gap-2 p-0">
                {t.buddy.shop.items.map((it) => (
                  <li
                    key={it.name}
                    className="flex items-center justify-between gap-3 rounded-(--radius-sm) border-(length:--stroke-thin) border-outline bg-card px-3 py-2"
                  >
                    <span className="font-bold">
                      {it.name} <span className="font-normal text-muted-foreground">· {it.effect}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-display font-extrabold">
                      <CoinIcon className="size-4" />
                      {it.price}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </section>

      {/* Games */}
      <section className="section" id="games">
        <div className="container">
          <Head eyebrow={t.games.eyebrow} title={t.games.title} lead={t.games.lead} />
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {t.games.items.map((g, i) => {
              const { icon: Icon, color } = GAMES[i]
              return (
                <li key={g.title}>
                  <Card className="h-full gap-3">
                    <span
                      className="grid size-12 place-items-center rounded-(--radius-sm) border-(length:--stroke) border-outline text-(--blk-text) shadow-(--shadow-press)"
                      style={{ background: color }}
                    >
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <h3 className="m-0 text-lg">{g.title}</h3>
                    <p className="m-0 text-sm text-muted-foreground">{g.text}</p>
                  </Card>
                </li>
              )
            })}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <p className="m-0 flex items-center gap-2 font-bold">
              <Gift className="size-5 text-[#c98a00]" aria-hidden="true" />
              {t.games.quests}
            </p>
            <Link className={buttonVariants({ variant: 'primary' })} href={`/${lang}/play`}>
              {t.games.title}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
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
              <rect
                x="20"
                y="120"
                width="56"
                height="44"
                rx="6"
                fill="color-mix(in srgb, var(--link) 18%, transparent)"
                stroke="var(--link)"
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              <path
                d="M48 120 C 48 60, 150 70, 170 60 S 250 40, 268 90"
                fill="none"
                stroke="var(--text)"
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.85"
              />
              <rect x="226" y="24" width="12" height="70" rx="3" fill="var(--blk-move)" stroke="var(--outline)" strokeWidth="2.5" />
              <rect
                x="244"
                y="104"
                width="60"
                height="56"
                rx="6"
                fill="color-mix(in srgb, var(--success) 22%, transparent)"
                stroke="var(--success)"
                strokeWidth="3"
              />
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
            <Sparkles className="size-5 shrink-0" aria-hidden="true" />
            {t.motivation.note}
          </p>
        </div>
      </section>

      {/* Learning on your own */}
      <section className="section" id="self">
        <div className="container">
          <Head eyebrow={t.self.eyebrow} title={t.self.title} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {t.self.items.map((it, i) => {
              const Icon = selfIcons[i]
              return (
                <Card key={it.title} className="gap-3">
                  <Icon className="size-7" aria-hidden="true" />
                  <h3 className="m-0 text-xl">{it.title}</h3>
                  <p className="m-0 text-muted-foreground">{it.text}</p>
                </Card>
              )
            })}
            <Card className="gap-3 bg-surface-2" flat>
              <h3 className="m-0 flex items-center gap-2 text-xl">
                <ShieldCheck className="size-6" aria-hidden="true" />
                {t.self.parents.title}
              </h3>
              <ul className="checklist">
                {t.self.parents.items.map((it) => (
                  <li key={it}>
                    <Check size={18} aria-hidden="true" />
                    {it}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
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
            <p className="m-0 max-w-[85%] self-end rounded-(--radius-sm) border-(length:--stroke-thin) border-outline bg-surface-2 px-3 py-2 font-bold">
              {t.mentor.question}
            </p>
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
            <Link className={buttonVariants({ size: 'lg' })} href={`/${lang}/compete`}>
              <Trophy aria-hidden="true" />
              {t.compete.cta}
            </Link>
          </Card>
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
            <Link className={buttonVariants({ size: 'lg' })} href={`/${lang}/path`}>
              {t.final.cta}
              <ArrowRight aria-hidden="true" />
            </Link>
            <div className="cta-studs" aria-hidden="true" />
          </div>
        </div>
      </section>
    </>
  )
}
