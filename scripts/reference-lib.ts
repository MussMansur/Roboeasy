/**
 * Reads reference .llsp3 files exported from the LEGO SPIKE App and compares
 * the structure of their blocks with what our compiler emits.
 *
 * .llsp3 (zip) → scratch.sb3 (zip) → project.json → targets[].blocks
 */

import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'

import { buildProject, type ScratchBlock } from '../lib/dsl/compile-blocks'
import type { Program } from '../lib/dsl/types'

type Blocks = Record<string, ScratchBlock>

/** Inputs as kinds, e.g. `shadow:flippermove_custom-icon-direction`, `number`, `text`, `block`. */
export interface BlockShape {
  opcode: string
  inputs: Record<string, string>
  fields: string[]
  example: ScratchBlock
}

export const REFERENCE_DIR = path.resolve(process.cwd(), 'reference')

export function referenceFiles(dir = REFERENCE_DIR): string[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.llsp3'))
    .map((f) => path.join(dir, f))
}

export async function readProjectBlocks(file: string): Promise<Blocks> {
  const outer = await JSZip.loadAsync(fs.readFileSync(file))
  const sb3File = outer.file('scratch.sb3')
  if (!sb3File) throw new Error(`${path.basename(file)} has no scratch.sb3 (is it a Python project?)`)
  const sb3 = await JSZip.loadAsync(await sb3File.async('uint8array'))
  const projectFile = sb3.file('project.json')
  if (!projectFile) throw new Error(`${path.basename(file)} has no project.json`)
  const project = JSON.parse(await projectFile.async('string')) as { targets: { blocks: Record<string, ScratchBlock | unknown[]> }[] }
  const blocks: Blocks = {}
  for (const target of project.targets) {
    for (const [id, b] of Object.entries(target.blocks)) if (!Array.isArray(b)) blocks[id] = b as ScratchBlock
  }
  return blocks
}

/** Primitive type codes used by Scratch inputs. */
const PRIMITIVE: Record<number, string> = { 4: 'number', 5: 'number', 6: 'number', 7: 'number', 8: 'number', 9: 'color', 10: 'text', 11: 'broadcast', 12: 'variable', 13: 'list' }

function describeInput(input: unknown[], blocks: Blocks): string {
  // [1, shadow|primitive], [2, block], [3, block, shadow|primitive]
  const [kind, first, second] = input
  const slot = kind === 3 ? second : first
  if (Array.isArray(slot)) return PRIMITIVE[slot[0] as number] ?? 'primitive'
  if (typeof slot === 'string' && blocks[slot]) return blocks[slot].shadow ? `shadow:${blocks[slot].opcode}` : 'block'
  return kind === 2 ? 'block' : 'empty'
}

export function shapesOf(blocks: Blocks): Map<string, BlockShape> {
  const shapes = new Map<string, BlockShape>()
  for (const b of Object.values(blocks)) {
    const inputs: Record<string, string> = {}
    for (const [name, input] of Object.entries(b.inputs)) inputs[name] = describeInput(input as unknown[], blocks)
    const known = shapes.get(b.opcode)
    if (known) {
      // Merge: the same block may appear with an input left empty in one place.
      for (const [k, v] of Object.entries(inputs)) if (!known.inputs[k] || known.inputs[k] === 'empty') known.inputs[k] = v
      known.fields = [...new Set([...known.fields, ...Object.keys(b.fields)])].sort()
    } else {
      shapes.set(b.opcode, { opcode: b.opcode, inputs, fields: Object.keys(b.fields).sort(), example: b })
    }
  }
  return shapes
}

export async function referenceShapes(files = referenceFiles()): Promise<Map<string, BlockShape>> {
  const all: Blocks = {}
  let n = 0
  for (const file of files) {
    for (const [id, b] of Object.entries(await readProjectBlocks(file))) all[`${n}:${id}`] = b
    n += 1
  }
  // Ids are prefixed per file, so rewrite references before describing inputs.
  const remapped: Blocks = {}
  for (const [key, b] of Object.entries(all)) {
    const prefix = key.slice(0, key.indexOf(':') + 1)
    const inputs: ScratchBlock['inputs'] = {}
    for (const [name, input] of Object.entries(b.inputs)) {
      inputs[name] = (input as unknown[]).map((v, i) => (i > 0 && typeof v === 'string' ? prefix + v : v)) as ScratchBlock['inputs'][string]
    }
    remapped[key] = { ...b, inputs }
  }
  return shapesOf(remapped)
}

export function ourShapes(program: Program): Map<string, BlockShape> {
  const project = buildProject(program)
  return shapesOf((project.targets[1] as { blocks: Blocks }).blocks)
}

/** Differences between our block and the reference one (input names, input kinds, field names). */
export function compareShapes(ours: BlockShape, ref: BlockShape): string[] {
  const issues: string[] = []
  for (const [name, kind] of Object.entries(ours.inputs)) {
    const refKind = ref.inputs[name]
    if (!refKind) issues.push(`${ours.opcode}: input ${name} does not exist in the reference`)
    else if (refKind !== kind && refKind !== 'empty' && refKind !== 'block' && kind !== 'block') issues.push(`${ours.opcode}: input ${name} is ${kind}, reference has ${refKind}`)
  }
  for (const name of Object.keys(ref.inputs)) if (!(name in ours.inputs)) issues.push(`${ours.opcode}: reference has input ${name} that we do not set`)
  for (const f of ours.fields) if (!ref.fields.includes(f)) issues.push(`${ours.opcode}: field ${f} does not exist in the reference`)
  for (const f of ref.fields) if (!ours.fields.includes(f)) issues.push(`${ours.opcode}: reference has field ${f} that we do not set`)
  return issues
}
