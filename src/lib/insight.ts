/**
 * The OneContext AI contract.
 *
 * Shared by the serverless function and the browser: the function validates
 * against it before persisting or returning anything, and the panel renders it.
 * Nothing here imports the Supabase client or touches the DOM, so it is safe on
 * both sides and testable on its own.
 */

export type Confidence = 'low' | 'medium' | 'high'

export interface Insight {
  summary: string
  topics: string[]
  risks: string[]
  next_action: string
  confidence: Confidence
  /** Ids of the supplied events the model actually used. */
  source_event_ids: string[]
}

export interface ValidationSuccess {
  ok: true
  insight: Insight
  /**
   * Ids the model cited that were not among the supplied events. Kept out of the
   * insight and reported, rather than dropped silently: a model citing events
   * that do not exist is worth surfacing.
   */
  droppedSourceIds: string[]
}

export interface ValidationFailure {
  ok: false
  reason: string
}

export type ValidationResult = ValidationSuccess | ValidationFailure

/** Focus hints matching the panel's suggested prompts. */
export type InsightFocus = 'summary' | 'risks' | 'next_action'

const CONFIDENCES: readonly string[] = ['low', 'medium', 'high']

/** Caps to keep a stored insight bounded no matter what the model returns. */
const MAX_SUMMARY = 1200
const MAX_ITEM = 400
const MAX_LIST = 8

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed
}

function cleanStringList(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value)) return null

  const items: string[] = []
  for (const entry of value) {
    const cleaned = cleanString(entry, MAX_ITEM)
    if (cleaned && !items.includes(cleaned)) items.push(cleaned)
    if (items.length >= max) break
  }

  return items
}

/**
 * Validates a model response against the contract.
 *
 * Two things a response schema cannot guarantee are enforced here: that the text
 * fields are actually present and non-empty, and that every cited event id was
 * one we supplied. A well-formed id for an event that does not exist would
 * otherwise become a source reference pointing nowhere.
 */
export function validateInsight(raw: unknown, suppliedEventIds: string[]): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'The model did not return a JSON object.' }
  }

  const candidate = raw as Record<string, unknown>

  const summary = cleanString(candidate['summary'], MAX_SUMMARY)
  if (!summary) return { ok: false, reason: 'The response had no usable summary.' }

  const nextAction = cleanString(candidate['next_action'], MAX_ITEM)
  if (!nextAction) return { ok: false, reason: 'The response had no usable next action.' }

  const topics = cleanStringList(candidate['topics'], MAX_LIST)
  if (!topics) return { ok: false, reason: 'The response had no topics list.' }

  const risks = cleanStringList(candidate['risks'], MAX_LIST)
  if (!risks) return { ok: false, reason: 'The response had no risks list.' }

  const confidenceRaw = candidate['confidence']
  if (typeof confidenceRaw !== 'string' || !CONFIDENCES.includes(confidenceRaw)) {
    return { ok: false, reason: 'The response had no valid confidence value.' }
  }

  const citedRaw = candidate['source_event_ids']
  if (!Array.isArray(citedRaw)) {
    return { ok: false, reason: 'The response had no source event ids list.' }
  }

  const allowed = new Set(suppliedEventIds)
  const sourceEventIds: string[] = []
  const droppedSourceIds: string[] = []

  for (const entry of citedRaw) {
    if (typeof entry !== 'string') continue
    const id = entry.trim()
    if (id.length === 0) continue

    if (allowed.has(id)) {
      if (!sourceEventIds.includes(id)) sourceEventIds.push(id)
    } else if (!droppedSourceIds.includes(id)) {
      droppedSourceIds.push(id)
    }
  }

  return {
    ok: true,
    insight: {
      summary,
      topics,
      risks,
      next_action: nextAction,
      confidence: confidenceRaw as Confidence,
      source_event_ids: sourceEventIds,
    },
    droppedSourceIds,
  }
}
