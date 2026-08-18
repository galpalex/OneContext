import { describe, expect, it } from 'vitest'
import { dailyActivity, deriveMetrics } from './metrics'
import type { ChannelEvent } from './types'

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
