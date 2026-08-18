import { supabase } from '../lib/supabase'
import type { AgentNote, ChannelEvent, NewPhoneInteractionInput, NoteStatus } from '../lib/types'

const NOTE_COLUMNS =
  'id, customer_id, user_id, channel_event_id, note, status, follow_up_required, created_at'

interface RawNote {
  id: string
  customer_id: string
  user_id: string
  channel_event_id: string | null
  note: string
  status: string
  follow_up_required: boolean
  created_at: string
}

function toStatus(value: string): NoteStatus {
  return value === 'resolved' || value === 'escalated' ? value : 'pending'
}

function normalize(row: RawNote): AgentNote {
  return {
    id: row.id,
    customer_id: row.customer_id,
    user_id: row.user_id,
    channel_event_id: row.channel_event_id,
    note: row.note,
    status: toStatus(row.status),
    follow_up_required: row.follow_up_required,
    created_at: row.created_at,
  }
}

/** Agent notes for one customer, newest first. RLS scopes the result set. */
export async function listAgentNotes(customerId: string): Promise<AgentNote[]> {
  const { data, error } = await supabase
    .from('agent_notes')
    .select(NOTE_COLUMNS)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as RawNote[]).map(normalize)
}

/**
 * Logs a phone call as one phone event plus one linked agent note.
 *
 * Both rows are written by a single Postgres function so they share a
 * transaction: a failure cannot leave a phone event without its note. The
 * function runs SECURITY INVOKER, so RLS applies and ownership still comes from
 * `default auth.uid()` - no user_id crosses the wire.
 */
export async function logPhoneInteraction(
  input: NewPhoneInteractionInput,
): Promise<ChannelEvent> {
  const { data, error } = await supabase
    .rpc('log_phone_interaction', {
      p_customer_id: input.customer_id,
      p_direction: input.direction,
      p_wanted: input.what_the_customer_wanted,
      p_outcome: input.outcome,
      p_status: input.status,
      p_follow_up_required: input.follow_up_required,
      p_occurred_at: input.occurred_at,
    })
    .single()

  if (error) throw new Error(error.message)

  const row = data as {
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

  return {
    id: row.id,
    customer_id: row.customer_id,
    user_id: row.user_id,
    channel: 'phone',
    type: row.type,
    direction: row.direction === 'outbound' ? 'outbound' : 'inbound',
    subject: row.subject,
    content:
      typeof row.content === 'object' && row.content !== null && !Array.isArray(row.content)
        ? (row.content as Record<string, unknown>)
        : {},
    occurred_at: row.occurred_at,
    created_at: row.created_at,
  }
}
