/**
 * User field backgrounds: a photo, scan or PDF of the mat the team has
 * themselves. Stored only in this browser (IndexedDB, one per season) and never
 * uploaded — the official field artwork belongs to FIRST/LEGO.
 */

import { idbDelete, idbGet, idbSet } from '../idb'
import { type MatCorners, isConvexQuad, rectify } from './homography'

export interface FieldBackground {
  version: 1
  fileName: string
  /** The picture as uploaded (a PDF is stored as its first page rendered to PNG). */
  source: Blob
  sourceWidth: number
  sourceHeight: number
  /** Mat corners on the source picture: bottom-left, bottom-right, top-right, top-left. */
  corners: MatCorners
  /** The mat seen from above, stretched to the field rectangle. */
  rectified: Blob
  opacity: number
  updatedAt: number
}

/** Longest side of the picture we keep; larger photos are scaled down. */
const MAX_SOURCE_PX = 3200
/** Pixels per mm of the rectified image. */
const RECTIFIED_PX_PER_MM = 1
export const MAX_FILE_BYTES = 40 * 1024 * 1024

export const loadBackground = (seasonId: string) => idbGet<FieldBackground>('backgrounds', seasonId)
export const saveBackground = (seasonId: string, bg: FieldBackground) => idbSet('backgrounds', seasonId, bg)
export const deleteBackground = (seasonId: string) => idbDelete('backgrounds', seasonId)

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas is empty'))), type, quality))
}

function canvas2d(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas is not available')
  return [canvas, ctx]
}

let pdfWorker: Worker | null = null

/** Renders the first page of a PDF into a PNG. pdf.js is loaded only when needed. */
async function pdfToPng(file: Blob): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist')
  if (!pdfWorker) {
    pdfWorker = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' })
    pdfjs.GlobalWorkerOptions.workerPort = pdfWorker
  }
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const doc = await task.promise
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: Math.min(4, MAX_SOURCE_PX / Math.max(base.width, base.height)) })
    const [canvas, ctx] = canvas2d(Math.round(viewport.width), Math.round(viewport.height))
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    return canvasToBlob(canvas)
  } finally {
    void task.destroy()
  }
}

/** Turns an uploaded file into a picture no larger than MAX_SOURCE_PX. */
export async function readPicture(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (file.size > MAX_FILE_BYTES) throw new Error('file too large')
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const input = isPdf ? await pdfToPng(file) : file
  const bitmap = await createImageBitmap(input)
  try {
    const scale = Math.min(1, MAX_SOURCE_PX / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && isPdf) return { blob: input, width: bitmap.width, height: bitmap.height }
    const [canvas, ctx] = canvas2d(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale))
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return { blob: await canvasToBlob(canvas, 'image/jpeg', 0.9), width: canvas.width, height: canvas.height }
  } finally {
    bitmap.close()
  }
}

/** Warps the marked mat to the field rectangle (top of the image = far side of the mat). */
export async function rectifyPicture(source: Blob, corners: MatCorners, field: { widthMm: number; heightMm: number }): Promise<Blob> {
  if (!isConvexQuad(corners)) throw new Error('corners do not form a convex quadrilateral')
  const bitmap = await createImageBitmap(source)
  try {
    const [srcCanvas, srcCtx] = canvas2d(bitmap.width, bitmap.height)
    srcCtx.drawImage(bitmap, 0, 0)
    const src = srcCtx.getImageData(0, 0, bitmap.width, bitmap.height)
    const width = Math.round(field.widthMm * RECTIFIED_PX_PER_MM)
    const height = Math.round(field.heightMm * RECTIFIED_PX_PER_MM)
    const out = rectify(src, corners, width, height)
    if (!out) throw new Error('corners are degenerate')
    const [canvas, ctx] = canvas2d(width, height)
    ctx.putImageData(new ImageData(out.data as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0)
    srcCanvas.width = 0
    return canvasToBlob(canvas, 'image/jpeg', 0.88)
  } finally {
    bitmap.close()
  }
}
