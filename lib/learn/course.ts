/** The course map, bundled for the browser too (no file system access here, unlike content.ts). */

import courseJson from '../../content/learn/course.json'
import { type Course, courseSchema } from './schema'

export const COURSE: Course = courseSchema.parse(courseJson)

export type Track = Course['tracks'][number]

export function findTrack(id: string): Track | undefined {
  return COURSE.tracks.find((t) => t.id === id)
}

export function findLessonRef(id: string): { track: Track; unit: Track['units'][number]; ref: Track['units'][number]['lessons'][number] } | null {
  for (const track of COURSE.tracks)
    for (const unit of track.units) {
      const ref = unit.lessons.find((l) => l.id === id)
      if (ref) return { track, unit, ref }
    }
  return null
}
