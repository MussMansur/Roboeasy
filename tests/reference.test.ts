import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { createLlsp3 } from '../lib/spike/llsp3'
import { ALL_COMMANDS_PROGRAM } from '../scripts/extract-reference'
import { compareShapes, ourShapes, referenceFiles, referenceShapes } from '../scripts/reference-lib'

describe('reference tooling', () => {
  it('reads nested .llsp3 → scratch.sb3 → project.json and finds no differences with itself', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roboeasy-ref-'))
    const file = path.join(dir, 'self.llsp3')
    const blob = await createLlsp3('self', { format: 'blocks', program: ALL_COMMANDS_PROGRAM })
    fs.writeFileSync(file, Buffer.from(await blob.arrayBuffer()))

    const refs = await referenceShapes(referenceFiles(dir))
    const ours = ourShapes(ALL_COMMANDS_PROGRAM)
    expect([...refs.keys()].sort()).toEqual([...ours.keys()].sort())
    for (const [op, shape] of ours) expect(compareShapes(shape, refs.get(op)!)).toEqual([])
    fs.rmSync(dir, { recursive: true, force: true })
  })
})

const files = referenceFiles()

describe.skipIf(files.length === 0)('SPIKE App reference exports (./reference)', () => {
  it('match the structure of every block we emit', async () => {
    const refs = await referenceShapes(files)
    const issues = [...ourShapes(ALL_COMMANDS_PROGRAM)].flatMap(([op, shape]) => {
      const ref = refs.get(op)
      return ref ? compareShapes(shape, ref) : []
    })
    expect(issues).toEqual([])
  })
})
