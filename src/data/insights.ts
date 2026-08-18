import { supabase } from '../lib/supabase'
import type { Confidence, Insight, InsightFocus } from '../../api/_shared/insight'

export interface GeneratedInsight {
  insight: Insight
  /** Null when the insight was generated but could not be stored. */
  id: string | null
  created_at: string | null
  persisted: boolean
  /** Ids the model cited that do not exist. Surfaced rather than hidden. */
  dropped_source_ids: string[]
}

export interface StoredInsight {
  insight: Insight
  id: string
  created_at: string
}

interface RawInsight {
  id: string
  summary: string
  topics: unknown
  risks: unknown
  next_action: string
  confidence: string | null
  source_event_ids: unknown
  created_at: string
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function toConfidence(value: string | null): Confidence {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'low'
}

/**
 * Asks the serverless function for an insight.
 *
 * The access token is attached here and verified server-side; the customer id is
 * the only thing this request asserts, and RLS decides whether the caller may see
 * it. Nothing about ownership is sent.
 */
export async function generateInsight(
  customerId: string,
  focus: InsightFocus,
): Promise<GeneratedInsight> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error('Your session has expired. Sign in again to generate an insight.')
  }

  let response: Response
  try {
    response = await fetch('/api/insight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      /*
       * The timezone matters: events are stored in UTC, but the UI renders local
       * time. Without this the model states UTC calendar dates while the timeline
       * beside it shows local ones, and any event just after local midnight
       * appears to be a day out.
       */
      body: JSON.stringify({
        customerId,
        focus,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    })
  } catch {
    throw new Error('OneContext AI could not be reached. Check your connection and try again.')
  }

  // A 404 here usually means the app is running under `vite` alone, which does
  // not serve serverless functions. Say so rather than reporting a vague failure.
  if (response.status === 404) {
    throw new Error(
      'The insight endpoint was not found. Run the app with `npm run dev:api` locally, or use the deployed URL.',
    )
  }

  const payload = (await response.json().catch(() => null)) as
    | (GeneratedInsight & { error?: string })
    | null

  if (!response.ok) {
    throw new Error(payload?.error ?? `OneContext AI failed with status ${response.status}.`)
  }
  if (!payload?.insight) {
    throw new Error('OneContext AI returned an empty response.')
  }

  return payload
}

/**
 * The most recent stored insight for a customer, so reopening the workspace shows
 * the last answer instead of an empty panel. RLS scopes the read.
 */
export async function latestInsight(customerId: string): Promise<StoredInsight | null> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('id, summary, topics, risks, next_action, confidence, source_event_ids, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as RawInsight

  return {
    id: row.id,
    created_at: row.created_at,
    insight: {
      summary: row.summary,
      topics: toStringArray(row.topics),
      risks: toStringArray(row.risks),
      next_action: row.next_action,
      confidence: toConfidence(row.confidence),
      source_event_ids: toStringArray(row.source_event_ids),
    },
  }
}
