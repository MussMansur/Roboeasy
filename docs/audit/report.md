# RoboEasy — UI/UX audit (phase 7.1)

Date: 2026-10-15 · commit `81418dd` · Next.js 16.3.3, Chrome 155, Playwright 1.64, Lighthouse 12, axe-core.

## How the audit was made

| What | How | Where |
|---|---|---|
| Screenshots | `npx tsx scripts/audit/capture.ts http://localhost:3100 docs/audit/before` — every page at 375 / 768 / 1440 px, light and dark theme, plus "filled" states (generated program, FLL plan, editor with objects) with the AI mocked | `docs/audit/before/*.jpg` (60 files) |
| Accessibility | axe (WCAG 2.1 A/AA) on every page in both themes; 25 Tab presses per page with a visible-focus check | `before/axe.json`, `before/focus.json` |
| Performance | Lighthouse on a **production** build (`next build && next start`), mobile and desktop presets | `before/lighthouse.json` |
| Visual directions | `docs/audit/directions/{a,b,c}.html`, screenshots `*-1440.png`, `*-390.png` (`npx tsx scripts/audit/directions-shots.mts`) | `docs/audit/directions/` |

Pages: landing (`/ru`, `/kk`, `/en`), studio (`/ru/workspace`), FLL planner (`/ru/fll`), field editor (`/ru/fll/editor`), 404.
File names: `<page>-<width>-<theme>.jpg`, e.g. `fll-plan-375-dark.jpg`.

> Note on the screenshots: in full-page captures on 375 px the sticky header and the "Перейти к содержимому" skip link sometimes appear in the middle of the page. This is a capture artifact of fixed elements (checked: the link is not focused), not a bug.

## The brief vs the current code — needs your decision

1. **Phases 5 and 6 are not done.** The brief says "phases 1–6 are done", but the 2D simulator (phase 5) and the robot library with LDraw instructions (phase 6) were never built — we stopped after phase 4 and then finished the FLL map and projection. Phase 8 (hero with a mini simulator), 9.3 and 12.3/12.5 depend on the simulator. **Question: do phases 5–6 first, or include the simulator in phase 8/9 and postpone the LDraw library?**
2. **Kazakh is already there** (phase 8.3): `ru/kk/en` dictionaries, a header switcher, browser-language detection in `proxy.ts`, and the AI answers in the interface language. What is left there is the Kazakh font bug below and a review of the texts.
3. `app/workspace/` is an empty leftover folder (the real page is `app/[lang]/workspace`).

## Summary — most important first

| # | Priority | Problem | Where |
|---|---|---|---|
| 1 | **P1** | **Headings in Kazakh mix two fonts**: Unbounded has no lowercase Kazakh letters (ә ғ қ ң ө ұ ү һ), so they come from a fallback font. JetBrains Mono (code) lacks ә ғ қ ң ұ һ. | every `/kk` page |
| 2 | **P1** | **No navigation on phones in the studio, FLL and editor**: below 1024 px the header has only the logo, languages, theme and "home"; there is no way to get from the studio to FLL and back. The burger menu exists only on the landing. | `workspace-375-*`, `fll-375-*` |
| 3 | P1 | **FLL page on a phone is ~4 350 px tall**, the main action ("Предложить план") is at the very bottom after the robot profile and calibration; the map is 316 px wide, mission numbers ≈ 4–8 px, hard to tap. | `fll-plan-375-dark.jpg` |
| 4 | P2 | An empty season shows **three warnings about the same thing** (header note, map overlay, missions note) and still shows the robot profile, calibration and a disabled "plan" button without saying why near the button. | `fll-1440-light.jpg` |
| 5 | P2 | **The editor is unusable on a phone** (tiny canvas, three rows of tools) and does not say so. | `fll-editor-375-*` |
| 6 | P2 | Mobile Lighthouse performance **84–89** (goal ≥ 90): LCP 3.8–4.4 s, the LCP element is text (fonts), ~100 KB unused JS on every page. | below |
| 7 | P2 | axe: the logo link has `aria-label="RoboEasy AI"` while its visible text reads "RoboEasyAI" (label-content-name-mismatch, serious), on every page. | header |
| 8 | P3 | Landing examples: lazy images on a black placeholder until loaded; the footer disclaimer mentions LEGO but not FIRST; the FLL section is called "FLL-помощник", not "ИИ-тренер". | landing |
| 9 | P3 | `globals.css` is one 2 820-line file with ad-hoc values; no shared components (buttons, cards, badges are CSS classes copied across pages). | code |

## UX

### Landing
- The hero shows a static block preview; there is no "task → blocks → robot drives" demo yet (phase 8.1).
- "С чего начать": images load lazily on a black background — on a slow connection the user sees three black boxes (`landing-ru-1440-light.jpg` shows them unloaded).
- A lot of sections with similar card grids ("Три шага", "Всё, чтобы робот поехал…", teachers) — the page is ~6 600 px on desktop; the FLL helper is only mentioned as a secondary button in the teachers block.
- Footer: "LEGO®, SPIKE™ … товарные знаки LEGO Group…", no mention of FIRST® and FIRST LEGO League.

### Studio (`/workspace`)
- First visit: the empty "Недавние" card sits between the form and the result.
- On a phone the result comes after the form and the history; the user has to scroll past the history to see the program.
- Good: clear empty result state with tips, errors explained (`rate_limited`, `not_configured`, network), share link, refine field.
- Missing for the target audience: templates by difficulty, an onboarding tour, a way to edit the program by hand (phases 8.2, 9).

### FLL planner (`/fll`)
- See summary #3 and #4. The page order (map → robot → calibration → plan) is the order of setup, not of use: a returning user wants "missions → plan" first.
- The season data is empty (by design, until the rulebook data is entered); the empty-map state now explains this and offers "upload photo/PDF" and "lay out in the editor".
- The "Использовать черновик из редактора" checkbox appears only after an editor draft exists — good; its long hint text wraps into three lines on phones.

### Field editor (`/fll/editor`)
- Desktop works (place, drag, rotate, resize, vertices, undo/redo, import/export, autosave).
- On a phone: tools wrap into three rows, the canvas is ~340 px wide; no "use a computer for the editor" notice.
- Mission numbers and labels are drawn in field millimetres, so at "whole field" zoom they are ~8 px.
- The inspector is long (all fields expanded); rarely used ones (route hints, notes in three languages) could be collapsed.

### 404
- Shows all three languages at once, no header or footer — fine, but it looks different from the rest of the site.

## Visual consistency
- **Fonts**: three families (Unbounded, Onest, JetBrains Mono) — Unbounded and JetBrains Mono do not cover Kazakh (summary #1).
- **Headings**: the FLL pages use `h1` + `.lead` like the landing, the studio starts with a card title instead of a page heading — the pages feel like different products.
- **Chips/badges**: `.format-badge` is used for statuses, counters and season info; in the FLL season row it is aligned with a margin hack.
- **Buttons**: sizes `btn-sm`/`btn-lg`/`btn-block` are mixed inside one panel (FLL plan section).
- **Field in the light theme**: the mat (#efede7) is almost the same tone as the card (#fff) — the field edge is weak.
- Icons: only lucide-react ✓.

## Accessibility
- **axe (WCAG 2.1 A/AA)**: 1 rule failing on every page — `label-content-name-mismatch` on the logo link. Everything else passes in both themes, including colour contrast.
- **Keyboard**: on every page all 25 Tab stops had a visible focus (outline or ring) ✓. The editor canvas is mouse/touch only, but objects can be selected from the list and edited in the inspector, arrows nudge, Delete removes, Ctrl+Z/Y ✓.
- **Touch targets**: FLL map missions on phones are far below 44×44 px; corner handles in the background dialog are fine.
- **Motion**: `prefers-reduced-motion` is respected in the CSS ✓.
- **Kazakh glyphs**: see summary #1 (a readability issue for kk users, not caught by axe).
- Lighthouse reported a 3.46:1 contrast on a block in the landing hero — that is a block captured mid fade-in animation (Lighthouse does not enable reduced motion); the final colours pass.

## Performance (Lighthouse 12, production build)

| Page | Mobile perf | Desktop perf | A11y | Best pr. | SEO | Mobile LCP | Mobile TBT |
|---|---|---|---|---|---|---|---|
| Landing `/ru` | **89** | 99 | 97–100 | 96 | 100 | 3.8 s | 40 ms |
| Studio `/ru/workspace` | **87** | 99 | 100 | 96 | 100 | 4.1 s | 60 ms |
| FLL `/ru/fll` | **88** | 100 | 100 | 96 | 100 | 3.9 s | 40 ms |
| Editor `/ru/fll/editor` | **84** | 99 | 100 | 96 | 63* | 4.4 s | 70 ms |

\* the editor is `noindex` on purpose.

- **LCP is text** (`.hero-sub`, `.lead`, the textarea placeholder) — it waits for web fonts: 3 families, Unbounded is a large variable font with Cyrillic subsets.
- **Unused JS ≈ 70–130 KB** on every page (one shared chunk), **legacy JS 13 KB** (polyfills for old browsers), render-blocking CSS ~150 ms (one big stylesheet).
- Total transfer 500–700 KB; CLS 0–0.02 ✓.
- Best practices 96: a 404 for `/_vercel/insights/script.js` — Vercel Analytics exists only on Vercel; locally it should not be loaded.
- What should bring mobile to ≥ 90: one or two font families with fewer weights, `preload` only for the heading font, split the studio/planner client components, drop legacy polyfills (browserslist), lighter CSS.

## Other findings
- `public/` has unused files from the original scaffold: `placeholder*.{png,jpg,svg}`, `placeholder-logo.*`, `placeholder-user.jpg`, `icon-dark-32x32.png`, `icon-light-32x32.png`, and PNG copies of the example images (`line-follower.png`, `sumo-bot.png`, `color-sorter.png` — the site uses the `.webp` versions).
- `app/workspace/` — empty folder.

---

## Visual directions — choose one

All three: no LEGO/FIRST logos, fonts or artwork; block colours by category (movement, motors, sensors, control, sound/light); light and dark theme; fonts **checked with Kazakh letters** (specimen at the top of each page); lucide icons. Open the HTML in a browser or see the PNGs.

### A · «Мастерская» — evolution of the current style
`directions/a.html` · `a-1440.png` · `a-390.png`
- **Idea**: warm "paper" and ink, signal yellow accent, calm and tidy. Works for children and for teachers. Least rework.
- **Fonts**: Onest 800 (headings) + Onest (text) + IBM Plex Mono (code). Unbounded stays only in the Latin logo.
- **Palette** (light / dark): bg `#F7F5EF` / `#0D0F12`, surface `#FFFFFF` / `#161A20`, text `#16181D` / `#F2F4F7`, accent `#FFC83D` / `#FFD23F`, link `#0A7BB4` / `#62C8F2`.
- **Contrast**: text 16–17:1, secondary text 7–8:1, links 4.7 / 9.2:1, all block colours with dark text ≥ 5.7:1 ✓.

### B · «Конструктор» — playful and bright
`directions/b.html` · `b-1440.png` · `b-390.png`
- **Idea**: thick outlines, hard offset shadows, buttons that "press", dotted background like a parts grid (no studs, no logos), rounded fonts. Best for 9–12-year-olds and hackathon demos; louder for teachers.
- **Fonts**: Rubik (headings) + Nunito (text) + IBM Plex Mono.
- **Palette**: bg `#FFF9EE` / `#141826`, surface `#FFFFFF` / `#1E2436`, text `#1B1F2A` / `#FFF7E8`, accent `#FFC531`, link `#2F6FED` / `#8FB3FF`; blocks: red `#E8442E`, blue `#2F6FED`, green `#2BB673`, violet `#A55EEA`.
- **Contrast**: fine, except the blue motor block with dark text 4.14:1 — needs white text or a lighter blue in 7.2.

### C · «Лаборатория» — engineering blueprint
`directions/c.html` · `c-1440.png` · `c-390.png`
- **Idea**: deep navy with millimetre grid, thin lines, monospace labels and coordinates; light theme = tracing paper. Strongest on pitches and projectors, for 12–14 and coaches; colder for younger kids.
- **Fonts**: IBM Plex Sans (headings and text) + IBM Plex Mono.
- **Palette**: bg `#F2F6FB` / `#0A1328`, surface `#FFFFFF` / `#0F1C38`, text `#0B1530` / `#E6F1FF`, accent `#0A84C6` / `#38D9F5`; softer block colours (coral, sky blue, lavender, mint).
- **Contrast**: fine, except the light-theme primary button (white on `#0A84C6`) 4.09:1 — darken to about `#0A73B0` in 7.2.

### Recommendation
**A** if the main users are classes and teachers and you want the least risk; **B** if the priority is kids 9–12 and demos; **C** if the priority is pitches and older FLL teams. A middle option is possible too: A's calm layout with B's pressable buttons and brighter block colours.

**Please choose A, B or C (or a mix), and answer the question about phases 5–6 above.** Phase 7.2 starts after that.
