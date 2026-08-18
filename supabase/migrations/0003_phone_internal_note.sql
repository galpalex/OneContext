-- ============================================================================
-- OneContext - give the phone agent note its own content
-- Run in the Supabase SQL Editor after 0002_phone_interactions.sql.
--
-- Before this, the note stored a verbatim copy of the call outcome, so its text
-- column carried no information of its own: only status and follow_up_required
-- were doing work. The phone form now has an optional internal note - what the
-- team needs to know, as opposed to the outcome you would tell the customer -
-- and that becomes the note text.
--
-- The note stays NOT NULL, so an empty internal note falls back to the outcome.
-- The timeline only renders the note text when it differs from the outcome, so
-- the fallback never shows the same sentence twice.
--
-- Adding a parameter changes the signature, which would create an overload
-- rather than replace the function, so the old one is dropped first.
-- ============================================================================

drop function if exists public.log_phone_interaction(
  uuid, text, text, text, text, boolean, timestamptz
);

create or replace function public.log_phone_interaction(
  p_customer_id uuid,
  p_direction text,
  p_wanted text,
  p_outcome text,
  p_internal_note text,
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
    coalesce(nullif(btrim(p_internal_note), ''), p_outcome),
    p_status,
    p_follow_up_required
  );

  return v_event;
end;
$$;

grant execute on function public.log_phone_interaction(
  uuid, text, text, text, text, text, boolean, timestamptz
) to authenticated;
