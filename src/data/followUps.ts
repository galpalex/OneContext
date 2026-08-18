import { supabase } from '../lib/supabase'
import type { FollowUp, FollowUpSource, FollowUpStatus, NewFollowUpInput } from '../lib/types'

const FOLLOW_UP_COLUMNS = 'id, customer_id, user_id, title, source, status, due_at, created_at'

interface RawFollowUp {
  id: string
  customer_id: string
  user_id: string
  title: string
  source: string
  status: string
  due_at: string | null
  created_at: string
}

function toStatus(value: string): FollowUpStatus {
  return value === 'completed' || value === 'dismissed' ? value : 'pending'
}

function toSource(value: string): FollowUpSource {
  return value === 'ai_recommendation' ? 'ai_recommendation' : 'manual'
}

function normalize(row: RawFollowUp): FollowUp {
  return {
    id: row.id,
    customer_id: row.customer_id,
    user_id: row.user_id,
    title: row.title,
    source: toSource(row.source),
    status: toStatus(row.status),
    due_at: row.due_at,
    created_at: row.created_at,
  }
}

/**
 * Follow-ups for one customer. Ordered so anything with a due date comes first,
 * soonest first, since that is the order someone works through them.
 */
export async function listFollowUps(customerId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from('follow_ups')
    .select(FOLLOW_UP_COLUMNS)
    .eq('customer_id', customerId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as RawFollowUp[]).map(normalize)
}

/**
 * Creates a follow-up. No user_id is sent: Postgres assigns auth.uid() and the
 * RLS policy re-verifies both the owner and that the customer belongs to them.
 *
 * `source` records whether a human wrote this or accepted an AI recommendation.
 * Day 3 passes 'ai_recommendation' here, and only ever after an explicit
 * confirmation - the AI never reaches this function on its own.
 */
export async function createFollowUp(input: NewFollowUpInput): Promise<FollowUp> {
  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      customer_id: input.customer_id,
      title: input.title,
      source: input.source,
      due_at: input.due_at,
      status: 'pending',
    })
    .select(FOLLOW_UP_COLUMNS)
    .single()

  if (error) throw new Error(error.message)

  return normalize(data as RawFollowUp)
}

/** Marks a follow-up completed or dismissed. RLS restricts this to its owner. */
export async function setFollowUpStatus(
  id: string,
  status: FollowUpStatus,
): Promise<FollowUp> {
  const { data, error } = await supabase
    .from('follow_ups')
    .update({ status })
    .eq('id', id)
    .select(FOLLOW_UP_COLUMNS)
    .single()

  if (error) throw new Error(error.message)

  return normalize(data as RawFollowUp)
}
