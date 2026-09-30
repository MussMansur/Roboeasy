/**
 * Plane geometry for season shapes: local frames → field coordinates and
 * simple polygon tests (used by the planner, the editor and the simulator).
 */

import type { Mission, Point, Shape, Zone } from './season'

const RAD = Math.PI / 180

export function rotatePoint(p: Point, deg: number): Point {
  const c = Math.cos(deg * RAD)
  const s = Math.sin(deg * RAD)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }
}

/** A frame on the field: origin and rotation. */
export interface Frame {
  x: number
  y: number
  rotationDeg: number
}

/** Local point of `frame` → field point. */
export function toField(frame: Frame, p: Point): Point {
  const r = rotatePoint(p, frame.rotationDeg)
  return { x: frame.x + r.x, y: frame.y + r.y }
}

/** Field point → local point of `frame`. */
export function toLocal(frame: Frame, p: Point): Point {
  return rotatePoint({ x: p.x - frame.x, y: p.y - frame.y }, -frame.rotationDeg)
}

/** Polygon of a shape in its own frame (a rect is centered on the origin). */
export function shapePoints(shape: Shape): Point[] {
  if (shape.kind === 'polygon') return shape.points
  const w = shape.width / 2
  const h = shape.height / 2
  return [
    { x: -w, y: -h },
    { x: w, y: -h },
    { x: w, y: h },
    { x: -w, y: h },
  ]
}

export function placedPolygon(frame: Frame, shape: Shape): Point[] {
  return shapePoints(shape).map((p) => toField(frame, p))
}

export const zonePolygon = (zone: Zone) => placedPolygon(zone, zone.shape)

export const missionOutline = (m: Mission) => placedPolygon(m, m.outline)

/** Frame of the mission's action zone on the field. */
export function actionZoneFrame(m: Mission): Frame {
  const c = toField(m, { x: m.actionZone.dx, y: m.actionZone.dy })
  return { x: c.x, y: c.y, rotationDeg: m.rotationDeg + m.actionZone.rotationDeg }
}

export const actionZonePolygon = (m: Mission) => placedPolygon(actionZoneFrame(m), m.actionZone.shape)

/** Axis-aligned bounds. */
export function bounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  }
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

export function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const d1 = cross(b1, b2, a1)
  const d2 = cross(b1, b2, a2)
  const d3 = cross(a1, a2, b1)
  const d4 = cross(a1, a2, b2)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true
  const onSegment = (p: Point, q: Point, r: Point) =>
    Math.min(p.x, q.x) <= r.x && r.x <= Math.max(p.x, q.x) && Math.min(p.y, q.y) <= r.y && r.y <= Math.max(p.y, q.y)
  return (
    (d1 === 0 && onSegment(b1, b2, a1)) ||
    (d2 === 0 && onSegment(b1, b2, a2)) ||
    (d3 === 0 && onSegment(a1, a2, b1)) ||
    (d4 === 0 && onSegment(a1, a2, b2))
  )
}

/** True when two polygons overlap (edges cross or one contains the other). */
export function polygonsIntersect(a: Point[], b: Point[]): boolean {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentsIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true
    }
  }
  return pointInPolygon(a[0], b) || pointInPolygon(b[0], a)
}

/** True when the segment crosses or lies inside the polygon. */
export function segmentHitsPolygon(p1: Point, p2: Point, poly: Point[]): boolean {
  if (pointInPolygon(p1, poly) || pointInPolygon(p2, poly)) return true
  return poly.some((a, i) => segmentsIntersect(p1, p2, a, poly[(i + 1) % poly.length]))
}

/** SVG `points` attribute. */
export const svgPoints = (points: Point[]) => points.map((p) => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`).join(' ')
