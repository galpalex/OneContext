import { supabase } from '../lib/supabase'
import { isChannel } from '../lib/channels'
import type { ChannelEvent, Direction, NewChannelEventInput } from '../lib/types'

const EVENT_COLUMNS =
  'id, customer_id, user_id, channel, type, direction, subject, content, occurred_at, created_at'

interface RawEvent {
  id: string
  customer_id: string
  user_id: string
  channel: string
  type: string | null
  direction: string | null
  subject: string | null
  content: unknown
  occurred_at: string
  created_at: string
}

function toDirection(value: string | null): Direction | null {
  return value === 'inbound' || value === 'outbound' ? value : null
}

/** jsonb can hold anything; only a plain object is usable as event content. */
function toContent(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function normalize(row: RawEvent): ChannelEvent {
  return {
    id: row.id,
    customer_id: row.customer_id,
    user_id: row.user_id,
    channel: isChannel(row.channel) ? row.channel : 'web',
    type: row.type,
    direction: toDirection(row.direction),
    subject: row.subject,
    content: toContent(row.content),
    occurred_at: row.occurred_at,
    created_at: row.created_at,
  }
}

/**
 * Events for one customer, newest first.
 *
 * The customer_id filter narrows the query; ownership is enforced separately by
 * the RLS select policy, so a foreign customer_id returns nothing rather than
 * another account's rows.
 */
export async function listChannelEvents(customerId: string): Promise<ChannelEvent[]> {
  const { data, error } = await supabase
    .from('channel_events')
    .select(EVENT_COLUMNS)
    .eq('customer_id', customerId)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as RawEvent[]).map(normalize)
}

/** Logs one channel event. No user_id is sent; Postgres and RLS decide ownership. */
export async function createChannelEvent(input: NewChannelEventInput): Promise<ChannelEvent> {
  const { data, error } = await supabase
    .from('channel_events')
    .insert({
      customer_id: input.customer_id,
      channel: input.channel,
      type: input.type,
      direction: input.direction,
      subject: input.subject,
      content: input.content,
      occurred_at: input.occurred_at,
    })
    .select(EVENT_COLUMNS)
    .single()

  if (error) throw new Error(error.message)

  return normalize(data as RawEvent)
}
