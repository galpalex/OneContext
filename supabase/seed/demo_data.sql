-- ============================================================================
-- OneContext - demo data for the walkthrough
--
-- Run in the Supabase SQL Editor. Safe to run repeatedly.
--
-- What it does NOT do: touch anything you created yourself. Every row it inserts
-- is tagged "demo", and it deletes only rows carrying that tag before inserting,
-- so your own customers are left alone. Removing the seed later is one statement:
--
--   delete from public.customers where tags ? 'demo';
--
-- Two things worth knowing about how this is written:
--
--  * user_id is set explicitly. The SQL Editor runs without a JWT, so auth.uid()
--    is null here and the column default cannot fire. This is also why the script
--    bypasses RLS: it runs as the table owner, not as a signed-in user.
--  * Timestamps are relative to now(), so the 14-day activity trend always has
--    something in it no matter when you run this.
--  * Avatars point at SVGs committed under public/demo-avatars/, so the app serves
--    them itself. No third-party avatar service to rate-limit or 404 mid-demo, and
--    no photographs of real people standing in for invented customers.
--
-- Requires migration 0004_customer_avatar.sql for the avatar_url column.
-- ============================================================================

do $$
declare
  -- Edit this if you want the demo data owned by a different account.
  v_email  text := 'galpalex@gmail.com';
  v_user   uuid;
  v_cust   uuid;
  v_event  uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(v_email);

  if v_user is null then
    raise exception
      'No auth user found for %. Sign in to the app once so the account exists, then re-run.', v_email;
  end if;

  -- Clear only previously seeded rows. Cascades remove their events, notes,
  -- follow-ups and insights.
  delete from public.customers where user_id = v_user and tags ? 'demo';

  -- ==========================================================================
  -- 1. Maya Feldman - the showcase account. Every channel, a churn risk, and an
  --    overdue follow-up, so the AI has something substantial to reason about.
  -- ==========================================================================
  insert into public.customers
    (user_id, name, company, email, phone, job_title, lifecycle_stage,
     stage_changed_at, customer_need, tags, avatar_url, created_at)
  values
    (v_user, 'Maya Feldman', 'Alpha Logistics', 'maya.feldman@alphalogistics.example',
     '+972 54 812 3390', 'Head of Operations', 'proposal',
     now() - interval '6 days',
     'Wants to cut the time her team spends reconciling delivery exceptions by hand.',
     '["demo","Hot lead","Enterprise"]'::jsonb,
     '/demo-avatars/maya-feldman.svg', now() - interval '26 days')
  returning id into v_cust;

  insert into public.channel_events
    (user_id, customer_id, channel, type, direction, subject, content, occurred_at)
  values
    (v_user, v_cust, 'web', 'pricing_enquiry', 'inbound', 'Pricing for a 40-person team',
     '{"message":"We are comparing three tools for exception handling. Can you send pricing for 40 seats, and confirm whether the audit log is included on the mid tier?"}'::jsonb,
     now() - interval '26 days'),
    (v_user, v_cust, 'email', null, 'outbound', 'Pricing and audit log details',
     '{"body":"Attached the 40-seat pricing. The audit log is included on the mid tier at no extra cost. Happy to walk through the exception workflow whenever suits."}'::jsonb,
     now() - interval '25 days'),
    (v_user, v_cust, 'whatsapp', null, 'inbound', null,
     '{"message":"Thanks - forwarding to our CFO. She will want to see the integration effort before we commit."}'::jsonb,
     now() - interval '19 days'),
    (v_user, v_cust, 'email', null, 'inbound', 'CFO questions on integration',
     '{"body":"Our CFO asked how long integration with our WMS takes, and whether we need developer time on our side. She is nervous about a long rollout before peak season."}'::jsonb,
     now() - interval '12 days'),
    (v_user, v_cust, 'web', 'demo_request', 'inbound', 'Second demo for the CFO',
     '{"message":"Could we get a short second demo focused on reporting? The CFO wants to see it herself."}'::jsonb,
     now() - interval '5 days');

  -- The phone call carries its note, as the app's own phone form does.
  insert into public.channel_events
    (user_id, customer_id, channel, type, direction, subject, content, occurred_at)
  values
    (v_user, v_cust, 'phone', null, 'inbound', null,
     '{"what_the_customer_wanted":"Reassurance that integration would not run into their peak season, and a firm start date.","outcome":"Agreed to send a written rollout plan with dates. No commitment yet - she will not sign before the CFO sees the reporting demo."}'::jsonb,
     now() - interval '2 days')
  returning id into v_event;

  insert into public.agent_notes
    (user_id, customer_id, channel_event_id, note, status, follow_up_required)
  values
    (v_user, v_cust, v_event,
     'She sounded more hesitant than last time and mentioned a competitor by name. Peak season is the real deadline here, not the budget.',
     'pending', true);

  insert into public.agent_notes
    (user_id, customer_id, channel_event_id, note, status, follow_up_required)
  values
    (v_user, v_cust, null,
     'Procurement freezes new tooling from the last week of October, so anything unsigned by then slips to next year.',
     'pending', false);

  insert into public.follow_ups
    (user_id, customer_id, title, source, status, due_at, created_at)
  values
    (v_user, v_cust, 'Send the written rollout plan with dates', 'manual', 'pending',
     now() - interval '1 day', now() - interval '2 days'),
    (v_user, v_cust, 'Book the reporting demo with the CFO', 'manual', 'pending',
     now() + interval '2 days', now() - interval '2 days'),
    (v_user, v_cust, 'Send 40-seat pricing', 'manual', 'completed',
     now() - interval '24 days', now() - interval '26 days');

  -- ==========================================================================
  -- 2. Daniel Ovadia - mid-funnel, two channels, nothing outstanding.
  -- ==========================================================================
  insert into public.customers
    (user_id, name, company, email, phone, job_title, lifecycle_stage,
     stage_changed_at, customer_need, tags, avatar_url, created_at)
  values
    (v_user, 'Daniel Ovadia', 'Northwind Retail', 'd.ovadia@northwind.example',
     '+972 52 447 1188', 'Retail Systems Lead', 'qualification',
     now() - interval '9 days',
     'Evaluating whether one shared inbox can replace three separate support tools.',
     '["demo","Webinar"]'::jsonb,
     '/demo-avatars/daniel-ovadia.svg', now() - interval '13 days')
  returning id into v_cust;

  insert into public.channel_events
    (user_id, customer_id, channel, type, direction, subject, content, occurred_at)
  values
    (v_user, v_cust, 'web', 'contact_form', 'inbound', 'Came from the October webinar',
     '{"message":"Watched the webinar on unified inboxes. We run three tools and duplicate work constantly. Where would you start?"}'::jsonb,
     now() - interval '13 days'),
    (v_user, v_cust, 'email', null, 'outbound', 'Where to start with a consolidation',
     '{"body":"Most teams start with the highest-volume channel and migrate the rest once routing is stable. Sent a one-page outline of that sequence."}'::jsonb,
     now() - interval '11 days'),
    (v_user, v_cust, 'email', null, 'inbound', 'Re: Where to start with a consolidation',
     '{"body":"Useful, thanks. We are mid-quarter so this is a January project, but keep me on the list."}'::jsonb,
     now() - interval '9 days');

  -- ==========================================================================
  -- 3. Tal Bar-On - late stage, phone-heavy, an escalation.
  -- ==========================================================================
  insert into public.customers
    (user_id, name, company, email, phone, job_title, lifecycle_stage,
     stage_changed_at, customer_need, tags, avatar_url, created_at)
  values
    (v_user, 'Tal Bar-On', 'Meridian Health', 'tal.baron@meridianhealth.example',
     '+972 50 993 2210', 'IT Procurement Manager', 'contracting',
     now() - interval '3 days',
     'Needs data residency confirmed in writing before legal will approve the contract.',
     '["demo","Enterprise","Security review"]'::jsonb,
     '/demo-avatars/tal-baron.svg', now() - interval '34 days')
  returning id into v_cust;

  insert into public.channel_events
    (user_id, customer_id, channel, type, direction, subject, content, occurred_at)
  values
    (v_user, v_cust, 'web', 'support_request', 'inbound', 'Security questionnaire',
     '{"message":"Sending over our standard security questionnaire. We cannot progress to legal without it completed."}'::jsonb,
     now() - interval '34 days'),
    (v_user, v_cust, 'email', null, 'outbound', 'Completed security questionnaire',
     '{"body":"Questionnaire returned in full, with the sub-processor list and our data residency statement attached."}'::jsonb,
     now() - interval '28 days'),
    (v_user, v_cust, 'whatsapp', null, 'outbound', null,
     '{"message":"Checking in - did legal have everything they needed from the questionnaire?"}'::jsonb,
     now() - interval '10 days');

  insert into public.channel_events
    (user_id, customer_id, channel, type, direction, subject, content, occurred_at)
  values
    (v_user, v_cust, 'phone', null, 'outbound', null,
     '{"what_the_customer_wanted":"To know whether we can commit to EU-only data residency as a contractual term rather than a policy statement.","outcome":"Could not answer definitively on the call. Escalated to our legal contact for a written position."}'::jsonb,
     now() - interval '4 days')
  returning id into v_event;

  insert into public.agent_notes
    (user_id, customer_id, channel_event_id, note, status, follow_up_required)
  values
    (v_user, v_cust, v_event,
     'This is the only thing between us and signature. Legal needs to give a yes or no in writing, not a maybe.',
     'escalated', true);

  insert into public.follow_ups
    (user_id, customer_id, title, source, status, due_at, created_at)
  values
    (v_user, v_cust, 'Get a written position on EU-only data residency from legal',
     'manual', 'pending', now() + interval '1 day', now() - interval '4 days');

  -- ==========================================================================
  -- 4. Noa Shapira - deliberately thin history. Useful for showing that the AI
  --    says so and reports low confidence rather than inventing a story.
  -- ==========================================================================
  insert into public.customers
    (user_id, name, company, email, phone, job_title, lifecycle_stage,
     stage_changed_at, customer_need, tags, avatar_url, created_at)
  values
    (v_user, 'Noa Shapira', 'Vertex Studio', 'noa@vertexstudio.example',
     null, 'Founder', 'new_lead', now() - interval '1 day', null,
     '["demo"]'::jsonb,
     '/demo-avatars/noa-shapira.svg', now() - interval '1 day')
  returning id into v_cust;

  insert into public.channel_events
    (user_id, customer_id, channel, type, direction, subject, content, occurred_at)
  values
    (v_user, v_cust, 'web', 'contact_form', 'inbound', 'Quick question',
     '{"message":"Do you have a plan for very small teams?"}'::jsonb,
     now() - interval '1 day');

  -- ==========================================================================
  -- 5. Eitan Regev - closed won, everything tidy. Shows a finished lifecycle and
  --    a genuinely empty Open follow-ups count rather than an absent one.
  -- ==========================================================================
  insert into public.customers
    (user_id, name, company, email, phone, job_title, lifecycle_stage,
     stage_changed_at, customer_need, tags, avatar_url, created_at)
  values
    (v_user, 'Eitan Regev', 'Skyline Foods', 'eitan.regev@skylinefoods.example',
     '+972 53 220 7741', 'Customer Service Director', 'closed_won',
     now() - interval '7 days',
     'Wanted phone notes and email threads in one place so agents stop asking customers to repeat themselves.',
     '["demo","Reference customer"]'::jsonb,
     '/demo-avatars/eitan-regev.svg', now() - interval '61 days')
  returning id into v_cust;

  insert into public.channel_events
    (user_id, customer_id, channel, type, direction, subject, content, occurred_at)
  values
    (v_user, v_cust, 'web', 'demo_request', 'inbound', 'Demo request',
     '{"message":"Our agents ask customers to repeat themselves constantly because the history is split across tools. Can we see how you handle that?"}'::jsonb,
     now() - interval '61 days'),
    (v_user, v_cust, 'email', null, 'outbound', 'Demo booked and agenda',
     '{"body":"Booked for Thursday. Agenda: unified timeline, phone notes, and how agents pick up a conversation mid-thread."}'::jsonb,
     now() - interval '58 days'),
    (v_user, v_cust, 'whatsapp', null, 'inbound', null,
     '{"message":"Team loved it. Sending this to finance today."}'::jsonb,
     now() - interval '30 days'),
    (v_user, v_cust, 'email', null, 'inbound', 'Signed order form',
     '{"body":"Signed order form attached. Looking forward to getting the team on this."}'::jsonb,
     now() - interval '8 days');

  insert into public.channel_events
    (user_id, customer_id, channel, type, direction, subject, content, occurred_at)
  values
    (v_user, v_cust, 'phone', null, 'inbound', null,
     '{"what_the_customer_wanted":"To confirm onboarding dates and how many of his agents need training.","outcome":"Onboarding set for the first week of next month. Two training sessions agreed, 12 agents each."}'::jsonb,
     now() - interval '7 days')
  returning id into v_event;

  insert into public.agent_notes
    (user_id, customer_id, channel_event_id, note, status, follow_up_required)
  values
    (v_user, v_cust, v_event,
     'Happy to be a reference for other service teams once onboarding is done.',
     'resolved', false);

  insert into public.follow_ups
    (user_id, customer_id, title, source, status, due_at, created_at)
  values
    (v_user, v_cust, 'Confirm onboarding dates with the enablement team',
     'manual', 'completed', now() - interval '6 days', now() - interval '7 days');

  raise notice 'Demo data seeded for % - 5 customers tagged "demo".', v_email;
end $$;

-- Check what landed.
select
  c.name,
  c.company,
  c.lifecycle_stage,
  (select count(*) from public.channel_events e where e.customer_id = c.id) as events,
  (select count(*) from public.agent_notes n where n.customer_id = c.id)   as notes,
  (select count(*) from public.follow_ups f
     where f.customer_id = c.id and f.status = 'pending')                  as open_follow_ups
from public.customers c
where c.tags ? 'demo'
order by c.created_at desc;
