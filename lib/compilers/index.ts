/**
 * Code generators by robot platform. The planner and the simulator work with
 * DSL programs for any platform; only turning a program into a file for the
 * robot's app is platform-specific. Platforms without an entry here (see
 * PLATFORMS in lib/fll/season.ts) get a "not supported yet" message in the UI.
 */

import type { Program, RobotProfile } from '../dsl/types'
import type { Platform } from '../fll/season'

export type CodeFormat = 'blocks' | 'python'

export interface PlatformCompiler {
  platform: Platform
  /** Formats the platform's app can open, the default first. */
  formats: readonly CodeFormat[]
  fileExtension: string
  /** Builds the project file. Heavy dependencies are loaded on demand. */
  pack(name: string, program: Program, robot: RobotProfile, format: CodeFormat): Promise<Blob>
}

const spike: PlatformCompiler = {
  platform: 'spike',
  formats: ['blocks', 'python'],
  fileExtension: '.llsp3',
  async pack(name, program, robot, format) {
    const { createLlsp3 } = await import('../spike/llsp3')
    if (format === 'blocks') return createLlsp3(name, { format: 'blocks', program, robot })
    const { programToPython } = await import('../dsl/compile-python')
    return createLlsp3(name, { format: 'python', code: programToPython(program, robot) })
  },
}

const COMPILERS: Partial<Record<Platform, PlatformCompiler>> = { spike }

export function compilerFor(platform: Platform): PlatformCompiler | null {
  return COMPILERS[platform] ?? null
}
