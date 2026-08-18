import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Integration tests for the insight function.
 *
 * The Supabase client and the Gemini call are mocked, so what is under test is
 * the function's own decisions: who it refuses, what it reads, and - most
 * importantly - that nothing is written when the model misbehaves.
 */

interface TableResult {
  data: unknown
  error: { message: string } | null
}

const insertCalls: Array<Record<string, unknown>> = []
let tableResults: Record<string, TableResult>
let getUserResult: { data: { user: { id: string } | null }; error: { message: string } | null }

/** Chainable stand-in for a PostgrestFilterBuilder, thenable at any depth. */
function builder(result: TableResult, onInsert?: (payload: Record<string, unknown>) => void) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'maybeSingle', 'single']) {
    chain[method] = vi.fn(() => chain)
  }
  chain['insert'] = vi.fn((payload: Record<string, unknown>) => {
    onInsert?.(payload)
    return chain
  })
  chain['then'] = (resolve: (value: TableResult) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn(async () => getUserResult) },
    from: vi.fn((table: string) =>
      builder(tableResults[table] ?? { data: null, error: null }, (payload) => {
        if (table === 'ai_insights') insertCalls.push(payload)
      }),
    ),
  })),
}))

const { default: handler } = await import('./insight')

interface MockResponse {
  statusCode: number
  body: unknown
  headers: Record<string, string>
  status: (code: number) => MockResponse
  json: (payload: unknown) => MockResponse
  setHeader: (name: string, value: string) => void
}

function mockResponse(): MockResponse {
  const response: MockResponse = {
    statusCode: 0,
    body: undefined,
    headers: {},
    status(code) {
      response.statusCode = code
      return response
    },
    json(payload) {
      response.body = payload
      return response
    },
    setHeader(name, value) {
      response.headers[name.toLowerCase()] = value
    },
  }
  return response
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer token-abc' },
    body: { customerId: 'cust-1' },
    ...overrides,
  } as never
}

const VALID_MODEL_OUTPUT = {
  summary: 'The customer is comparing pricing tiers.',
  topics: ['pricing'],
  risks: ['No follow-up scheduled.'],
  next_action: 'Send the pricing overview.',
  confidence: 'medium',
  source_event_ids: ['evt-1', 'evt-ghost'],
}

function geminiReturning(text: string, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    text: async () => text,
  }))
}

beforeEach(() => {
  insertCalls.length = 0
  getUserResult = { data: { user: { id: 'user-1' } }, error: null }
  tableResults = {
    customers: { data: { id: 'cust-1', name: 'Yosi Cohen' }, error: null },
    channel_events: { data: [{ id: 'evt-1', channel: 'web' }], error: null },
    agent_notes: { data: [], error: null },
    follow_ups: { data: [], error: null },
    ai_insights: { data: { id: 'ins-1', created_at: '2026-08-19T00:00:00Z' }, error: null },
  }
  process.env['SUPABASE_URL'] = 'https://project.supabase.co'
  process.env['SUPABASE_ANON_KEY'] = 'anon'
  process.env['GEMINI_API_KEY'] = 'k3y-Zx91-do-not-log'
  vi.stubGlobal('fetch', geminiReturning(JSON.stringify(VALID_MODEL_OUTPUT)))
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env['SUPABASE_URL']
  delete process.env['SUPABASE_ANON_KEY']
  delete process.env['GEMINI_API_KEY']
})

describe('POST /api/insight', () => {
  it('refuses anything but POST', async () => {
    const response = mockResponse()
    await handler(request({ method: 'GET' }), response as never)

    expect(response.statusCode).toBe(405)
    expect(response.headers['allow']).toBe('POST')
  })

  it('never allows a response to be cached', async () => {
    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('rejects a request with no bearer token', async () => {
    const response = mockResponse()
    await handler(request({ headers: {} }), response as never)

    expect(response.statusCode).toBe(401)
    expect(insertCalls).toHaveLength(0)
  })

  it('rejects a malformed authorization header', async () => {
    const response = mockResponse()
    await handler(request({ headers: { authorization: 'token-abc' } }), response as never)

    expect(response.statusCode).toBe(401)
  })

  it('rejects a token Supabase does not accept', async () => {
    getUserResult = { data: { user: null }, error: { message: 'bad jwt' } }

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(401)
    // Crucially, no model call and no write happened.
    expect(fetch).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
  })

  it('requires a customerId', async () => {
    const response = mockResponse()
    await handler(request({ body: {} }), response as never)

    expect(response.statusCode).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports missing configuration without leaking which value is absent', async () => {
    delete process.env['GEMINI_API_KEY']

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(500)
    expect(JSON.stringify(response.body)).not.toContain('GEMINI')
  })

  it("treats another account's customer as not found", async () => {
    // RLS returns no row, which is indistinguishable from a missing customer.
    tableResults['customers'] = { data: null, error: null }

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
  })

  it('sends the Gemini key as a header, never in the URL or body', async () => {
    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(200)
    const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock
      .calls[0]!
    // A key in a URL leaks into proxy logs and error reports.
    expect(url).not.toContain('k3y-Zx91-do-not-log')
    expect(url).not.toContain('key=')
    expect(String(init.body)).not.toContain('k3y-Zx91-do-not-log')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('k3y-Zx91-do-not-log')
  })

  it('never returns the key or the raw model payload to the caller', async () => {
    const response = mockResponse()
    await handler(request(), response as never)

    expect(JSON.stringify(response.body)).not.toContain('k3y-Zx91-do-not-log')
  })

  it('gives the model dates in the reader timezone, not UTC', async () => {
    // The real case this fixes: 22:44Z is the next calendar day in Jerusalem, so
    // the model was stating 17 August while the timeline beside it showed 18 August.
    tableResults['channel_events'] = {
      data: [{ id: 'evt-1', channel: 'web', occurred_at: '2026-08-17T22:44:00Z' }],
      error: null,
    }

    const response = mockResponse()
    await handler(
      request({ body: { customerId: 'cust-1', timeZone: 'Asia/Jerusalem' } }),
      response as never,
    )

    expect(response.statusCode).toBe(200)
    const [, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!
    const prompt = String(init.body)
    expect(prompt).toContain('18 Aug 2026')
    expect(prompt).not.toContain('2026-08-17T22:44:00Z')
    expect(prompt).toContain('Asia/Jerusalem')
  })

  it('falls back to UTC when the timezone is unusable', async () => {
    tableResults['channel_events'] = {
      data: [{ id: 'evt-1', channel: 'web', occurred_at: '2026-08-17T22:44:00Z' }],
      error: null,
    }

    const response = mockResponse()
    await handler(
      request({ body: { customerId: 'cust-1', timeZone: 'Not/AZone' } }),
      response as never,
    )

    expect(response.statusCode).toBe(200)
    const [, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!
    const prompt = String(init.body)
    expect(prompt).toContain('17 Aug 2026')
    expect(prompt).toContain('UTC')
  })

  it('lowers a confidence the stored history cannot support, and stores the lowered value', async () => {
    // One event, one channel: "medium" from the model must become "low".
    tableResults['channel_events'] = {
      data: [{ id: 'evt-1', channel: 'web', occurred_at: '2026-08-17T10:00:00Z' }],
      error: null,
    }

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(200)
    const body = response.body as { insight: { confidence: string }; confidence_capped: boolean }
    expect(body.insight.confidence).toBe('low')
    expect(body.confidence_capped).toBe(true)
    // What was shown and what was stored must agree.
    expect(insertCalls[0]!['confidence']).toBe('low')
  })

  it('leaves confidence alone when the history supports it', async () => {
    tableResults['channel_events'] = {
      data: [
        { id: 'evt-1', channel: 'web', occurred_at: '2026-08-10T10:00:00Z' },
        { id: 'evt-2', channel: 'email', occurred_at: '2026-08-11T10:00:00Z' },
        { id: 'evt-3', channel: 'phone', occurred_at: '2026-08-12T10:00:00Z' },
        { id: 'evt-4', channel: 'whatsapp', occurred_at: '2026-08-13T10:00:00Z' },
      ],
      error: null,
    }

    const response = mockResponse()
    await handler(request(), response as never)

    const body = response.body as { insight: { confidence: string }; confidence_capped: boolean }
    expect(body.insight.confidence).toBe('medium')
    expect(body.confidence_capped).toBe(false)
  })

  it('stores the insight and filters citations to supplied events', async () => {
    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(200)
    expect(insertCalls).toHaveLength(1)

    const stored = insertCalls[0]!
    expect(stored['customer_id']).toBe('cust-1')
    expect(stored['source_event_ids']).toEqual(['evt-1'])
    // Ownership is never sent from here; Postgres assigns it.
    expect(stored).not.toHaveProperty('user_id')

    const body = response.body as { dropped_source_ids: string[]; persisted: boolean }
    expect(body.dropped_source_ids).toEqual(['evt-ghost'])
    expect(body.persisted).toBe(true)
  })

  it('saves nothing when the model returns unusable JSON', async () => {
    vi.stubGlobal('fetch', geminiReturning('{"summary": ""}'))

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(502)
    expect(insertCalls).toHaveLength(0)
  })

  it('saves nothing when the model returns something that is not JSON', async () => {
    vi.stubGlobal('fetch', geminiReturning('I am afraid I cannot do that'))

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(502)
    expect(insertCalls).toHaveLength(0)
  })

  it('saves nothing when Gemini returns an error status', async () => {
    vi.stubGlobal('fetch', geminiReturning('quota exceeded', false, 429))

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(502)
    expect(insertCalls).toHaveLength(0)
  })

  it('saves nothing and reports a timeout when the call is aborted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const error = new Error('aborted')
        error.name = 'AbortError'
        throw error
      }),
    )

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(504)
    expect(insertCalls).toHaveLength(0)
  })

  it('still returns the insight when storing it fails', async () => {
    // A failed write must not throw away work the user waited for.
    tableResults['ai_insights'] = { data: null, error: { message: 'insert failed' } }

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(200)
    const body = response.body as { persisted: boolean; insight: { summary: string } }
    expect(body.persisted).toBe(false)
    expect(body.insight.summary).toContain('pricing tiers')
  })

  it('surfaces a read failure rather than inventing an empty history', async () => {
    tableResults['channel_events'] = { data: null, error: { message: 'read failed' } }

    const response = mockResponse()
    await handler(request(), response as never)

    expect(response.statusCode).toBe(500)
    expect(fetch).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
  })
})
