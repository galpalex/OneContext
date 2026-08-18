# OneContext

**Every customer interaction, one clear next step.**

An AI-powered omnichannel CRM workspace for small customer-facing teams. Web
requests, WhatsApp messages, emails and phone notes become one customer history —
and OneContext AI reads that history to propose a next action a human confirms.

**Live:** [one-context.vercel.app](https://one-context.vercel.app)

---

## The problem

Customer context is scattered. A single account's history lives across an email
thread, a WhatsApp chat, a web form submission, a call someone half-remembers, a
spreadsheet, and a colleague's private notes.

The cost lands on the customer-facing team:

- **Time lost reconstructing history** before every conversation.
- **Customers asked to repeat themselves**, which reads as incompetence.
- **Follow-ups dropped**, because nothing owns them.
- **What the customer actually cares about** is buried in a call nobody wrote down.
- **Decisions made on partial information**, because assembling the full picture
  costs more than the decision seems to be worth.

CRM systems answer this with a centralised customer profile, interaction history and
automation. OneContext demonstrates that principle in one narrow, complete vertical
slice — and pushes one step further: it does not stop at *showing* you the history,
it proposes what to do about it.

## What OneContext does

Four channels converge into a single chronological history, which is then turned
into a decision:

```
Web form ─┐
WhatsApp ─┤
Email ────┼──▶  one timeline  ──▶  deterministic metrics  ──▶  OneContext AI  ──▶  you confirm  ──▶  follow-up task
Phone ────┘                                                   (reads only
                                                              stored records)
```

The last arrow matters most. The AI never writes to the CRM. It proposes; a human
confirms; only then does a task exist.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19 + Vite 8 + TypeScript 7 | Fast builds, strict types, no framework lock-in |
| Routing | react-router-dom 7 | Route-level code splitting |
| Data & auth | Supabase — Postgres, Auth, Row Level Security | Isolation enforced by the database, not by application code |
| Hosting | Vercel — static SPA + serverless function | One deploy for both halves |
| AI | Google Gemini `gemini-3.1-flash-lite` | Fast, cheap, supports a forced response schema |
| Tests | Vitest — 82 tests, run before every build | Deterministic logic is tested, not eyeballed |

Deliberately **not** used: Next.js, an ORM, a state-management library, a UI kit.
The app is hand-written TypeScript and CSS with design tokens.

---

## How it works

### 1. Isolation is the database's job, not the application's

Every user-owned table has `user_id uuid not null default auth.uid()`, RLS enabled,
and policies scoped `to authenticated` comparing `auth.uid() = user_id`.

Two consequences:

- **The browser never sends an ownership value.** Postgres fills `user_id` from the
  verified JWT and the RLS `WITH CHECK` clause re-verifies it. There is no code path
  where a client could claim to be someone else, because the claim is never read.
- **Queries carry no `user_id` filter.** `listCustomers()` selects every customer and
  receives only yours. Forgetting a filter cannot leak data, because filtering was
  never the mechanism.

Child tables go further: their policies verify the referenced customer belongs to the
caller, so a row cannot be attached to another account's customer.

### 2. Four channels, one merged timeline

Each channel writes a real `channel_events` row. The shapes differ, following the
spec rather than forcing symmetry: web carries a request `type`, WhatsApp and email
carry a `direction`, email stores a `body` where the conversational channels store a
`message`.

Phone is the interesting one. One submission writes **two** rows — a `channel_events`
row and a linked `agent_notes` row carrying status and a follow-up flag — inside a
single `SECURITY INVOKER` Postgres function, so they share a transaction and RLS
still governs both inserts. A failure cannot leave an orphan event.

`buildTimeline()` merges both tables newest-first, sorting events by `occurred_at` and
standalone notes by `created_at`, with ties broken by id so ordering never depends on
the order Postgres returned rows. A note linked to an event attaches to it rather
than appearing twice.

### 3. Metrics are derived, never invented

A measured zero and an absent measurement are different facts, and the UI shows them
differently:

- `Total interactions: 0` — a fact, once `channel_events` has been read.
- `Days since last contact: Not available` — meaningless until an event exists.

Nothing is displayed that cannot be computed from stored rows. While a query is still
in flight, every history-derived card reports *Not available* rather than flashing a
zero that looks measured.

### 4. The AI is bounded on every side

Insight generation runs in a serverless function ([api/insight.ts](api/insight.ts)),
never the browser:

- **The key stays server-side.** `GEMINI_API_KEY` is read from the server environment
  and sent as an `x-goog-api-key` header — never a URL parameter, which would leak
  into proxy logs.
- **The caller is verified before any read.** The access token is checked with
  Supabase, then every query runs under that token, so RLS decides what the prompt
  can contain. A customer id belonging to someone else returns 404.
- **Output is schema-forced and then validated anyway.** A response schema cannot
  guarantee non-empty text, and cannot know which event ids exist — so cited ids are
  filtered to those actually supplied, and invented ones are reported rather than
  silently dropped.
- **Nothing is stored unless validation passes.** A malformed or failed response
  leaves CRM data untouched.
- **Confidence is capped by evidence.** A single interaction can only ever be `low`
  confidence, however clearly it reads. The ceiling is computed from event and channel
  counts, not requested in the prompt where it could be reasoned away.
- **Dates are localised before prompting**, so the model never states a calendar date
  that contradicts the timeline beside it.
- **Generation is rate limited** to 20 per user per hour, checked before any read or
  model call.

### 5. The AI cannot act

`follow_ups.source` records `manual` or `ai_recommendation`. The value
`ai_recommendation` is only ever written by the confirmation form — the AI pre-fills a
title, you edit and submit. A task badged **From OneContext AI** in the app is
therefore proof that a human accepted it.

---

## Screenshots

See [`docs/evidence/`](docs/evidence/) for the full set, captured against the deployed
app.

| Screenshot | Shows |
| --- | --- |
| [Customer workspace](docs/evidence/day2/phone.png) | Three zones: identity, timeline, AI |
| [AI insight with sources](docs/evidence/day3/ai%20suggestion.png) | Summary, topics, risks, next action, six cited events |
| [Thin history](docs/evidence/day3/noa%20summary.png) | One interaction, low confidence, nothing invented |
| [Confirmed follow-up](docs/evidence/day3/ai%20follow%20up%20noa.png) | Stored task badged *From OneContext AI* |

---

## Running it locally

### 1. Install

```bash
npm install
```

### 2. Supabase project and schema

Create a project at [supabase.com](https://supabase.com), then run these in the
**SQL Editor**, in order:

| File | What it does |
| --- | --- |
| [`0001_init.sql`](supabase/migrations/0001_init.sql) | Five tables, indexes, RLS enabled, 20 policies |
| [`0002_phone_interactions.sql`](supabase/migrations/0002_phone_interactions.sql) | Note↔event link, transactional phone logging |
| [`0003_phone_internal_note.sql`](supabase/migrations/0003_phone_internal_note.sql) | Optional internal note on a call |
| [`0004_customer_avatar.sql`](supabase/migrations/0004_customer_avatar.sql) | Optional `avatar_url` |

Optional: [`seed/demo_data.sql`](supabase/seed/demo_data.sql) creates five customers
with history across all four channels. Safe to re-run — every row it creates is tagged
`demo` and it only ever deletes rows carrying that tag, so your own data is untouched.
Remove it with `delete from public.customers where tags ? 'demo';`

### 3. Google sign-in

1. Google Cloud Console → create an **OAuth 2.0 Client ID** (Web application).
2. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` —
   copy the exact value from the Supabase Google provider panel.
3. Supabase → **Authentication → Sign In / Providers → Google**: enable, paste the
   client ID and secret.
4. Supabase → **Authentication → URL Configuration**: Site URL
   `http://localhost:5173`, and add `http://localhost:5173/customers` to redirect
   URLs. Sign-in fails silently without that second entry, because the client
   requests it explicitly.

### 4. Environment

```bash
cp .env.example .env.local
```

| Variable | Exposed to browser | Source |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes, by design | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | yes, by design | same page — publishable key |
| `GEMINI_API_KEY` | **no** | Google AI Studio |

The `VITE_` prefix is what publishes a value to the browser. The publishable key is
meant to be public — it identifies the project and carries no authority of its own;
RLS decides what it can read. `GEMINI_API_KEY` carries real authority and therefore
must never take that prefix.

### 5. Run

```bash
npm run dev       # SPA only — /api/insight returns 404
npm run dev:api   # vercel dev: SPA plus serverless functions
```

The AI panel needs `dev:api` (or the deployed URL), since plain Vite does not serve
functions.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run dev:api` | `vercel dev` — SPA plus functions |
| `npm run typecheck` | `tsc` over the browser and function projects separately |
| `npm test` | 82 Vitest tests |
| `npm run build` | Typecheck both projects, run tests, then build |
| `npm run preview` | Serve the production build |

`npm run build` runs the tests, so a failing test blocks a deploy rather than
shipping.

---

## Security

Verified against the live deployment:

| Check | Result |
| --- | --- |
| Anonymous read, all five tables | `200 []` — RLS returns nothing despite data existing |
| Anonymous write, all five tables | `401 / 42501` on every one |
| Phone RPC called anonymously | `401 / 42501` — `SECURITY INVOKER` keeps RLS in force |
| Cross-account customer via the API | `404`, indistinguishable from missing |
| Gemini key in the deployed bundle | absent |
| Key in URL, request body, response, or error | absent |
| API surface | `GET`→405; no/bad/forged auth→401; missing id→400 |
| Production dependencies | 0 vulnerabilities |

Layered abuse controls: **20 insights per user per hour** in the function, and a
Vercel firewall rule limiting `/api/*` to **30 requests per minute per IP** — the
first bounds model spend by an authenticated account, the second bounds function
invocations by anyone. Both verified firing.

Known and accepted: signups are open, because "any user can sign in with Google" is a
project requirement — a stranger gets their own empty workspace, and RLS guarantees
nothing more. The per-user limit counts stored insights, so a generation that fails
validation costs a call without counting against it. Ten dev-dependency advisories
exist in build tooling (`@vercel/node`'s chain); none appear in the shipped bundle and
production dependencies audit clean.

## Repository layout

```
api/
  insight.ts          serverless function: auth, prompt, validation, persistence
  _shared/insight.ts  the AI contract, its validator and the confidence ceiling
src/
  auth/               AuthProvider, useAuth, ProtectedRoute
  components/
    customer/         workspace header, lifecycle bar, timeline, KPIs, AI panel
    customers/        list, filters, create form
    shell/            top bar, navigation, brand mark
    states/           loading, empty, error
    ui/               button, card, badge, field, modal, avatar, icon
  data/               Supabase queries per table
  lib/                channels, lifecycle, metrics, timeline merge, formatters
  pages/              login, customers, workspace, not found
  styles/             tokens, global, layout, components
supabase/
  migrations/         schema, RLS policies, functions
  seed/               demo data
docs/evidence/        screenshots per day
```

Unit tests sit beside the code they cover:
[`timeline.test.ts`](src/lib/timeline.test.ts),
[`metrics.test.ts`](src/lib/metrics.test.ts),
[`_shared/insight.test.ts`](api/_shared/insight.test.ts),
[`api/insight.test.ts`](api/insight.test.ts).

## Not in scope

Real WhatsApp Business API, email ingestion or telephony integration — the channels
are logging forms, and the app says so wherever a user might assume otherwise. Also
out: teams, roles, cross-customer inbox routing, an SLA engine, campaign automation,
and any autonomous agent that acts without confirmation.

Project artifacts: [GOAL.md](GOAL.md) · [FEATURESPEC.md](FEATURESPEC.md) ·
[DESIGN-GUIDELINES.md](DESIGN-GUIDELINES.md) · [PLAN.md](PLAN.md)
