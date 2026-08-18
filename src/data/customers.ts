import { supabase } from '../lib/supabase'
import { DEFAULT_STAGE, isLifecycleStage } from '../lib/lifecycle'
import type { Customer, NewCustomerInput } from '../lib/types'

const CORE_COLUMNS =
  'id, user_id, name, company, email, phone, job_title, lifecycle_stage, stage_changed_at, customer_need, tags, created_at'

/**
 * avatar_url arrived in migration 0004 and is optional, so the app must not depend
 * on it having been run. Pushing to main deploys immediately, which means code can
 * reach production before its migration does - and a missing optional column took
 * out the whole customers list once already.
 *
 * The first query that hits undefined_column (42703) for this column sets the flag,
 * and every later query omits it. Avatars then simply fall back to initials.
 */
let avatarColumnMissing = false

function customerColumns(): string {
  return avatarColumnMissing ? CORE_COLUMNS : `${CORE_COLUMNS}, avatar_url`
}

const UNDEFINED_COLUMN = '42703'

function isMissingAvatarColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === UNDEFINED_COLUMN && (error.message ?? '').includes('avatar_url')
}

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
  avatar_url?: string | null
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
    avatar_url: row.avatar_url ?? null,
    created_at: row.created_at,
  }
}

/**
 * Every customer visible to the signed-in user.
 * No user_id filter is applied here on purpose: RLS restricts the result set to
 * `auth.uid() = user_id`, so ownership is enforced by Postgres, not by the client.
 */
export async function listCustomers(): Promise<Customer[]> {
  const run = () =>
    supabase.from('customers').select(customerColumns()).order('created_at', { ascending: false })

  let { data, error } = await run()

  if (isMissingAvatarColumn(error)) {
    avatarColumnMissing = true
    ;({ data, error } = await run())
  }

  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as RawCustomer[]).map(normalize)
}

/**
 * A single customer, or null when it does not exist *or* belongs to another
 * user. RLS makes those two cases indistinguishable to the browser, which is
 * the intended behaviour.
 */
export async function getCustomer(id: string): Promise<Customer | null> {
  const run = () =>
    supabase.from('customers').select(customerColumns()).eq('id', id).maybeSingle()

  let { data, error } = await run()

  if (isMissingAvatarColumn(error)) {
    avatarColumnMissing = true
    ;({ data, error } = await run())
  }

  if (error) throw new Error(error.message)
  if (!data) return null

  return normalize(data as unknown as RawCustomer)
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
    .select(customerColumns())
    .single()

  if (error) throw new Error(error.message)

  return normalize(data as unknown as RawCustomer)
}
