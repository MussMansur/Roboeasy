'use client'

/**
 * Browser store for the learner's state (localStorage, synced between
 * tabs). Accounts and server sync come later; this module is the only place
 * that writes, so swapping the backend touches nothing else.
 */

import { useSyncExternalStore } from 'react'

import { EMPTY_STATE, type LearnState, type NewEvent, type Profile, appendEvents, parseState } from './state'

const KEY = 'roboeasy.learn.v1'

let state: LearnState | null = null
const listeners = new Set<() => void>()
/** Called after events are recorded with the state before and after (achievements, toasts). */
const recordHooks = new Set<(before: LearnState, after: LearnState) => void>()

function load(): LearnState {
  if (state) return state
  try {
    const raw = localStorage.getItem(KEY)
    state = raw ? parseState(JSON.parse(raw)) : EMPTY_STATE
  } catch {
    state = EMPTY_STATE
  }
  return state
}

function save(next: LearnState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or full storage: keep working in memory.
  }
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    state = null
    load()
    listeners.forEach((l) => l())
  })
}

export function getLearnState(): LearnState {
  return load()
}

export function subscribeLearn(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function onRecord(hook: (before: LearnState, after: LearnState) => void) {
  recordHooks.add(hook)
  return () => {
    recordHooks.delete(hook)
  }
}

export function record(events: NewEvent[]) {
  const before = load()
  const after = appendEvents(before, events)
  if (after === before) return
  save(after)
  recordHooks.forEach((h) => h(before, after))
}

export function setProfile(profile: Profile) {
  save({ ...load(), profile })
}

export function updateProfile(patch: Partial<Profile>) {
  const current = load()
  if (!current.profile) return
  save({ ...current, profile: { ...current.profile, ...patch } })
}

/** Replaces everything (import from a file). */
export function replaceState(next: LearnState) {
  save(next)
}

export function clearLearnState() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
  state = EMPTY_STATE
  listeners.forEach((l) => l())
}

/** The learner's state; empty on the server and on the first client render. */
export function useLearn(): LearnState {
  return useSyncExternalStore(subscribeLearn, getLearnState, () => EMPTY_STATE)
}
