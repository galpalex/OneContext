/**
 * Row shapes for the OneContext Postgres schema.
 * Mirrors supabase/migrations/0001_init.sql.
 */

export type LifecycleStage =
  | 'new_lead'
  | 'qualification'
  | 'presentation'
  | 'proposal'
  | 'contracting'
  | 'closed_won'
  | 'closed_lost'

export type Channel = 'web' | 'whatsapp' | 'email' | 'phone'
export type Direction = 'inbound' | 'outbound'
export type NoteStatus = 'pending' | 'resolved' | 'escalated'
export type FollowUpStatus = 'pending' | 'completed' | 'dismissed'
export type FollowUpSource = 'manual' | 'ai_recommendation'
export type Confidence = 'low' | 'medium' | 'high'

export interface Customer {
  id: string
  user_id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  job_title: string | null
  lifecycle_stage: LifecycleStage
  stage_changed_at: string
  customer_need: string | null
  tags: string[]
  /** Optional image path. The UI falls back to initials when absent. */
  avatar_url: string | null
  created_at: string
}

/**
 * Fields the browser is allowed to send when creating a customer.
 * `user_id` is deliberately absent: Postgres fills it from `default auth.uid()`
 * and the RLS WITH CHECK clause re-verifies it, so ownership never travels
 * through the client.
 */
export interface NewCustomerInput {
  name: string
  company: string | null
  email: string | null
  phone: string | null
  job_title: string | null
  lifecycle_stage: LifecycleStage
  customer_need: string | null
  tags: string[]
}

/* The tables below are created on Day 1 but only read/written from Day 2-3. */

export interface ChannelEvent {
  id: string
  customer_id: string
  user_id: string
  channel: Channel
  type: string | null
  direction: Direction | null
  subject: string | null
  content: Record<string, unknown>
  occurred_at: string
  created_at: string
}

export interface AgentNote {
  id: string
  customer_id: string
  user_id: string
  /** Set when the note was produced by a channel interaction, e.g. a phone call. */
  channel_event_id: string | null
  note: string
  status: NoteStatus
  follow_up_required: boolean
  created_at: string
}

export interface AiInsight {
  id: string
  customer_id: string
  user_id: string
  summary: string
  topics: string[]
  risks: string[]
  next_action: string
  confidence: Confidence | null
  source_event_ids: string[]
  created_at: string
}

export interface FollowUp {
  id: string
  customer_id: string
  user_id: string
  title: string
  source: FollowUpSource
  status: FollowUpStatus
  due_at: string | null
  created_at: string
}

/**
 * Fields the browser may send when logging a channel event.
 * `user_id` is absent for the same reason as NewCustomerInput: Postgres fills it
 * from `default auth.uid()` and the RLS policy re-verifies both the owner and
 * that the referenced customer belongs to the caller.
 */
export interface NewChannelEventInput {
  customer_id: string
  channel: Channel
  type: string | null
  direction: Direction | null
  subject: string | null
  content: Record<string, unknown>
  occurred_at: string
}

/**
 * Fields the browser sends when logging a phone call. Written by the
 * log_phone_interaction Postgres function, which creates the phone event and its
 * agent note in one transaction.
 */
export interface NewPhoneInteractionInput {
  customer_id: string
  direction: Direction
  what_the_customer_wanted: string
  outcome: string
  /** Optional team-facing note. Falls back to the outcome when left empty. */
  internal_note: string
  status: NoteStatus
  follow_up_required: boolean
  occurred_at: string
}

/**
 * Fields the browser sends when creating a follow-up.
 * `status` is absent because a new follow-up is always pending, and `user_id`
 * because Postgres assigns auth.uid().
 */
export interface NewFollowUpInput {
  customer_id: string
  title: string
  source: FollowUpSource
  due_at: string | null
}
