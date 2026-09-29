/**
 * Client-side persistence for the studio: recent programs (localStorage)
 * and share links that carry a whole result in the URL hash (no server).
 */

import type { Format } from './api-types'
import { type Program, type RobotConfig, sanitizeProgram, sanitizeRobot } from './spike/program'
import { programToPython } from './spike/python'

export type StudioResult =
  | { format: 'blocks'; title: string; description: string; program: Program; python: string; robot: RobotConfig; warnings: string[] }
  | { format: 'python'; title: string; description: string; code: string; warnings: string[] }

export interface HistoryItem {
  id: string
  createdAt: number
  prompt: string
  result: StudioResult
}

const HISTORY_KEY = 'roboeasy.history.v1'
const ROBOT_KEY = 'roboeasy.robot.v1'
const FORMAT_KEY = 'roboeasy.format.v1'
const HISTORY_MAX = 12

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or disabled: the studio still works without persistence.
  }
}

/** Rebuilds a result from untrusted data (storage, share links). */
export function reviveResult(raw: unknown): StudioResult | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
  if (r.format === 'python' && typeof r.code === 'string' && r.code.trim()) {
    return { format: 'python', title: text(r.title, 60) || 'RoboEasy', description: text(r.description, 400), code: r.code.slice(0, 20_000), warnings: [] }
  }
  if (r.format === 'blocks') {
    const robot = sanitizeRobot(r.robot)
    const program = sanitizeProgram(r.program, robot)
    if (!program.steps.length) return null
    return { format: 'blocks', title: program.title, description: program.description, program, python: programToPython(program, robot), robot, warnings: [] }
  }
  return null
}

export function loadHistory(): HistoryItem[] {
  const items = read<unknown[]>(HISTORY_KEY)
  if (!Array.isArray(items)) return []
  return items
    .map((it) => {
      const item = it as Partial<HistoryItem>
      const result = reviveResult(item?.result)
      return result && typeof item.id === 'string'
        ? { id: item.id, createdAt: Number(item.createdAt) || Date.now(), prompt: String(item.prompt ?? ''), result }
        : null
    })
    .filter((x): x is HistoryItem => x !== null)
}

export function saveHistory(items: HistoryItem[]) {
  write(
    HISTORY_KEY,
    items.slice(0, HISTORY_MAX).map((it) => ({
      ...it,
      // The Python version of a block program is derived, no need to store it.
      result: it.result.format === 'blocks' ? { ...it.result, python: '' } : it.result,
    })),
  )
}

export function addToHistory(items: HistoryItem[], prompt: string, result: StudioResult): HistoryItem[] {
  const item: HistoryItem = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now(), prompt, result }
  return [item, ...items].slice(0, HISTORY_MAX)
}

export const loadRobot = (): RobotConfig | null => {
  const raw = read<unknown>(ROBOT_KEY)
  return raw ? sanitizeRobot(raw) : null
}
export const saveRobot = (robot: RobotConfig) => write(ROBOT_KEY, robot)
export const loadFormat = (): Format | null => {
  const f = read<string>(FORMAT_KEY)
  return f === 'blocks' || f === 'python' ? f : null
}
export const saveFormat = (format: Format) => write(FORMAT_KEY, format)

// ---------------------------------------------------------------------------
// Share links: #r=<base64url(deflate-raw(json))>
// ---------------------------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Share links are small; anything bigger is rejected instead of being inflated in memory. */
const SHARE_MAX_TOKEN = 40_000
const SHARE_MAX_BYTES = 200_000

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > SHARE_MAX_BYTES) {
      await reader.cancel()
      throw new Error('share payload too large')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

export async function encodeShare(result: StudioResult): Promise<string> {
  const payload =
    result.format === 'blocks'
      ? { format: 'blocks', program: result.program, robot: result.robot }
      : { format: 'python', title: result.title, description: result.description, code: result.code }
  const json = new TextEncoder().encode(JSON.stringify(payload))
  if (typeof CompressionStream === 'function') return `z${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`
  return `j${toBase64Url(json)}`
}

export async function decodeShare(token: string): Promise<StudioResult | null> {
  if (token.length > SHARE_MAX_TOKEN) return null
  try {
    const bytes = fromBase64Url(token.slice(1))
    const json = token[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes
    return reviveResult(JSON.parse(new TextDecoder().decode(json)))
  } catch {
    return null
  }
}
