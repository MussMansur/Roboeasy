import JSZip from 'jszip'

const DEFAULT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="12" fill="#FFD928"/>
  <text x="50" y="58" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="14" fill="#171918">RoboEasy</text>
  <circle cx="35" cy="38" r="6" fill="#171918"/>
  <circle cx="65" cy="38" r="6" fill="#171918"/>
  <path d="M35 70 Q50 80 65 70" stroke="#171918" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`

export async function createLlsp3File(
  projectName: string,
  payload: any,
  format: 'blocks' | 'python'
): Promise<Blob> {
  const zip = new JSZip()

  const hardwareId = Math.random().toString(36).substring(2, 10)
  
  const manifest = {
    type: format === 'python' ? 'python' : 'word-blocks',
    appType: 'llsp3',
    autoDelete: false,
    created: new Date().toISOString(),
    id: Math.random().toString(36).substring(2, 10),
    lastsaved: new Date().toISOString(),
    size: 0,
    name: projectName,
    slotIndex: 0,
    workspaceX: 120,
    workspaceY: 120,
    zoomLevel: 0.5,
    hardware: format === 'python' ? { python: { type: 'flipper' } } : { [hardwareId]: { type: 'flipper' } },
    extensions: format === 'python' ? [] : ["flipperevents", "flippermotor", "flippermovement", "flippersensors"],
    state: { canvasDrawerOpen: true },
    extraFiles: []
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('icon.svg', DEFAULT_ICON_SVG)

  if (format === 'python') {
    zip.file('projectbody.json', JSON.stringify({ main: payload as string }))
  } else {
    zip.file('projectbody.json', JSON.stringify(payload, null, 2))
    const sb3Zip = new JSZip()
    sb3Zip.file('project.json', JSON.stringify(payload, null, 2))
    sb3Zip.file('deadc057000000000000000000000000.svg', '<svg></svg>')
    sb3Zip.file('1b8b032b06360a6cf7c31d86bddd144b.wav', '')
    const sb3Blob = await sb3Zip.generateAsync({ type: 'blob' })
    zip.file('scratch.sb3', sb3Blob)
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
