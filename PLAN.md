# Plan: OneContext (3 days)

> **OneContext — every customer interaction, one clear next step.**

## Product direction

Build the smallest full-stack vertical slice of a professional omnichannel CRM workspace:

Google login → OneContext customer workspace → four channel events → unified timeline → deterministic CRM metrics → OneContext AI insight → confirmed follow-up → Vercel deployment.

The visual direction uses the supplied CRM screenshot as a reference for information architecture: left customer context, central workspace, lifecycle stage, KPI cards, activity sections and a contextual **OneContext AI** assistant on the right. Do not reproduce the reference product's branding or exact UI.

## Day 1 — Foundation, auth and customer workspace

### Goal

Get a secure, navigable OneContext product shell with real Supabase data.

### Tasks

- [x] Create React + Vite + TypeScript project.
- [x] Install Supabase client and React Router.
- [x] Create Supabase project.
- [x] Create tables from `FEATURESPEC.md`.
- [x] Add indexes on `user_id`, `customer_id`, `occurred_at`.
- [x] Enable RLS on all user-owned tables.
- [x] Add RLS policies using `auth.uid() = user_id`.
- [x] Enable Google OAuth in Supabase.
- [x] Add local environment variables.
- [x] Create Supabase client module.
- [x] Implement auth hook and auth state listener.
- [x] Implement OneContext Login screen.
- [x] Implement protected OneContext application shell.
- [x] Implement Customers list with search and empty state.
- [x] Implement Create customer form.
- [x] Implement OneContext customer workspace header and lifecycle bar.
- [x] Add design tokens and base layout matching the approved visual direction.

### Day 1 verification

- [x] `npm run build` passes. — `tsc --noEmit` clean, 103 modules, 757 ms.
- [x] Google login works locally. — signed in as a Google account; `/auth/v1/settings` reports `external.google = true`.
- [x] A user sees only their own customers. — verified with two accounts.
- [x] Customer creation stores the authenticated `user_id`. — browser sends no `user_id`; Postgres fills `default auth.uid()`.
- [x] Direct access to another user's customer is blocked by RLS. — foreign UUID renders "Customer not found"; anonymous insert rejected with `42501`.

### Day 1 evidence

See [`docs/evidence/day1/`](docs/evidence/day1/).

- [x] Screenshot: Customers list after Google sign-in — `1 land on customers and the top bar shows your email.png`.
- [x] Screenshot: Customer list with the create-success banner — `green customer created.png`.
- [x] Screenshot: OneContext customer workspace header, lifecycle bar and KPI cards — `customer overview.png`.
- [x] Screenshot: RLS blocking another account's customer — `rls validation customer not found.png`.
- [x] Screenshot: Form validation states — `validation customer name.png`, `email validation.png`.
- [x] Customers empty state — verified in the browser: an account with no customers showed "No customers yet" with the Create customer call to action. No screenshot artifact; the account held data by the time screenshots were taken.
- [x] Commit/PR reference — pushed to [github.com/galpalex/OneContext](https://github.com/galpalex/OneContext), branch `main`, commit `b790944`.

## Day 2 — Omnichannel timeline and CRM workflow

### Goal

Make the OneContext customer workspace useful: every channel produces a real event and the workspace makes the history understandable.

### Tasks

- [x] Implement `/customers/:id` route.
- [ ] Load customer, events, notes and follow-ups. — customer, events and notes done; follow-ups pending.
- [x] Merge events and notes into a deterministic timeline. — `buildTimeline` with 8 unit tests; a phone note attaches to its event instead of duplicating it.
- [x] Sort by `occurred_at` / `created_at`. — newest first; a backdated event sorted below a newer one.
- [x] Add channel badges and icons.
- [x] Build Web event form.
- [x] Build WhatsApp simulation.
- [x] Build Email logging form.
- [x] Build Phone customer-service note form. — writes a phone event and a linked agent note in one transaction. **Requires migration `0002_phone_interactions.sql`.**
- [x] Add type, direction and status fields. — type (web), direction (whatsapp/email/phone), status and follow-up flag (phone note).
- [x] Add event success feedback. — green "Event logged" banner.
- [x] Add error handling and retry. — timeline has its own error state and retry, separate from the customer load.
- [x] Add Overview KPI cards based only on stored records.
- [x] Add engagement section with simple activity trend. — per-channel counts plus a 14-day trend.
- [ ] Add Next steps area.
- [ ] Add follow-up creation form.
- [ ] Add responsive behavior for narrow screens.

### Day 2 verification

- [x] Every channel creates an event owned by the current user. — web, whatsapp, email and phone all verified in the browser.
- [x] Timeline displays events from all four channels. — `phone.png`; engagement reads Web 2 / WhatsApp 1 / Email 1 / Phone 1.
- [x] Phone submission creates both a phone event and an agent note. — the Resolved badge on the phone entry can only come from the linked `agent_notes` row.
- [x] Metrics change when new events are added. — Total interactions went 1 → 2, trend gained a second bar.
- [ ] Empty and error states are visible and usable.
- [x] No fake metrics are shown when data is missing. — Open follow-ups still reads "Not available" while Total interactions shows a measured 0.

### Day 2 evidence

See [`docs/evidence/day2/`](docs/evidence/day2/).

- [x] Slice 2, WhatsApp and Email — `whatsapp inbound.png`, `whatsapp logged.png`, `email outbound form.png`, `email logged, three channels.png`.
- [x] Slice 1, Web channel — `add event.png`, `event logged.png`, `event logged bottom.png`, `add event future validation.png`, `2 events, earlier is at top.png`.
- [x] Timeline with all four channels — `phone.png`.
- [x] Phone note showing customer-service context — `phone.png`, with "What the customer wanted" above "Outcome" and the note status shown as a badge.
- [ ] Next steps area.
- [x] Commit/PR reference — `b7e4f3e` on [github.com/galpalex/OneContext](https://github.com/galpalex/OneContext).

## Day 3 — OneContext AI, security review and deployment

### Goal

Turn customer history into a safe, structured and user-confirmed next action through OneContext AI.

### Tasks

- [ ] Create Vercel serverless function `/api/insight`.
- [ ] Verify authenticated Supabase user server-side.
- [ ] Retrieve customer data using the authenticated user, not client-supplied ownership.
- [ ] Build compact prompt with customer context, events and notes.
- [ ] Call Gemini using server-only `GEMINI_API_KEY`.
- [ ] Require JSON output matching the OneContext AI contract.
- [ ] Validate the response before returning it.
- [ ] Save insight with source event IDs.
- [ ] Build right-side OneContext AI assistant panel.
- [ ] Add prompt shortcuts: summarize history, identify risks, suggest next action.
- [ ] Add loading, error and retry states.
- [ ] Add explicit `Create follow-up` confirmation from recommendation.
- [ ] Add source references to the AI result.
- [ ] Add seed/demo data for a compelling walkthrough.
- [ ] Run security review for RLS, env variables and API access.
- [ ] Run production build.
- [ ] Deploy frontend and function to Vercel.
- [ ] Configure Supabase OAuth redirect URLs for local and production.
- [ ] Add Vercel environment variables.

### Day 3 verification

- [ ] OneContext AI result contains summary, topics, risks and next action.
- [ ] OneContext AI does not expose records belonging to another user.
- [ ] Invalid or failed AI responses do not corrupt CRM data.
- [ ] Follow-up is created only after explicit user action.
- [ ] Production URL supports login and the full demo flow.
- [ ] `npm run build` passes in the deployment environment.

### Day 3 evidence

- Screenshot: OneContext AI panel with customer-specific summary.
- Screenshot: Source events supporting the summary.
- Screenshot: Confirmed follow-up created from AI recommendation.
- Public Vercel URL.
- Short README walkthrough.
- Final commit/PR reference.

## Demo walkthrough

1. Open the public OneContext Vercel URL.
2. Sign in with Google.
3. Open the seeded customer account.
4. Point out tags, lifecycle stage and contact methods.
5. Show deterministic metrics: event count, active channels and last contact.
6. Scroll through the unified timeline.
7. Add a Phone customer-service note: what the customer wanted and the outcome.
8. Open OneContext AI and generate an insight.
9. Show summary, topics, risks and source event IDs.
10. Click `Create follow-up` and confirm the action.
11. Explain the architecture: React/Vite, Supabase Auth/Postgres/RLS, Vercel Function, Gemini.

## Presentation proof points

- OneContext centralizes CRM data into a 360-degree customer view.
- Four channels become one chronological customer history.
- Phone notes preserve what customer service learned on the call.
- Deterministic metrics remain under application control.
- OneContext AI adds interpretation and next-best-action guidance.
- The user confirms actions; AI does not silently modify records.
- RLS protects customer data between accounts.
- The architecture is intentionally smaller than enterprise CRM platforms, so it can be built and demonstrated in three days.

## Deferred work

- Real WhatsApp Business API.
- Real email ingestion and threading.
- Telephony provider and call transcription.
- Team workspaces and roles.
- Full inbox routing and SLA engine.
- Campaign automation.
- Advanced forecasting.
- Audit logs and enterprise compliance.
