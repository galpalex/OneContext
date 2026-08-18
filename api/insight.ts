import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
// The .js extension is deliberate and required. Vercel transpiles each function
// rather than bundling its siblings, and package.json sets "type": "module", so
// Node's ESM loader resolves this specifier literally at runtime. Extensionless
// imports fail to load the whole function. TypeScript maps .js to the .ts source.
import { validateInsight } from './_shared/insight.js'
import type { InsightFocus } from './_shared/insight.js'

/**
 * OneContext AI insight generation.
 *
 * Security shape, which is the whole point of this file living on the server:
 *  - GEMINI_API_KEY is read from the server environment and never leaves it.
 *  - The caller's Supabase access token is verified with Supabase before any data
 *    is read. A request body cannot assert who it is.
 *  - Reads run through a client carrying that token, so RLS decides what is
 *    visible. We never filter by an ownership value supplied by the caller, and a
 *    customer id belonging to someone else simply returns nothing.
 *  - The model response is validated before anything is persisted. A malformed or
 *    failed response leaves CRM data untouched.
 */

const MODEL = 'gemini-3.1-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

/** Cold starts have been observed near 16s, so allow room but still bound it. */
const GEMINI_TIMEOUT_MS = 25_000

/** Enough history to reason over without an unbounded prompt. */
const MAX_EVENTS = 40
const MAX_NOTES = 20
const MAX_FOLLOW_UPS = 20

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    topics: { type: 'ARRAY', items: { type: 'STRING' } },
    risks: { type: 'ARRAY', items: { type: 'STRING' } },
    next_action: { type: 'STRING' },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    source_event_ids: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['summary', 'topics', 'risks', 'next_action', 'confidence', 'source_event_ids'],
  propertyOrdering: [
    'summary',
    'topics',
    'risks',
    'next_action',
    'confidence',
    'source_event_ids',
  ],
} as const

const SYSTEM_INSTRUCTION = [
  'You are OneContext AI, working inside a CRM workspace.',
  'Use ONLY the supplied records. Never invent events, contact details, dates or outcomes.',
  'Separate what the records show from what you recommend: `summary` and `risks` describe',
  'the stored history, `next_action` is your recommendation.',
  'source_event_ids must contain only ids present in the supplied events, and only those you',
  'actually relied on.',
  'If the history is empty or too thin to judge, say so plainly and set confidence to "low"',
  'rather than filling the gap.',
  'All timestamps are already in the local timezone of the reader; quote them as given',
  'and do not convert them.',
  'Write in plain British English, no marketing language, no bullet characters.',
].join(' ')

const FOCUS_HINT: Record<InsightFocus, string> = {
  summary: 'Focus on summarising what has happened so far.',
  risks: 'Focus on what could go wrong or is being neglected.',
  next_action: 'Focus on the single most useful next action.',
}

function isFocus(value: unknown): value is InsightFocus {
  return value === 'summary' || value === 'risks' || value === 'next_action'
}

/**
 * Formats a stored UTC timestamp in the reader's timezone.
 *
 * Timestamps are stored in UTC and the browser renders them locally, so handing
 * the model raw UTC made it state a different calendar date from the one on screen
 * for anything shortly after local midnight. It now receives the same date the
 * user is looking at. An unusable timezone falls back to UTC rather than throwing.
 */
function localise(iso: unknown, timeZone: string): string | null {
  if (typeof iso !== 'string') return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

/** A timezone we can actually format with, or UTC. */
function safeTimeZone(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: value }).format(new Date())
    return value
  } catch {
    return 'UTC'
  }
}

/** Server-side env, tolerating the VITE_ names a local .env already carries. */
function readEnv(): { url: string; anonKey: string; geminiKey: string } | null {
  const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL']
  const anonKey = process.env['SUPABASE_ANON_KEY'] ?? process.env['VITE_SUPABASE_ANON_KEY']
  const geminiKey = process.env['GEMINI_API_KEY']

  if (!url || !anonKey || !geminiKey) return null
  return { url, anonKey, geminiKey }
}

function bearerToken(request: VercelRequest): string | null {
  const header = request.headers.authorization
  if (typeof header !== 'string') return null

  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null

  return token.trim() || null
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Never let a browser or proxy retain an insight response.
  response.setHeader('Cache-Control', 'no-store')

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Use POST.' })
  }

  const env = readEnv()
  if (!env) {
    // Deliberately vague to the caller; the detail goes to the server log.
    console.error('insight: missing SUPABASE_URL, SUPABASE_ANON_KEY or GEMINI_API_KEY')
    return response.status(500).json({ error: 'Insight generation is not configured.' })
  }

  const token = bearerToken(request)
  if (!token) {
    return response.status(401).json({ error: 'Sign in to generate an insight.' })
  }

  const body = (request.body ?? {}) as Record<string, unknown>
  const customerId = typeof body['customerId'] === 'string' ? body['customerId'].trim() : ''
  if (!customerId) {
    return response.status(400).json({ error: 'A customerId is required.' })
  }
  const focus: InsightFocus = isFocus(body['focus']) ? body['focus'] : 'summary'
  const timeZone = safeTimeZone(body['timeZone'])

  /*
   * One client per request, carrying the caller's token. Every read below is
   * therefore subject to the same RLS policies the browser is, which is why no
   * user_id is ever compared by hand in this function.
   */
  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return response.status(401).json({ error: 'Your session is no longer valid.' })
  }

  const [customerResult, eventsResult, notesResult, followUpsResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, company, job_title, lifecycle_stage, customer_need, tags, created_at')
      .eq('id', customerId)
      .maybeSingle(),
    supabase
      .from('channel_events')
      .select('id, channel, type, direction, subject, content, occurred_at')
      .eq('customer_id', customerId)
      .order('occurred_at', { ascending: false })
      .limit(MAX_EVENTS),
    supabase
      .from('agent_notes')
      .select('note, status, follow_up_required, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(MAX_NOTES),
    supabase
      .from('follow_ups')
      .select('title, status, due_at, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(MAX_FOLLOW_UPS),
  ])

  const failure =
    customerResult.error ?? eventsResult.error ?? notesResult.error ?? followUpsResult.error
  if (failure) {
    console.error('insight: read failed', failure.message)
    return response.status(500).json({ error: 'Customer data could not be read.' })
  }

  // RLS makes another account's customer indistinguishable from a missing one,
  // which is the intended behaviour.
  if (!customerResult.data) {
    return response.status(404).json({ error: 'Customer not found.' })
  }

  const events = eventsResult.data ?? []
  const suppliedEventIds = events.map((event) => String(event.id))

  /*
   * Dates are rewritten into the reader's timezone before the model sees them, so
   * anything it says about "when" matches the timeline next to it.
   */
  const context = {
    timezone: timeZone,
    customer: customerResult.data,
    events: events.map((event) => ({
      ...event,
      occurred_at: localise(event.occurred_at, timeZone) ?? event.occurred_at,
    })),
    notes: (notesResult.data ?? []).map((note) => ({
      ...note,
      created_at: localise(note.created_at, timeZone) ?? note.created_at,
    })),
    follow_ups: (followUpsResult.data ?? []).map((followUp) => ({
      ...followUp,
      due_at: localise(followUp.due_at, timeZone) ?? followUp.due_at,
      created_at: localise(followUp.created_at, timeZone) ?? followUp.created_at,
    })),
  }

  const geminiBody = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              FOCUS_HINT[focus],
              'Records follow as JSON.',
              JSON.stringify(context),
            ].join('\n\n'),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  let modelText: string
  try {
    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Header auth, so the key never appears in a URL or a log line.
        'x-goog-api-key': env.geminiKey,
      },
      body: JSON.stringify(geminiBody),
      signal: controller.signal,
    })

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text()
      console.error('insight: gemini returned', geminiResponse.status, detail.slice(0, 400))
      return response
        .status(502)
        .json({ error: 'OneContext AI could not generate an insight. Nothing was saved.' })
    }

    const payload = (await geminiResponse.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    modelText = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    console.error('insight: gemini call failed', aborted ? 'timeout' : error)
    return response.status(504).json({
      error: aborted
        ? 'OneContext AI took too long to respond. Nothing was saved.'
        : 'OneContext AI could not be reached. Nothing was saved.',
    })
  } finally {
    clearTimeout(timeout)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(modelText)
  } catch {
    console.error('insight: response was not JSON')
    return response
      .status(502)
      .json({ error: 'OneContext AI returned an unreadable response. Nothing was saved.' })
  }

  const validation = validateInsight(parsed, suppliedEventIds)
  if (!validation.ok) {
    console.error('insight: validation failed -', validation.reason)
    return response
      .status(502)
      .json({ error: `OneContext AI returned an unusable insight. Nothing was saved.` })
  }

  const { insight, droppedSourceIds } = validation
  if (droppedSourceIds.length > 0) {
    console.warn('insight: dropped unknown source ids', droppedSourceIds.join(', '))
  }

  /*
   * Persist only after validation. No user_id is sent: Postgres fills auth.uid()
   * and the RLS policy re-verifies both the owner and that the customer belongs to
   * them, exactly as the browser paths do.
   */
  const { data: saved, error: saveError } = await supabase
    .from('ai_insights')
    .insert({
      customer_id: customerId,
      summary: insight.summary,
      topics: insight.topics,
      risks: insight.risks,
      next_action: insight.next_action,
      confidence: insight.confidence,
      source_event_ids: insight.source_event_ids,
    })
    .select('id, created_at')
    .single()

  if (saveError) {
    console.error('insight: save failed', saveError.message)
    // The insight is still useful to show even if storing it failed.
    return response.status(200).json({
      insight,
      id: null,
      created_at: null,
      persisted: false,
      dropped_source_ids: droppedSourceIds,
    })
  }

  return response.status(200).json({
    insight,
    id: saved.id,
    created_at: saved.created_at,
    persisted: true,
    dropped_source_ids: droppedSourceIds,
  })
}
