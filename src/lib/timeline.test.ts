import { describe, expect, it } from 'vitest'
import { buildTimeline, distinctNoteText } from './timeline'
import type { AgentNote, ChannelEvent } from './types'

function event(id: string, occurred_at: string, overrides: Partial<ChannelEvent> = {}): ChannelEvent {
  return {
    id,
    customer_id: 'cust',
    user_id: 'user',
    channel: 'web',
    type: null,
    direction: 'inbound',
    subject: null,
    content: {},
    occurred_at,
    created_at: occurred_at,
    ...overrides,
  }
}

function note(id: string, created_at: string, overrides: Partial<AgentNote> = {}): AgentNote {
  return {
    id,
    customer_id: 'cust',
    user_id: 'user',
    channel_event_id: null,
    note: 'note text',
    status: 'pending',
    follow_up_required: false,
    created_at,
    ...overrides,
  }
}

describe('buildTimeline', () => {
  it('returns nothing for no records', () => {
    expect(buildTimeline([], [])).toEqual([])
  })

  it('orders newest first across both tables', () => {
    const items = buildTimeline(
      [event('e-old', '2026-08-10T00:00:00Z'), event('e-new', '2026-08-14T00:00:00Z')],
      [note('n-mid', '2026-08-12T00:00:00Z')],
    )

    expect(items.map((item) => item.id)).toEqual(['e-new', 'n-mid', 'e-old'])
  })

  it('sorts events by occurred_at, not created_at', () => {
    // A backdated event logged today must still sort by when it happened.
    const backdated = event('e-backdated', '2026-08-01T00:00:00Z', {
      created_at: '2026-08-20T00:00:00Z',
    })
    const items = buildTimeline([backdated, event('e-recent', '2026-08-15T00:00:00Z')], [])

    expect(items.map((item) => item.id)).toEqual(['e-recent', 'e-backdated'])
  })

  it('attaches a linked note to its event instead of listing it separately', () => {
    const items = buildTimeline(
      [event('e-phone', '2026-08-14T00:00:00Z', { channel: 'phone' })],
      [note('n-phone', '2026-08-14T00:00:00Z', { channel_event_id: 'e-phone', status: 'escalated' })],
    )

    expect(items).toHaveLength(1)
    const [first] = items
    expect(first?.kind).toBe('event')
    if (first?.kind === 'event') {
      expect(first.note?.id).toBe('n-phone')
      expect(first.note?.status).toBe('escalated')
    }
  })

  it('keeps a note standalone when its event is not in the list', () => {
    // Never silently drop a stored record just because its event is absent.
    const items = buildTimeline([], [note('n-orphan', '2026-08-14T00:00:00Z', { channel_event_id: 'missing' })])

    expect(items).toHaveLength(1)
    expect(items[0]?.kind).toBe('note')
  })

  it('breaks ties by id so equal timestamps are deterministic', () => {
    const at = '2026-08-14T00:00:00Z'
    const forward = buildTimeline([event('b', at), event('a', at), event('c', at)], [])
    const reversed = buildTimeline([event('c', at), event('b', at), event('a', at)], [])

    expect(forward.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(reversed.map((item) => item.id)).toEqual(forward.map((item) => item.id))
  })

  it('is independent of input order', () => {
    const events = [
      event('e1', '2026-08-11T00:00:00Z'),
      event('e2', '2026-08-13T00:00:00Z'),
      event('e3', '2026-08-12T00:00:00Z'),
    ]
    const notes = [note('n1', '2026-08-14T00:00:00Z'), note('n2', '2026-08-10T00:00:00Z')]

    const forward = buildTimeline(events, notes).map((item) => item.id)
    const shuffled = buildTimeline([...events].reverse(), [...notes].reverse()).map((i) => i.id)

    expect(shuffled).toEqual(forward)
    expect(forward).toEqual(['n1', 'e2', 'e3', 'e1', 'n2'])
  })

  it('attaches deterministically when several notes point at one event', () => {
    const later = note('n-later', '2026-08-15T00:00:00Z', { channel_event_id: 'e1' })
    const earlier = note('n-earlier', '2026-08-14T00:00:00Z', { channel_event_id: 'e1' })
    const events = [event('e1', '2026-08-14T00:00:00Z')]

    const a = buildTimeline(events, [later, earlier])
    const b = buildTimeline(events, [earlier, later])

    for (const items of [a, b]) {
      const [first] = items
      expect(first?.kind).toBe('event')
      if (first?.kind === 'event') expect(first.note?.id).toBe('n-earlier')
    }
  })

  it('does not lose any record', () => {
    const events = [event('e1', '2026-08-11T00:00:00Z'), event('e2', '2026-08-12T00:00:00Z')]
    const notes = [
      note('n-attached', '2026-08-11T00:00:00Z', { channel_event_id: 'e1' }),
      note('n-free', '2026-08-13T00:00:00Z'),
    ]

    const items = buildTimeline(events, notes)
    const attachedCount = items.filter((item) => item.kind === 'event' && item.note).length

    expect(items).toHaveLength(3)
    expect(attachedCount).toBe(1)
  })
})

describe('distinctNoteText', () => {
  const phoneEvent = event('e-phone', '2026-08-18T00:00:00Z', {
    channel: 'phone',
    content: { what_the_customer_wanted: 'A discount', outcome: 'Sending pricing Friday.' },
  })

  function itemFor(noteText: string) {
    const [item] = buildTimeline(
      [phoneEvent],
      [note('n', '2026-08-18T00:00:00Z', { channel_event_id: 'e-phone', note: noteText })],
    )
    return item!
  }

  it('returns the note when it says something the outcome does not', () => {
    expect(distinctNoteText(itemFor('Sounded ready to churn - loop in the AM.'))).toBe(
      'Sounded ready to churn - loop in the AM.',
    )
  })

  it('returns null when the note merely repeats the outcome', () => {
    // This is the fallback the Postgres function stores for an empty internal note.
    expect(distinctNoteText(itemFor('Sending pricing Friday.'))).toBeNull()
  })

  it('ignores surrounding whitespace when comparing', () => {
    expect(distinctNoteText(itemFor('   Sending pricing Friday.  '))).toBeNull()
  })

  it('returns null for an event with no attached note', () => {
    const [item] = buildTimeline([phoneEvent], [])
    expect(distinctNoteText(item!)).toBeNull()
  })

  it('returns null for a standalone note entry', () => {
    const [item] = buildTimeline([], [note('n-free', '2026-08-18T00:00:00Z')])
    expect(distinctNoteText(item!)).toBeNull()
  })
})
