import { describe, expect, it } from 'vitest'
import { countFlaggedNotes, dailyActivity, deriveFollowUpMetrics, deriveMetrics } from './metrics'
import type { AgentNote, ChannelEvent, FollowUp, FollowUpStatus } from './types'

function event(id: string, channel: ChannelEvent['channel'], occurred_at: string): ChannelEvent {
  return {
    id,
    customer_id: 'cust',
    user_id: 'user',
    channel,
    type: null,
    direction: 'inbound',
    subject: null,
    content: {},
    occurred_at,
    created_at: occurred_at,
  }
}

describe('deriveMetrics', () => {
  it('reports an absent measurement rather than a zero for last contact', () => {
    const metrics = deriveMetrics([])

    expect(metrics.totalInteractions).toBe(0)
    expect(metrics.activeChannels).toEqual([])
    expect(metrics.lastContactAt).toBeNull()
    // The UI renders "Not available" from this null; a 0 would read as measured.
    expect(metrics.daysSinceLastContact).toBeNull()
  })

  it('counts every channel separately', () => {
    const metrics = deriveMetrics([
      event('1', 'web', '2026-08-10T00:00:00Z'),
      event('2', 'web', '2026-08-11T00:00:00Z'),
      event('3', 'whatsapp', '2026-08-12T00:00:00Z'),
      event('4', 'phone', '2026-08-13T00:00:00Z'),
    ])

    expect(metrics.totalInteractions).toBe(4)
    expect(metrics.countsByChannel).toEqual({ web: 2, whatsapp: 1, email: 0, phone: 1 })
    expect(metrics.activeChannels).toEqual(['web', 'whatsapp', 'phone'])
  })

  it('takes the latest occurrence regardless of input order', () => {
    const late = event('late', 'email', '2026-08-18T09:00:00Z')
    const early = event('early', 'web', '2026-08-01T09:00:00Z')

    expect(deriveMetrics([early, late]).lastContactAt).toBe('2026-08-18T09:00:00Z')
    expect(deriveMetrics([late, early]).lastContactAt).toBe('2026-08-18T09:00:00Z')
  })
})

describe('dailyActivity', () => {
  const now = new Date(2026, 7, 18, 12, 0, 0) // 18 Aug 2026, local time

  it('returns one bucket per day, oldest first', () => {
    const buckets = dailyActivity([], 14, now)

    expect(buckets).toHaveLength(14)
    expect(buckets[0]?.key).toBe('2026-08-05')
    expect(buckets[13]?.key).toBe('2026-08-18')
    expect(buckets.every((bucket) => bucket.count === 0)).toBe(true)
  })

  it('counts several events on the same day into one bucket', () => {
    const buckets = dailyActivity(
      [
        event('1', 'web', new Date(2026, 7, 18, 9, 0, 0).toISOString()),
        event('2', 'web', new Date(2026, 7, 18, 17, 0, 0).toISOString()),
        event('3', 'web', new Date(2026, 7, 12, 9, 0, 0).toISOString()),
      ],
      14,
      now,
    )

    expect(buckets.find((bucket) => bucket.key === '2026-08-18')?.count).toBe(2)
    expect(buckets.find((bucket) => bucket.key === '2026-08-12')?.count).toBe(1)
    expect(buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(3)
  })

  it('ignores events outside the window instead of folding them into an edge day', () => {
    const buckets = dailyActivity(
      [event('old', 'web', new Date(2026, 6, 1, 9, 0, 0).toISOString())],
      14,
      now,
    )

    expect(buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(0)
  })

  it('skips unparseable timestamps without throwing', () => {
    const broken = { ...event('bad', 'web', 'not-a-date') }
    const buckets = dailyActivity([broken], 14, now)

    expect(buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(0)
  })
})

function followUp(
  id: string,
  status: FollowUpStatus,
  due_at: string | null = null,
): FollowUp {
  return {
    id,
    customer_id: 'cust',
    user_id: 'user',
    title: 'Send the integration overview',
    source: 'manual',
    status,
    due_at,
    created_at: '2026-08-18T00:00:00Z',
  }
}

describe('deriveFollowUpMetrics', () => {
  const now = new Date('2026-08-18T12:00:00Z')

  it('reports zero for no follow-ups', () => {
    const metrics = deriveFollowUpMetrics([], now)

    expect(metrics).toEqual({ open: 0, completed: 0, dismissed: 0, nextDueAt: null, overdue: 0 })
  })

  it('counts only pending items as open', () => {
    // Completed and dismissed work is done; counting it would overstate the load.
    const metrics = deriveFollowUpMetrics(
      [
        followUp('a', 'pending'),
        followUp('b', 'completed'),
        followUp('c', 'dismissed'),
        followUp('d', 'pending'),
      ],
      now,
    )

    expect(metrics.open).toBe(2)
    expect(metrics.completed).toBe(1)
    expect(metrics.dismissed).toBe(1)
  })

  it('takes the soonest due date among open items', () => {
    const metrics = deriveFollowUpMetrics(
      [
        followUp('later', 'pending', '2026-08-25T00:00:00Z'),
        followUp('sooner', 'pending', '2026-08-20T00:00:00Z'),
      ],
      now,
    )

    expect(metrics.nextDueAt).toBe('2026-08-20T00:00:00Z')
  })

  it('ignores a completed item when picking the soonest due date', () => {
    const metrics = deriveFollowUpMetrics(
      [
        followUp('done-but-sooner', 'completed', '2026-08-19T00:00:00Z'),
        followUp('open-later', 'pending', '2026-08-24T00:00:00Z'),
      ],
      now,
    )

    expect(metrics.nextDueAt).toBe('2026-08-24T00:00:00Z')
  })

  it('counts overdue open items only', () => {
    const metrics = deriveFollowUpMetrics(
      [
        followUp('past', 'pending', '2026-08-10T00:00:00Z'),
        followUp('future', 'pending', '2026-08-30T00:00:00Z'),
        followUp('past-but-done', 'completed', '2026-08-01T00:00:00Z'),
        followUp('no-date', 'pending'),
      ],
      now,
    )

    expect(metrics.overdue).toBe(1)
    expect(metrics.open).toBe(3)
  })

  it('skips an unparseable due date rather than throwing', () => {
    const metrics = deriveFollowUpMetrics([followUp('bad', 'pending', 'not-a-date')], now)

    expect(metrics.open).toBe(1)
    expect(metrics.overdue).toBe(0)
    expect(metrics.nextDueAt).toBeNull()
  })
})

describe('countFlaggedNotes', () => {
  function note(id: string, follow_up_required: boolean): AgentNote {
    return {
      id,
      customer_id: 'cust',
      user_id: 'user',
      channel_event_id: null,
      note: 'text',
      status: 'pending',
      follow_up_required,
      created_at: '2026-08-18T00:00:00Z',
    }
  }

  it('counts only notes asking for a next step', () => {
    expect(countFlaggedNotes([note('a', true), note('b', false), note('c', true)])).toBe(2)
    expect(countFlaggedNotes([])).toBe(0)
  })
})
