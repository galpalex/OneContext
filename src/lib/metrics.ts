import type { Channel, ChannelEvent } from './types'
import { daysSince } from './format'

export interface CustomerMetrics {
  totalInteractions: number
  /** Channels that actually have at least one stored event. */
  activeChannels: Channel[]
  lastContactAt: string | null
  daysSinceLastContact: number | null
  countsByChannel: Record<Channel, number>
}

const EMPTY_COUNTS: Record<Channel, number> = {
  web: 0,
  whatsapp: 0,
  email: 0,
  phone: 0,
}

/**
 * Derives every engagement metric from stored events only.
 *
 * Callers must distinguish "no events stored" from "zero" themselves: with an
 * empty list this returns totalInteractions 0 and daysSinceLastContact null, and
 * the UI is responsible for rendering "Not available" rather than a figure.
 */
export function deriveMetrics(events: ChannelEvent[]): CustomerMetrics {
  const countsByChannel: Record<Channel, number> = { ...EMPTY_COUNTS }
  let lastContactAt: string | null = null

  for (const event of events) {
    countsByChannel[event.channel] += 1

    if (!lastContactAt || event.occurred_at > lastContactAt) {
      lastContactAt = event.occurred_at
    }
  }

  const activeChannels = (Object.keys(countsByChannel) as Channel[]).filter(
    (channel) => countsByChannel[channel] > 0,
  )

  return {
    totalInteractions: events.length,
    activeChannels,
    lastContactAt,
    daysSinceLastContact: daysSince(lastContactAt),
    countsByChannel,
  }
}

export interface DayBucket {
  /** Local calendar day, YYYY-MM-DD. */
  key: string
  label: string
  count: number
}

function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Event counts per local calendar day over a trailing window, oldest first.
 * Days with no events are real zeros - the window itself is stored data.
 */
export function dailyActivity(
  events: ChannelEvent[],
  days = 14,
  now: Date = new Date(),
): DayBucket[] {
  const counts = new Map<string, number>()

  for (const event of events) {
    const occurred = new Date(event.occurred_at)
    if (Number.isNaN(occurred.getTime())) continue
    const key = dayKey(occurred)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const buckets: DayBucket[] = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const key = dayKey(date)
    buckets.push({
      key,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: counts.get(key) ?? 0,
    })
  }

  return buckets
}
