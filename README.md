# RoboEasy AI

Describe a task in plain words — get a LEGO SPIKE Prime program (word blocks or Python) as a `.llsp3` file for the SPIKE App 3. UI in Russian, Kazakh and English.

## Run

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev                  # http://localhost:3000 → redirects to /ru, /kk or /en
```

`npm test` — unit tests (block generation is validated with `scratch-parser`, the same validator the SPIKE App uses). `npm run typecheck`, `npm run build`.

## How it works

- `app/api/generate/route.ts` — calls Gemini (JSON mode, model fallback, 55 s deadline, per-IP rate limit, input limits). Blocks mode returns a validated program; Python mode returns code checked for SPIKE 3 API compatibility (one automatic retry).
- `lib/spike/program.ts` — the block vocabulary and `sanitizeProgram` (whitelists ops/values, clamps numbers, limits size). AI output is never trusted.
- `lib/spike/scratch.ts` — builds the Scratch `project.json` with SPIKE App 3 opcodes (`flippermove_*`, `flippermotor_*`, `flippersensors_*`, …).
- `lib/spike/python.ts` — exact Python version of every block program + checks for AI-written Python.
- `lib/spike/llsp3.ts` — packs the `.llsp3` ZIP (manifest mirrors what SPIKE App 3 writes, `version: 38`).
- `lib/spike/prompts.ts` — system prompts with the robot's port configuration.
- `app/[lang]/` — landing and studio; `lib/i18n/` — dictionaries (`ru` is the source shape); `proxy.ts` — language redirect.

## Notes

- The rate limiter is in-memory (per server instance). Behind a proxy that does not set `x-forwarded-for`, all users share one bucket.
- LEGO® and SPIKE™ are trademarks of the LEGO Group, which does not sponsor or endorse this project.
