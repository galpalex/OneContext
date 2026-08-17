-- ============================================================================
-- OneContext - initial schema, indexes and Row Level Security
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
--
-- Design notes
--  * Every user-owned table carries user_id with `default auth.uid()`, so the
--    browser never sends an ownership value. Ownership is decided by Postgres
--    from the verified JWT, and the RLS WITH CHECK clause re-verifies it.
--  * Child tables additionally verify that the referenced customer belongs to
--    the same authenticated user, so a row can never be attached to someone
--    else's customer.
--  * stage_changed_at exists so the "Days at current stage" KPI is derived from
--    stored data instead of being invented.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (length(btrim(name)) > 0),
  company          text,
  email            text,
  phone            text,
  job_title        text,
  lifecycle_stage  text not null default 'new_lead'
                     check (lifecycle_stage in (
                       'new_lead', 'qualification', 'presentation',
                       'proposal', 'contracting', 'closed_won', 'closed_lost'
                     )),
  stage_changed_at timestamptz not null default now(),
  customer_need    text,
  tags             jsonb not null default '[]'::jsonb
                     check (jsonb_typeof(tags) = 'array'),
  created_at       timestamptz not null default now()
);

create index if not exists customers_user_id_idx
  on public.customers (user_id);
create index if not exists customers_user_id_created_at_idx
  on public.customers (user_id, created_at desc);

-- Keep stage_changed_at honest: it moves only when the stage actually changes.
create or replace function public.touch_stage_changed_at()
returns trigger
language plpgsql
as $$
begin
  if new.lifecycle_stage is distinct from old.lifecycle_stage then
    new.stage_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists customers_stage_changed_at on public.customers;
create trigger customers_stage_changed_at
  before update on public.customers
  for each row execute function public.touch_stage_changed_at();

-- ---------------------------------------------------------------------------
-- channel_events
-- ---------------------------------------------------------------------------
create table if not exists public.channel_events (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  channel     text not null check (channel in ('web', 'whatsapp', 'email', 'phone')),
  type        text,
  direction   text check (direction in ('inbound', 'outbound')),
  subject     text,
  content     jsonb not null,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists channel_events_user_id_idx
  on public.channel_events (user_id);
create index if not exists channel_events_customer_id_idx
  on public.channel_events (customer_id);
create index if not exists channel_events_customer_occurred_at_idx
  on public.channel_events (customer_id, occurred_at desc);
create index if not exists channel_events_occurred_at_idx
  on public.channel_events (occurred_at desc);

-- ---------------------------------------------------------------------------
-- agent_notes
-- ---------------------------------------------------------------------------
create table if not exists public.agent_notes (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references public.customers (id) on delete cascade,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note               text not null check (length(btrim(note)) > 0),
  status             text not null default 'pending'
                       check (status in ('pending', 'resolved', 'escalated')),
  follow_up_required boolean not null default false,
  created_at         timestamptz not null default now()
);

create index if not exists agent_notes_user_id_idx
  on public.agent_notes (user_id);
create index if not exists agent_notes_customer_id_idx
  on public.agent_notes (customer_id);
create index if not exists agent_notes_customer_created_at_idx
  on public.agent_notes (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ai_insights
-- ---------------------------------------------------------------------------
create table if not exists public.ai_insights (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers (id) on delete cascade,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  summary          text not null,
  topics           jsonb not null default '[]'::jsonb check (jsonb_typeof(topics) = 'array'),
  risks            jsonb not null default '[]'::jsonb check (jsonb_typeof(risks) = 'array'),
  next_action      text not null,
  confidence       text check (confidence in ('low', 'medium', 'high')),
  source_event_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(source_event_ids) = 'array'),
  created_at       timestamptz not null default now()
);

create index if not exists ai_insights_user_id_idx
  on public.ai_insights (user_id);
create index if not exists ai_insights_customer_id_idx
  on public.ai_insights (customer_id);
create index if not exists ai_insights_customer_created_at_idx
  on public.ai_insights (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- follow_ups
-- ---------------------------------------------------------------------------
create table if not exists public.follow_ups (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (length(btrim(title)) > 0),
  source      text not null default 'manual' check (source in ('manual', 'ai_recommendation')),
  status      text not null default 'pending' check (status in ('pending', 'completed', 'dismissed')),
  due_at      timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists follow_ups_user_id_idx
  on public.follow_ups (user_id);
create index if not exists follow_ups_customer_id_idx
  on public.follow_ups (customer_id);
create index if not exists follow_ups_user_status_idx
  on public.follow_ups (user_id, status);
create index if not exists follow_ups_customer_created_at_idx
  on public.follow_ups (customer_id, created_at desc);

-- ============================================================================
-- Row Level Security
-- Every policy is scoped to the `authenticated` role and compares the row owner
-- against auth.uid(). Anonymous visitors match no policy, so they read nothing.
-- ============================================================================

alter table public.customers      enable row level security;
alter table public.channel_events enable row level security;
alter table public.agent_notes    enable row level security;
alter table public.ai_insights    enable row level security;
alter table public.follow_ups     enable row level security;

-- customers -----------------------------------------------------------------
drop policy if exists customers_select_own on public.customers;
create policy customers_select_own on public.customers
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists customers_insert_own on public.customers;
create policy customers_insert_own on public.customers
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists customers_update_own on public.customers;
create policy customers_update_own on public.customers
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists customers_delete_own on public.customers;
create policy customers_delete_own on public.customers
  for delete to authenticated
  using (auth.uid() = user_id);

-- Helper: does this customer belong to the caller?
create or replace function public.owns_customer(target_customer_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = target_customer_id
      and c.user_id = auth.uid()
  );
$$;

-- channel_events ------------------------------------------------------------
drop policy if exists channel_events_select_own on public.channel_events;
create policy channel_events_select_own on public.channel_events
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists channel_events_insert_own on public.channel_events;
create policy channel_events_insert_own on public.channel_events
  for insert to authenticated
  with check (auth.uid() = user_id and public.owns_customer(customer_id));

drop policy if exists channel_events_update_own on public.channel_events;
create policy channel_events_update_own on public.channel_events
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_customer(customer_id));

drop policy if exists channel_events_delete_own on public.channel_events;
create policy channel_events_delete_own on public.channel_events
  for delete to authenticated
  using (auth.uid() = user_id);

-- agent_notes ---------------------------------------------------------------
drop policy if exists agent_notes_select_own on public.agent_notes;
create policy agent_notes_select_own on public.agent_notes
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists agent_notes_insert_own on public.agent_notes;
create policy agent_notes_insert_own on public.agent_notes
  for insert to authenticated
  with check (auth.uid() = user_id and public.owns_customer(customer_id));

drop policy if exists agent_notes_update_own on public.agent_notes;
create policy agent_notes_update_own on public.agent_notes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_customer(customer_id));

drop policy if exists agent_notes_delete_own on public.agent_notes;
create policy agent_notes_delete_own on public.agent_notes
  for delete to authenticated
  using (auth.uid() = user_id);

-- ai_insights ---------------------------------------------------------------
drop policy if exists ai_insights_select_own on public.ai_insights;
create policy ai_insights_select_own on public.ai_insights
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists ai_insights_insert_own on public.ai_insights;
create policy ai_insights_insert_own on public.ai_insights
  for insert to authenticated
  with check (auth.uid() = user_id and public.owns_customer(customer_id));

drop policy if exists ai_insights_update_own on public.ai_insights;
create policy ai_insights_update_own on public.ai_insights
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_customer(customer_id));

drop policy if exists ai_insights_delete_own on public.ai_insights;
create policy ai_insights_delete_own on public.ai_insights
  for delete to authenticated
  using (auth.uid() = user_id);

-- follow_ups ----------------------------------------------------------------
drop policy if exists follow_ups_select_own on public.follow_ups;
create policy follow_ups_select_own on public.follow_ups
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists follow_ups_insert_own on public.follow_ups;
create policy follow_ups_insert_own on public.follow_ups
  for insert to authenticated
  with check (auth.uid() = user_id and public.owns_customer(customer_id));

drop policy if exists follow_ups_update_own on public.follow_ups;
create policy follow_ups_update_own on public.follow_ups
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_customer(customer_id));

drop policy if exists follow_ups_delete_own on public.follow_ups;
create policy follow_ups_delete_own on public.follow_ups
  for delete to authenticated
  using (auth.uid() = user_id);
