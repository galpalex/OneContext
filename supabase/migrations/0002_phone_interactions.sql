-- ============================================================================
-- OneContext - phone interactions
-- Run in the Supabase SQL Editor after 0001_init.sql.
--
-- Two additions:
--  1. agent_notes.channel_event_id links a note to the interaction it came from.
--     Without it a phone submission produces two unrelated timeline rows saying
--     the same thing; with it the note attaches to its event and contributes
--     status and follow-up instead of duplicating the text.
--  2. log_phone_interaction() writes the phone event and its note in one
--     transaction, so a failure cannot leave an orphan event behind. It runs
--     SECURITY INVOKER, so RLS still applies to both inserts and ownership still
--     comes from `default auth.uid()`.
-- ============================================================================

alter table public.agent_notes
  add column if not exists channel_event_id uuid
    references public.channel_events (id) on delete cascade;

create index if not exists agent_notes_channel_event_id_idx
  on public.agent_notes (channel_event_id);

-- A note may only reference an event the caller owns.
drop policy if exists agent_notes_insert_own on public.agent_notes;
create policy agent_notes_insert_own on public.agent_notes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.owns_customer(customer_id)
    and (
      channel_event_id is null
      or exists (
        select 1
        from public.channel_events e
        where e.id = channel_event_id
          and e.user_id = auth.uid()
      )
    )
  );

drop policy if exists agent_notes_update_own on public.agent_notes;
create policy agent_notes_update_own on public.agent_notes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.owns_customer(customer_id)
    and (
      channel_event_id is null
      or exists (
        select 1
        from public.channel_events e
        where e.id = channel_event_id
          and e.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- log_phone_interaction: one call -> one phone event + one agent note.
--
-- The event content carries what the customer wanted and the outcome, which is
-- what the timeline renders. The note carries the workflow state: status and
-- whether a follow-up is required.
-- ---------------------------------------------------------------------------
create or replace function public.log_phone_interaction(
  p_customer_id uuid,
  p_direction text,
  p_wanted text,
  p_outcome text,
  p_status text,
  p_follow_up_required boolean,
  p_occurred_at timestamptz
)
returns public.channel_events
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event public.channel_events;
begin
  insert into public.channel_events
    (customer_id, channel, type, direction, subject, content, occurred_at)
  values (
    p_customer_id,
    'phone',
    null,
    p_direction,
    null,
    jsonb_build_object(
      'what_the_customer_wanted', p_wanted,
      'outcome', p_outcome
    ),
    p_occurred_at
  )
  returning * into v_event;

  insert into public.agent_notes
    (customer_id, channel_event_id, note, status, follow_up_required)
  values (
    p_customer_id,
    v_event.id,
    p_outcome,
    p_status,
    p_follow_up_required
  );

  return v_event;
end;
$$;

grant execute on function public.log_phone_interaction(
  uuid, text, text, text, text, boolean, timestamptz
) to authenticated;
