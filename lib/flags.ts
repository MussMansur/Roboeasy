/**
 * A/B flags. A learner's variant is a stable hash of their anonymous id
 * and the experiment name, so it never changes between visits and needs no
 * server. Exposure is recorded nowhere yet (TODO(db): log the variant with
 * the funnel events to compare experiments).
 *
 * Overrides for testing: ?ab=experiment:variant in the URL (development).
 */

export const EXPERIMENTS = {
  /** Wording of the main button on /path: "Продолжить" vs naming the lesson. */
  'path-cta': ['continue', 'lesson-name'],
  /** Show the first lesson hint right after the first failed check, or only on request. */
  'auto-hint': ['off', 'after-first-fail'],
} as const satisfies Record<string, readonly string[]>

export type Experiment = keyof typeof EXPERIMENTS
export type Variant<E extends Experiment> = (typeof EXPERIMENTS)[E][number]

function hash(text: string): number {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

export function variantFor<E extends Experiment>(experiment: E, anonId: string | null | undefined, override?: string | null): Variant<E> {
  const variants = EXPERIMENTS[experiment] as readonly Variant<E>[]
  if (override) {
    const [name, value] = override.split(':')
    if (name === experiment && (variants as readonly string[]).includes(value)) return value as Variant<E>
  }
  if (!anonId) return variants[0]
  return variants[hash(`${experiment}:${anonId}`) % variants.length]
}
