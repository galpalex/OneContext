import { supabase } from '../lib/supabase'
import { DEFAULT_STAGE, isLifecycleStage } from '../lib/lifecycle'
import type { Customer, NewCustomerInput } from '../lib/types'

const CUSTOMER_COLUMNS =
  'id, user_id, name, company, email, phone, job_title, lifecycle_stage, stage_changed_at, customer_need, tags, avatar_url, created_at'

interface RawCustomer {
  id: string
  user_id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  job_title: string | null
  lifecycle_stage: string
  stage_changed_at: string
  customer_need: string | null
  tags: unknown
  avatar_url: string | null
  created_at: string
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

/** Narrows a database row into the app's Customer shape. */
function normalize(row: RawCustomer): Customer {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    job_title: row.job_title,
    lifecycle_stage: isLifecycleStage(row.lifecycle_stage) ? row.lifecycle_stage : DEFAULT_STAGE,
    stage_changed_at: row.stage_changed_at,
    customer_need: row.customer_need,
    tags: toStringArray(row.tags),
    avatar_url: row.avatar_url,
    created_at: row.created_at,
  }
}

/**
 * Every customer visible to the signed-in user.
 * No user_id filter is applied here on purpose: RLS restricts the result set to
 * `auth.uid() = user_id`, so ownership is enforced by Postgres, not by the client.
 */
export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as RawCustomer[]).map(normalize)
}

/**
 * A single customer, or null when it does not exist *or* belongs to another
 * user. RLS makes those two cases indistinguishable to the browser, which is
 * the intended behaviour.
 */
export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return normalize(data as RawCustomer)
}

/**
 * Inserts a customer for the signed-in user.
 * The payload carries no user_id: the column defaults to auth.uid() and the RLS
 * insert policy rejects any row whose owner is not the authenticated caller.
 */
export async function createCustomer(input: NewCustomerInput): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      job_title: input.job_title,
      lifecycle_stage: input.lifecycle_stage,
      customer_need: input.customer_need,
      tags: input.tags,
    })
    .select(CUSTOMER_COLUMNS)
    .single()

  if (error) throw new Error(error.message)

  return normalize(data as RawCustomer)
}
