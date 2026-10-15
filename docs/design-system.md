# Design system — «Конструктор» (direction B)

Living style guide: `/ru/design` (also `/kk/design`, `/en/design`; not indexed).

## Look
Thick outlines, hard offset shadows that "press" on click, warm cream and ink, bright category colours, a dotted page background. No LEGO/FIRST logos, fonts or artwork; LEGO, SPIKE and FIRST LEGO League are mentioned only as names, with a disclaimer in the footer.

## Tokens (`app/globals.css`, top of the file)
- **Primitives**: `--ink-*`, `--cream-*`, `--sun-*`, `--sky-*`, `--leaf-*`, …
- **Semantic, per theme** (`[data-theme='light'|'dark']`): `--bg`, `--surface`, `--surface-2/3`, `--outline` (thick strokes), `--border` (subtle dividers), `--text`, `--text-2/3`, `--accent`/`--on-accent`, `--link`, `--focus`, `--success`, `--danger-*`, `--warn-*`.
- **Shape**: `--radius-xs…xl`, `--stroke` (2.5 px), `--stroke-thin`, `--shadow-hard`, `--shadow-hard-sm`, `--shadow-press`.
- **Spacing** `--space-1…16` (4 px grid), **type** `--text-xs…4xl`, **motion** `--duration*`, `--ease-out`.
- **Block categories** `--blk-*` (dark text keeps ≥ 4.5:1 on every hue).
- shadcn names (`bg-primary`, `text-muted-foreground`, `border-outline`, …) map to these tokens in `@theme inline`.

All text/background pairs pass WCAG AA (checked with axe and by computing ratios).

## Theme
`system` by default; the header button cycles system → light → dark. The choice is saved in `localStorage.theme`; `lib/theme-script.ts` applies it before the first paint and follows OS changes. Use `useTheme()` from `lib/theme.ts` in client code.

## Fonts (`lib/fonts.ts`)
Rubik (headings), Nunito (text), IBM Plex Mono (code, numbers) — all cover Kazakh Cyrillic. Do not reintroduce Unbounded or JetBrains Mono: they lack lowercase Kazakh letters.

## Components (`components/ui`, based on shadcn/ui + Radix)
| Component | Use |
|---|---|
| `Button`, `buttonVariants()` | every button; `buttonVariants` for `<a>`, `<Link>`, `<label>`. Variants: `primary`, `secondary` (default), `ghost`, `danger`, `link`; sizes `sm`, `md`, `lg`, `icon`, `icon-sm`; `block` |
| `Card` | panels (`flat` removes the shadow); the `.card` CSS class has the same look |
| `Tabs` | real tabs (Radix: arrows, aria). `tabTriggerClass` + `.tab-tray` for toggle groups with `aria-pressed` |
| `Dialog` | modals (focus trap, Esc, focus return); pass `closeLabel` |
| `toast` (sonner) | short confirmations: `toast.success(text)`, `toast.error(text)`; `<Toaster>` is in `components/providers.tsx` |
| `Hint` / `Tooltip` | names for icon-only buttons (also give them `aria-label`) |
| `Skeleton` | loading placeholders |
| `EmptyState` | empty screens: icon, title, why, what to do next |
| `Stepper` | numbered steps (calibration, onboarding) |
| `Badge` | counters and statuses: `default`, `outline`, `primary`, `success`, `warn`, `danger` |

Icons: lucide-react only. Animations: `motion` (wrapped in `MotionConfig reducedMotion="user"`) and `tw-animate-css`; keep them short and add `motion-reduce:` fallbacks.

Element defaults (`html`, `body`, headings, links) are in `@layer base`, so utilities in the components always win.
