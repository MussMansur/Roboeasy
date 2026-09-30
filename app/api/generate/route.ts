import { ApiError, GoogleGenAI } from '@google/genai'
import type { NextRequest } from 'next/server'

import { type Format, type GenerateErrorCode, type GenerateResponse, PROMPT_MAX } from '@/lib/api-types'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import type { RobotConfig } from '@/lib/spike/program'
import { type Lang, blocksSystemPrompt, pythonSystemPrompt, userMessage } from '@/lib/spike/prompts'
import { checkPython, cleanPython, programToPython } from '@/lib/spike/python'
import { PROGRAM_JSON_SCHEMA, PYTHON_JSON_SCHEMA, parseProgram, parsePythonAnswer, parseRobot } from '@/lib/spike/schema'

export const maxDuration = 60

/** GEMINI_MODEL is tried first; the others are fallbacks for overload (503) or quota (429). */
const MODELS = [...new Set([process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'])]
const ATTEMPT_TIMEOUT_MS = 40_000
/** Stay under maxDuration so the client gets a proper error instead of a platform timeout. */
const TOTAL_TIMEOUT_MS = 55_000
const MAX_BODY_BYTES = 64_000
const RATE_LIMIT = { requests: 10, windowMs: 60_000 }
const LANGS: readonly Lang[] = ['ru', 'kk', 'en']

interface ParsedRequest {
  prompt: string
  format: Format
  lang: Lang
  robot: RobotConfig
  previous?: { kind: 'program' | 'code'; value: string }
}

function reply(body: GenerateResponse, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers })
}

function fail(error: GenerateErrorCode, status: number, retryAfter?: number) {
  return reply({ ok: false, error, retryAfter }, status, retryAfter ? { 'Retry-After': String(retryAfter) } : undefined)
}

function parseRequest(body: unknown): ParsedRequest | { error: GenerateErrorCode } {
  if (typeof body !== 'object' || body === null) return { error: 'bad_request' }
  const b = body as Record<string, unknown>
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : ''
  if (prompt.length < 2) return { error: 'bad_request' }
  if (prompt.length > PROMPT_MAX) return { error: 'prompt_too_long' }
  const format: Format = b.format === 'python' ? 'python' : 'blocks'
  const lang = LANGS.includes(b.lang as Lang) ? (b.lang as Lang) : 'ru'
  const robot = parseRobot(b.robot)

  let previous: ParsedRequest['previous']
  const prev = typeof b.previous === 'object' && b.previous !== null ? (b.previous as Record<string, unknown>) : null
  if (prev && format === 'blocks' && prev.program) {
    const program = parseProgram(prev.program, robot)
    if (program.ok) previous = { kind: 'program', value: JSON.stringify(program.value) }
  } else if (prev && format === 'python' && typeof prev.code === 'string' && prev.code.trim()) {
    previous = { kind: 'code', value: prev.code.slice(0, 12_000) }
  }
  return { prompt, format, lang, robot, previous }
}

class GenerationError extends Error {
  constructor(readonly code: GenerateErrorCode) {
    super(code)
  }
}

/** Asks Gemini for a JSON object, falling back to the next model when one is unavailable. */
async function askGemini(
  ai: GoogleGenAI,
  system: string,
  contents: string,
  schema: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  let busy = false
  for (const model of MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: system,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          abortSignal: AbortSignal.any([signal, AbortSignal.timeout(ATTEMPT_TIMEOUT_MS)]),
        },
      })
      const parsed = parseJsonObject(res.text ?? '')
      if (parsed) return parsed
      console.error(`[generate] ${model} returned invalid JSON`)
    } catch (error) {
      if (signal.aborted) throw error
      console.error(`[generate] ${model} failed:`, error instanceof Error ? error.message : error)
      // Invalid requests fail the same way on every model.
      if (error instanceof ApiError && error.status === 400) break
      busy ||= !(error instanceof ApiError) || [429, 500, 503, 504].includes(error.status)
    }
  }
  throw new GenerationError(busy ? 'ai_busy' : 'ai_failed')
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Asks the model again once, with the validation error, if the first answer is invalid. */
function retryMessage(message: string, problems: string): string {
  return `${message}

Your previous answer was rejected:
${problems}
Return the complete corrected JSON object.`
}

async function generateBlocks(ai: GoogleGenAI, req: ParsedRequest, signal: AbortSignal): Promise<GenerateResponse> {
  const system = blocksSystemPrompt(req.robot, req.lang)
  const message = userMessage(req.prompt, req.previous)
  let parsed = parseProgram(await askGemini(ai, system, message, PROGRAM_JSON_SCHEMA, signal), req.robot)
  if (!parsed.ok) {
    console.warn('[generate] invalid program, retrying:', parsed.error)
    parsed = parseProgram(await askGemini(ai, system, retryMessage(message, parsed.error), PROGRAM_JSON_SCHEMA, signal), req.robot)
  }
  if (!parsed.ok) {
    console.error('[generate] invalid program after retry:', parsed.error)
    throw new GenerationError('empty_program')
  }
  const program = parsed.value
  return {
    ok: true,
    format: 'blocks',
    title: program.title,
    description: program.description,
    program,
    python: programToPython(program, req.robot),
    warnings: [],
  }
}

async function generatePython(ai: GoogleGenAI, req: ParsedRequest, signal: AbortSignal): Promise<GenerateResponse> {
  const system = pythonSystemPrompt(req.robot, req.lang)
  const message = userMessage(req.prompt, req.previous)

  const attempt = async (text: string) => {
    const parsed = parsePythonAnswer(await askGemini(ai, system, text, PYTHON_JSON_SCHEMA, signal))
    if (!parsed.ok) return { answer: null, problems: parsed.error, issues: [] as string[] }
    const answer = { ...parsed.value, code: cleanPython(parsed.value.code) }
    const issues = checkPython(answer.code)
    return { answer, problems: issues.join('; '), issues }
  }

  let best = await attempt(message)
  if (!best.answer || best.issues.length) {
    const retry = await attempt(retryMessage(message, best.problems))
    if (retry.answer && (!best.answer || retry.issues.length < best.issues.length)) best = retry
  }
  if (!best.answer) {
    console.error('[generate] invalid Python answer after retry:', best.problems)
    throw new GenerationError('empty_program')
  }
  return { ok: true, format: 'python', ...best.answer, warnings: best.issues }
}

/** Lets the UI show whether the AI is configured without exposing anything else. */
export function GET() {
  const key = process.env.GEMINI_API_KEY
  return Response.json({ configured: Boolean(key && key !== 'YOUR_API_KEY_HERE') })
}

export async function POST(req: NextRequest) {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail('bad_request', 413)
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('bad_request', 400)
  }
  const parsed = parseRequest(body)
  if ('error' in parsed) return fail(parsed.error, 400)

  const limit = rateLimit(clientKey(req.headers), RATE_LIMIT.requests, RATE_LIMIT.windowMs)
  if (!limit.ok) return fail('rate_limited', 429, limit.retryAfterSeconds)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') return fail('not_configured', 503)

  const ai = new GoogleGenAI({ apiKey })
  const deadline = AbortSignal.timeout(TOTAL_TIMEOUT_MS)
  const signal = AbortSignal.any([req.signal, deadline])
  try {
    const result = parsed.format === 'python' ? await generatePython(ai, parsed, signal) : await generateBlocks(ai, parsed, signal)
    return reply(result)
  } catch (error) {
    if (error instanceof GenerationError) return fail(error.code, error.code === 'ai_busy' ? 503 : 502)
    if (deadline.aborted) return fail('ai_busy', 504)
    if (req.signal.aborted) return fail('ai_failed', 499)
    console.error('[generate] unexpected error:', error)
    return fail('ai_failed', 500)
  }
}
