/**
 * Weekly challenges: one per ISO week (in the learner's time zone), the
 * same for everyone, picked in turn from content/learn/challenges.json
 * (server only: the file has the reference solutions; see challengeIndex).
 */

import challengesJson from '../../content/learn/challenges.json'
import { countSteps } from '../dsl/types'
import type { ClientStep } from './content'
import { challengeFileSchema } from './schema'

export const CHALLENGES = challengeFileSchema.parse(challengesJson).challenges
export type Challenge = (typeof CHALLENGES)[number]
export type ClientChallenge = Extract<ClientStep, { type: 'code' }>

/** Without reference solutions, like lessons. */
export function clientChallenges(): ClientChallenge[] {
  return CHALLENGES.map(({ reference, ...rest }) => ({ ...rest, referenceBlocks: countSteps(reference) }))
}
