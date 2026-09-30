# RoboEasy AI

Describe a task in plain words — get a LEGO SPIKE Prime program (word blocks or Python) as a `.llsp3` file for the SPIKE App 3. Includes an FLL run-strategy helper. UI in Russian, Kazakh and English.

## Run

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev                  # http://localhost:3000 → /ru, /kk or /en
```

| Command | What it does |
|---|---|
| `npm test` | vitest: DSL validation, both compilers, .llsp3 packing, FLL geometry and planning, Python snapshots |
| `npm run typecheck` | TypeScript strict |
| `npm run build` | production build |
| `npm run reference` | compares our blocks with SPIKE App exports in `reference/` (see `reference/README.md`) |

## Key principle

The AI only writes commands of a small DSL. Valid word blocks and Python are produced by our deterministic compilers; the AI never writes Scratch JSON. In the FLL helper the AI decides the strategy, while distances and angles are computed from the field coordinates by our code.

## Structure

- `lib/dsl/types.ts` — DSL commands (`Step`), robot profile (`RobotProfile`: ports, wheel/track in mm, calibration factors, attachments).
- `lib/dsl/schema.ts` — zod validation of everything untrusted (AI output, client data, robot profile) and the compact JSON Schema sent to Gemini as `responseJsonSchema`. Structure is strict (one retry with the error text), numbers are clamped.
- `lib/dsl/compile-blocks.ts` — DSL → Scratch `project.json` with SPIKE App 3 opcodes. `turn` uses the hub gyro (reset yaw → spin → wait until |yaw| > angle → stop, in steps of ≤ 90°).
- `lib/dsl/compile-python.ts` — DSL → SPIKE 3 MicroPython; checks for free Python (`runloop.run(main())`, allowed imports, no SPIKE 2 API).
- `lib/spike/llsp3.ts` — packs `.llsp3` exactly like the SPIKE App; `lib/spike/prompts.ts` — system prompts.
- `lib/gemini.ts` — Gemini client: JSON schema, model fallbacks, timeouts.
- `app/api/generate` — modes `blocks`, `python` (both DSL) and `python-free` (the AI writes Python).
- `lib/fll/*`, `data/seasons/*.json`, `app/api/fll/plan`, `app/[lang]/fll` — FLL helper: season data, route geometry (`path.ts`), runs (`run.ts`), calibration, AI planning with a deterministic fallback.
- `app/[lang]/` — landing, studio, FLL page; `lib/i18n/` — dictionaries (`ru` defines the shape); `proxy.ts` — language redirect.

## FLL season data

`data/seasons/template.json` is a template: only the mat size (2362 × 1143 mm) is real. Replace the example launch areas and missions (marked `todo`) with the season's field map: millimetres from the bottom-left corner, headings in degrees (0 = right, counterclockwise). `via` points let routes drive around models.

## Notes

- The rate limiter is in-memory (per server instance).
- Robot profile and history are stored in the browser's localStorage (profile schema is versioned; v1 is migrated).
- LEGO® and SPIKE™ are trademarks of the LEGO Group, which does not sponsor or endorse this project.
