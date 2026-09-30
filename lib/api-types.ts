import type { Program, RobotConfig } from './dsl/types'
import type { Lang } from './spike/prompts'

export type Format = 'blocks' | 'python'

export interface GenerateRequest {
  prompt: string
  format: Format
  lang: Lang
  robot?: Partial<RobotConfig>
  /** The current result, when the user asks to change it. */
  previous?: { program?: Program; code?: string }
}

export type GenerateErrorCode =
  | 'bad_request'
  | 'prompt_too_long'
  | 'rate_limited'
  | 'not_configured'
  | 'ai_busy'
  | 'ai_failed'
  | 'empty_program'

export type GenerateResponse =
  | { ok: true; format: 'blocks'; title: string; description: string; program: Program; python: string; warnings: string[] }
  | { ok: true; format: 'python'; title: string; description: string; code: string; warnings: string[] }
  | { ok: false; error: GenerateErrorCode; retryAfter?: number }

export const PROMPT_MAX = 800
