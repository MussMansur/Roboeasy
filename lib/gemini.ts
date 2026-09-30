/**
 * Shared Gemini access for the API routes: JSON answers constrained by a
 * JSON Schema, model fallbacks, per-attempt timeouts and error mapping.
 * Server-only (reads GEMINI_API_KEY).
 */

import { ApiError, GoogleGenAI } from '@google/genai'

/** GEMINI_MODEL is tried first; the others are fallbacks for overload (503) or quota (429). */
const MODELS = [...new Set([process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'])]
const ATTEMPT_TIMEOUT_MS = 40_000

/** `busy`: overload, quota or timeout (try later). `failed`: the model could not produce valid output. */
export class GeminiError extends Error {
  constructor(readonly kind: 'busy' | 'failed') {
    super(`gemini ${kind}`)
  }
}

export function geminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY
  return Boolean(key && key !== 'YOUR_API_KEY_HERE')
}

export function createGemini(): GoogleGenAI | null {
  return geminiConfigured() ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Asks Gemini for a JSON object matching `schema`, falling back to the next model when one is unavailable. */
export async function askGemini(
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
      console.error(`[gemini] ${model} returned invalid JSON`)
    } catch (error) {
      if (signal.aborted) throw error
      console.error(`[gemini] ${model} failed:`, error instanceof Error ? error.message : error)
      // Invalid requests fail the same way on every model.
      if (error instanceof ApiError && error.status === 400) break
      busy ||= !(error instanceof ApiError) || [429, 500, 503, 504].includes(error.status)
    }
  }
  throw new GeminiError(busy ? 'busy' : 'failed')
}

/** Asks the model again once, with the validation error, if the first answer is invalid. */
export function retryMessage(message: string, problems: string): string {
  return `${message}\n\nYour previous answer was rejected:\n${problems}\nReturn the complete corrected JSON object.`
}
