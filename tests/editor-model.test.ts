import { describe, expect, it } from 'vitest'

import {
  addForbiddenZone,
  addLaunchArea,
  addMission,
  commit,
  duplicateItem,
  getItem,
  initHistory,
  moveItem,
  redo,
  removeItem,
  renameItem,
  seasonIssues,
  seasonToJson,
  snap,
  toggleShapeKind,
  undo,
  uniqueId,
  validateSeason,
} from '../lib/fll/editor-model'
import { type Season, parseSeason, safeParseSeason } from '../lib/fll/season'

const empty: Season = parseSeason({
  schemaVersion: 2,
  id: 'draft',
  name: { ru: 'Черновик', en: 'Draft' },
  years: '2026–2027',
  status: 'current',
  edition: 'founders',
  platform: 'spike',
  field: { widthMm: 2362, heightMm: 1143 },
  launchAreas: [],
  missions: [],
})

describe('editor model', () => {
  it('adds objects with unique ids and placeholder data marked todo', () => {
    let [s, a] = addMission(empty, { x: 500, y: 500 })
    ;[s] = addMission(s, { x: 900, y: 500 })
    expect(s.missions.map((m) => [m.id, m.number])).toEqual([
      ['M01', 1],
      ['M02', 2],
    ])
    expect(getItem(s, 'mission', a.id)).toMatchObject({ todo: true, points: 0, name: { ru: '', en: '' } })
    ;[s] = addLaunchArea(s, { x: 200, y: 150 })
    ;[s] = addForbiddenZone(s, { x: 1200, y: 600 })
    expect(s.launchAreas[0].id).toBe('L1')
    expect(s.forbiddenZones[0].id).toBe('Z1')
    expect(uniqueId('M', ['M01', 'M03'])).toBe('M02')
    // What the editor produces must pass the same validation as shipped files.
    expect(validateSeason(s)).toEqual({ ok: true })
    const roundTrip = safeParseSeason(JSON.parse(seasonToJson(s)))
    expect(roundTrip.ok && roundTrip.season).toEqual(s)
  })

  it('moves a launch area together with its start pose', () => {
    const [s, sel] = addLaunchArea(empty, { x: 200, y: 150 })
    const moved = getItem(moveItem(s, sel, 50, -20), 'launch', sel.id)!
    expect([moved.x, moved.y, moved.start.x, moved.start.y]).toEqual([250, 130, 250, 130])
  })

  it('renames only to free ids and duplicates with a new id', () => {
    let [s, sel] = addMission(empty, { x: 500, y: 500 })
    ;[s] = addMission(s, { x: 900, y: 500 })
    expect(renameItem(s, sel, 'M02')).toBeNull()
    expect(renameItem(s, sel, '  ')).toBeNull()
    expect(renameItem(s, sel, 'M10')?.missions[0].id).toBe('M10')
    const dup = duplicateItem(s, sel)!
    expect(dup[1].id).toBe('M03')
    expect(getItem(dup[0], 'mission', 'M03')).toMatchObject({ x: 560, y: 440, number: 3 })
    expect(removeItem(dup[0], dup[1]).missions).toHaveLength(2)
  })

  it('converts shapes between rectangle and polygon', () => {
    const poly = toggleShapeKind({ kind: 'rect', width: 200, height: 100 })
    expect(poly).toEqual({
      kind: 'polygon',
      points: [
        { x: -100, y: -50 },
        { x: 100, y: -50 },
        { x: 100, y: 50 },
        { x: -100, y: 50 },
      ],
    })
    expect(toggleShapeKind(poly)).toEqual({ kind: 'rect', width: 200, height: 100 })
  })

  it('snaps to the grid', () => {
    expect(snap(74, 50)).toBe(50)
    expect(snap(76, 50)).toBe(100)
    expect(snap(12.6, 0)).toBe(13)
  })

  it('reports objects outside the field and missions without names', () => {
    const [s, sel] = addMission(empty, { x: 20, y: 500 })
    expect(seasonIssues(s)).toEqual([
      { kind: 'noName', sel },
      { kind: 'outside', sel },
    ])
  })
})

describe('undo history', () => {
  it('undoes and redoes; commits with the same key are one step', () => {
    let h = initHistory(1)
    h = commit(h, 2)
    h = commit(h, 3, 'drag')
    h = commit(h, 4, 'drag')
    h = commit(h, 5, 'drag')
    expect(h.past).toEqual([1, 2])
    h = undo(h)
    expect(h.present).toBe(2)
    h = undo(h)
    expect(h.present).toBe(1)
    expect(undo(h)).toBe(h)
    h = redo(h)
    expect(h.present).toBe(2)
    // A new change clears the redo stack.
    h = commit(h, 9)
    expect(h.future).toEqual([])
    expect(redo(h)).toBe(h)
    // After undo the same key starts a new step.
    h = commit(undo(commit(h, 10, 'k')), 11, 'k')
    expect(h.past.at(-1)).toBe(9)
  })
})
