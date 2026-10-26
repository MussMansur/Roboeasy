/**
 * Course content loader. The course map is bundled (the path map needs it
 * in the browser); lesson files are read on the server at build time, so
 * adding a lesson is adding a JSON file plus its entry in course.json.
 */

import fs from 'node:fs'
import path from 'node:path'

import courseJson from '../../content/learn/course.json'
import { countSteps } from '../dsl/types'
import { type Course, type Lesson, type LessonRef, courseSchema, lessonSchema } from './schema'

const LESSONS_DIR = path.join(process.cwd(), 'content', 'learn', 'lessons')

export const COURSE: Course = courseSchema.parse(courseJson)

export function findLessonRef(id: string): { track: Course['tracks'][number]; unit: Course['tracks'][number]['units'][number]; ref: LessonRef } | null {
  for (const track of COURSE.tracks)
    for (const unit of track.units) {
      const ref = unit.lessons.find((l) => l.id === id)
      if (ref) return { track, unit, ref }
    }
  return null
}

export function readyLessonIds(): string[] {
  return COURSE.tracks.flatMap((t) => t.units.flatMap((u) => u.lessons.filter((l) => l.status === 'ready').map((l) => l.id)))
}

const cache = new Map<string, Lesson>()

/** Reads and validates a lesson file (throws on invalid content). */
export function readLesson(id: string): Lesson | null {
  if (!/^[a-z0-9-]+$/.test(id)) return null
  const hit = cache.get(id)
  if (hit) return hit
  const file = path.join(LESSONS_DIR, `${id}.json`)
  if (!fs.existsSync(file)) return null
  const lesson = lessonSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')))
  cache.set(id, lesson)
  return lesson
}

/** What the browser gets: no reference solutions, only their size. */
export type ClientLesson = Omit<Lesson, 'steps'> & { steps: ClientStep[] }
export type ClientStep = Lesson['steps'][number] extends infer S ? (S extends { reference?: unknown } ? Omit<S, 'reference'> & { referenceBlocks?: number } : S) : never

export function toClientLesson(lesson: Lesson): ClientLesson {
  return {
    ...lesson,
    steps: lesson.steps.map((s) => {
      if ('reference' in s) {
        const { reference, ...rest } = s
        return { ...rest, referenceBlocks: reference ? countSteps(reference) : undefined }
      }
      return s
    }) as ClientStep[],
  }
}
