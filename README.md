# OneContext: AI-Powered Omnichannel CRM

OneContext unifies customer interactions from four channels into one chronological
history, derives metrics from that history, and uses Google Gemini to propose the
next action a human confirms. Built as a three-day full-stack vertical slice: Google
sign-in, per-user data isolation enforced by Postgres, four working channels, a
merged timeline, and an AI recommendation that cannot write to the CRM on its own.

## Live Demo

[one-context.vercel.app](https://one-context.vercel.app) — sign in with any Google
account. A new account starts empty; the seeded walkthrough data belongs to the
owner's account, because Row Level Security scopes every row to the user who created
it.

## Screenshots

![Customer workspace with a OneContext AI insight](docs/evidence/day3/ai%20suggestion.png)

The three-zone workspace. OneContext AI has read this customer's stored history and returned a summary, topics, two risks and one recommended action, citing the six events it relied on. Every figure in the KPI cards is derived from stored rows.

![Activity timeline with phone calls and an internal note](docs/evidence/day2/internal%20phone%20note.png)

The merged timeline. A phone call shows what the customer wanted and the outcome as separate fields, with its linked agent note contributing the status and follow-up flag. The internal note appears only when it says something the outcome does not.

![A follow-up created from an AI recommendation](docs/evidence/day3/ai%20follow%20up%20noa.png)

The recommendation became a task, badged *From OneContext AI*. That badge renders only for `source = ai_recommendation`, which the confirmation form alone writes, so it is proof a human accepted it.

![Engagement counts across channels](docs/evidence/day2/email%20logged%2C%20three%20channels.png)

Engagement per channel and a 14-day activity trend, both computed from stored events. `Open follow-ups` reads *Not available* here because nothing had queried `follow_ups` yet - distinct from a measured zero.

More in [`docs/evidence/`](docs/evidence/), organised by day, each with a note on
what it proves.

## Problem

A single customer's history is scattered across an email thread, a WhatsApp chat, a
web form, a phone call nobody wrote down, and a colleague's private notes. The team
pays for that: time lost reconstructing context before every conversation, customers
asked to repeat themselves, follow-ups dropped because nothing owns them, and
decisions made on partial information because assembling the full picture costs more
than the decision appears to be worth.

## Solution

OneContext solves that by making every interaction a stored record on one timeline,
then computing what can be computed and asking a model only for what genuinely needs
interpretation. Web forms, WhatsApp messages, emails and phone notes write real rows;
metrics are derived from those rows rather than estimated; and OneContext AI reads the
stored history to produce a summary, risks and one recommended action, with the events
it relied on cited. The recommendation becomes a task only when a human confirms it.

## Stack

- **React 19 + Vite 8 + TypeScript 7** — fast builds and strict types. `tsc` runs
  over the browser and the serverless function as two separate projects, so browser
  globals are unavailable in server code by accident.
- **react-router-dom 7** — route-level code splitting, so the login screen does not
  ship the customer workspace.
- **Supabase: Postgres, Auth and Row Level Security** — the reason isolation is
  enforced by the database rather than by application code. Google OAuth comes with
  it.
- **Vercel** — one deploy covers the static SPA and the serverless function, with
  firewall rules and per-function timeouts configured alongside.
- **Google Gemini `gemini-3.1-flash-lite`** — fast and cheap for a small prompt, and
  it supports a forced response schema, which is what makes a structured contract
  practical. Reached only through a server-side function.
- **Vitest** — 82 tests over the deterministic logic: the timeline merge, the metric
  derivations, the AI response validator and the confidence ceiling. `npm run build`
  runs them, so a failing test blocks a deploy.

Deliberately not used: Next.js, an ORM, a state-management library and a UI kit. The
app is hand-written TypeScript with CSS design tokens, which keeps the number of
things that can surprise you small.

## Architecture & Workflow

```
[Google sign-in via Supabase Auth]
              |
              v
[Customer workspace] --- Web form ----+
                     --- WhatsApp ----+
                     --- Email -------+--> [channel_events] --+
                     --- Phone -------+                       |
                              |                               +--> [merged timeline]
                              +--> [agent_notes] -------------+           |
                                                                          v
                                                          [deterministic metrics]
                                                                          |
                                                                          v
                              [/api/insight  -->  Gemini 3.1 Flash Lite]  |
                                        |  validated, cited, capped       |
                                        v                                 |
                              [OneContext AI panel] <---------------------+
                                        |
                                        v
                              [human confirms] --> [follow_ups]
```

The browser never holds the Gemini key and never asserts who it is. The serverless
function verifies the caller's Supabase token, reads customer data under that token
so Row Level Security decides what the prompt may contain, validates the model
response before storing anything, and returns a recommendation the user must confirm
before it becomes a task.

## Core Concepts

### 1. Row Level Security as the isolation mechanism

- **Files**: `supabase/migrations/0001_init.sql`, `src/data/customers.ts`
- **Demonstration**: every user-owned table has `user_id uuid not null default
  auth.uid()` with policies scoped `to authenticated` comparing `auth.uid() =
  user_id`. The browser therefore never sends an ownership value, and queries carry
  no `user_id` filter — `listCustomers()` selects every customer and receives only
  yours. Forgetting a filter cannot leak data because filtering was never the
  mechanism.

### 2. Omnichannel timeline

- **Files**: `src/lib/timeline.ts`, `src/components/customer/ActivityTimeline.tsx`,
  `supabase/migrations/0002_phone_interactions.sql`
- **Demonstration**: each channel writes a real `channel_events` row with the fields
  that channel actually has. A phone call writes two rows — the event plus a linked
  `agent_notes` row carrying status and a follow-up flag — inside one `SECURITY
  INVOKER` Postgres function, so they share a transaction and RLS still governs both
  inserts. `buildTimeline()` merges both tables newest-first with ties broken by id,
  so ordering never depends on the order Postgres returned rows.

### 3. Deterministic metrics

- **Files**: `src/lib/metrics.ts`, `src/components/customer/KpiCards.tsx`
- **Demonstration**: a measured zero and an absent measurement are shown differently.
  `Total interactions: 0` is a fact once `channel_events` has been read; `Days since
  last contact` reads *Not available* until an event exists. While a query is in
  flight every history-derived card reports *Not available* rather than flashing a
  zero that looks measured.

### 4. The AI contract

- **Files**: `api/insight.ts`, `api/_shared/insight.ts`
- **Demonstration**: the model is given a forced response schema and its output is
  validated anyway, because a schema cannot guarantee non-empty text and cannot know
  which event ids exist. Cited ids are filtered to those actually supplied and
  invented ones are reported. Nothing is stored unless validation passes, so a
  malformed response leaves CRM data untouched. Confidence is capped by evidence: a
  single interaction can only ever be `low`, computed from event and channel counts
  rather than requested in the prompt where it could be reasoned away.

### 5. Security

- **Files**: `api/insight.ts`, `vercel.json`, `supabase/migrations/`
- **Demonstration**: `GEMINI_API_KEY` is read from the server environment and sent as
  a header rather than a URL parameter, and is absent from the deployed bundle.
  Anonymous reads return `200 []` on all five tables and anonymous writes are refused
  with `42501`. A cross-account customer id returns `404`, indistinguishable from
  missing. Two abuse controls sit in front of the model: 20 insights per user per hour
  in the function, and a Vercel firewall rule capping `/api/*` at 30 requests per
  minute per IP.

### 6. Human confirmation

- **Files**: `src/components/customer/AiPanel.tsx`,
  `src/components/customer/CreateFollowUpForm.tsx`
- **Demonstration**: `follow_ups.source` records `manual` or `ai_recommendation`, and
  the latter is only ever written by the confirmation form. The AI pre-fills a title;
  the user edits and submits. A task badged *From OneContext AI* is therefore proof a
  human accepted it.

## Project Structure

- `api/insight.ts` — serverless function: auth verification, prompt, validation, persistence
- `api/_shared/insight.ts` — the AI contract, its validator and the confidence ceiling
- `src/data/` — one module per table, all relying on RLS rather than manual filtering
- `src/lib/` — channels, lifecycle, metrics, timeline merge, formatters
- `src/components/customer/` — workspace header, lifecycle bar, timeline, KPIs, AI panel
- `src/pages/` — login, customers list, customer workspace, not found
- `supabase/migrations/` — schema, RLS policies and functions, in run order
- `supabase/seed/demo_data.sql` — five demo customers, safe to re-run
- `docs/evidence/` — screenshots per day, with what each one proves

## Setup & Running Locally

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Create the Supabase project and schema**. Run the four migrations in
   `supabase/migrations/` in numeric order in the Supabase SQL Editor. Optionally run
   `supabase/seed/demo_data.sql` for five customers with history across all four
   channels — it is safe to re-run and only ever deletes rows it created itself.

3. **Enable Google sign-in**. Create an OAuth 2.0 Client ID in Google Cloud Console,
   set its redirect URI to the callback URL shown in the Supabase Google provider
   panel, then paste the client ID and secret there. Under URL Configuration add
   `http://localhost:5173/customers` to the redirect list — sign-in fails silently
   without it, because the client requests that path explicitly.

4. **Configure the environment**:

   ```bash
   cp .env.example .env.local
   ```

   Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase, and
   `GEMINI_API_KEY` from Google AI Studio. The `VITE_` prefix is what publishes a
   value to the browser, so the Gemini key must never carry it. The publishable
   Supabase key is meant to be public — it identifies the project and carries no
   authority of its own, because RLS decides what it can read.

5. **Run the app**:

   ```bash
   npm run dev       # SPA only; /api/insight returns 404
   npm run dev:api   # vercel dev: SPA plus serverless functions
   ```

   The AI panel needs `dev:api` or the deployed URL, since plain Vite does not serve
   functions. `npm run build` typechecks both projects and runs 82 tests before
   building, so a failing test blocks a deploy.

## Usage

1. Sign in with Google and open a customer from the list.
2. Use **Add event** to log an interaction on any of the four channels. A phone call
   additionally records what the customer wanted, the outcome, a status and an
   optional internal note.
3. Watch the KPI cards and engagement counts change — every number comes from the
   rows you just wrote.
4. Ask OneContext AI one of the three suggested questions. Read the cited events under
   *Based on*; clicking one jumps to that entry in the timeline.
5. Press **Create follow-up** to turn the recommendation into a task. The form opens
   pre-filled and editable; nothing is stored until you submit.

Two accounts are worth comparing in the seeded data: Maya Feldman has six
interactions across all four channels and a churn-risk note, while Noa Shapira has a
single enquiry — the AI reports low confidence for her and declines to invent a
history.

## Notes

OneContext is a demonstration of one narrow vertical slice, not a production CRM. The
four channels are logging forms rather than real integrations: there is no WhatsApp
Business API, no email ingestion and no telephony, and the interface says so wherever
a user might assume otherwise. Teams, roles, cross-customer inbox routing, an SLA
engine and campaign automation are all out of scope, as is any agent that acts without
confirmation.

The design principle throughout is to compute what can be computed and ask a model
only for what needs interpretation. Counting interactions, deriving active channels
and bounding confidence by evidence are all deterministic and tested; summarising
intent and proposing a next step are not, and those are the only jobs the AI is given.

Project artifacts: [GOAL.md](GOAL.md), [FEATURESPEC.md](FEATURESPEC.md),
[DESIGN-GUIDELINES.md](DESIGN-GUIDELINES.md), [PLAN.md](PLAN.md).
