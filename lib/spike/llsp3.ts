/**
 * Packs a project into the `.llsp3` file the LEGO SPIKE App 3 opens.
 *
 * An .llsp3 is a ZIP with `manifest.json` + `icon.svg` and either
 *  - `scratch.sb3` (word blocks; itself a ZIP with `project.json` and assets), or
 *  - `projectbody.json` = `{"main": "<python source>"}` (Python).
 * The manifest mirrors what the SPIKE App writes for a new project.
 */

import JSZip from 'jszip'
import type { Program, RobotProfile } from '../dsl/types'
import { DEFAULT_ROBOT } from '../dsl/types'
import { EMPTY_SVG_ASSET, buildProject, randomId } from '../dsl/compile-blocks'

/** Project/block format version of SPIKE App 3 (`currentProjectVersion`). */
export const SPIKE_PROJECT_VERSION = 38

export type ProjectSource = { format: 'blocks'; program: Program; robot?: RobotProfile } | { format: 'python'; code: string }

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <rect width="60" height="60" rx="12" fill="#12151A"/>
  <rect x="12" y="18" width="36" height="26" rx="6" fill="#FFD000"/>
  <rect x="20" y="10" width="20" height="10" rx="4" fill="#FFD000"/>
  <circle cx="23" cy="31" r="4" fill="#12151A"/>
  <circle cx="37" cy="31" r="4" fill="#12151A"/>
  <rect x="22" y="38" width="16" height="3" rx="1.5" fill="#12151A"/>
</svg>`

export function buildManifest(name: string, source: ProjectSource, extensions: string[] = []) {
  const now = new Date().toISOString()
  const common = {
    appType: 'llsp3',
    autoDelete: false,
    created: now,
    id: randomId(12),
    lastsaved: now,
    size: 0,
    name,
    slotIndex: 0,
    workspaceX: 120,
    workspaceY: 120,
  }
  if (source.format === 'python') {
    return {
      type: 'python',
      ...common,
      zoomLevel: 0.5,
      hardware: { python: { type: 'flipper' } },
      state: {},
      extraFiles: [],
      lastConnectedHubType: 'flipper',
    }
  }
  return {
    type: 'word-blocks',
    ...common,
    zoomLevel: 0.675,
    showAllBlocks: false,
    version: SPIKE_PROJECT_VERSION,
    hardware: {},
    extensions,
    state: {},
    extraFiles: [],
    lastConnectedHubType: 'flipper',
  }
}

/** Keeps names readable in the SPIKE App while staying file-system safe. */
export function safeProjectName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)
  return cleaned || 'RoboEasy'
}

export async function createLlsp3(name: string, source: ProjectSource): Promise<Blob> {
  const zip = new JSZip()
  const projectName = safeProjectName(name)

  if (source.format === 'python') {
    zip.file('manifest.json', JSON.stringify(buildManifest(projectName, source)))
    zip.file('projectbody.json', JSON.stringify({ main: source.code }))
  } else {
    const project = buildProject(source.program, source.robot ?? DEFAULT_ROBOT)
    const sb3 = new JSZip()
    sb3.file('project.json', JSON.stringify(project))
    sb3.file(`${EMPTY_SVG_ASSET}.svg`, '')
    const sb3Data = await sb3.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
    zip.file('manifest.json', JSON.stringify(buildManifest(projectName, source, project.extensions)))
    zip.file('scratch.sb3', sb3Data)
  }
  zip.file('icon.svg', ICON_SVG)

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/zip' })
}
