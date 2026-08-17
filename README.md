# OneContext

> Every customer interaction, one clear next step.

An AI-powered omnichannel CRM workspace for small customer-facing teams. Web
requests, WhatsApp messages, emails and phone notes become one customer history,
and OneContext AI proposes a single next action that a human confirms.

**Stack:** React + Vite + TypeScript · react-router-dom · Supabase (Postgres,
Auth, RLS) · Vercel · Google Gemini through a Vercel serverless function.

---

## Current status: Day 1 slice

Implemented:

- Google OAuth sign-in through Supabase Auth, with session restore and sign-out.
- Protected application shell: top bar, workspace/user context, profile menu, left navigation.
- Customers list with search, lifecycle-stage filter and loading / empty / error / success states.
- Create-customer form with validation and submitting state.
- Customer workspace shell: header, read-only lifecycle bar, left context rail,
  deterministic KPI cards and the OneContext AI rail in its final position.
- Full schema with indexes and Row Level Security for all five tables.

Not implemented yet (later iterations): channel event capture, unified timeline,
follow-ups, and the `/api/insight` serverless function that calls Gemini.

Metrics that would require channel events or follow-ups display
**Not available** rather than a zero, so no number on screen is invented.

---

## Local setup

### 1. Install

```bash
npm install
```

### 2. Create the Supabase project and schema

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it.
   This creates the five tables, their indexes, and enables RLS with
   `auth.uid() = user_id` policies.

### 3. Enable Google sign-in

1. In Google Cloud Console create an **OAuth 2.0 Client ID** of type *Web application*.
2. Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase: **Authentication → Providers → Google**, enable it and paste the
   client ID and client secret.
4. In Supabase: **Authentication → URL Configuration**, set
   - Site URL: `http://localhost:5173`
   - Additional redirect URLs: `http://localhost:5173/customers`

### 4. Environment variables

```bash
cp .env.example .env.local
```

| Variable                  | Where it comes from                              |
| ------------------------- | ------------------------------------------------ |
| `VITE_SUPABASE_URL`       | Supabase → Project Settings → API → Project URL  |
| `VITE_SUPABASE_ANON_KEY`  | Supabase → Project Settings → API → anon/publishable key |

Only the anon/publishable key belongs in the browser. Service-role keys and
`GEMINI_API_KEY` are server-only and are never added to a `VITE_` variable.

### 5. Run

```bash
npm run dev
```

`npm run dev` serves the SPA only. Once `/api` functions exist, use `npm run dev:api`
(`vercel dev`) to serve the app and the serverless functions together.

---

## Scripts

| Script              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Vite dev server on port 5173                |
| `npm run dev:api`   | `vercel dev` — SPA plus serverless functions |
| `npm run typecheck` | `tsc --noEmit`                               |
| `npm run build`     | Typecheck, then production build to `dist/`  |
| `npm run preview`   | Serve the production build locally           |

---

## Security model

- Row Level Security is enabled on `customers`, `channel_events`, `agent_notes`,
  `ai_insights` and `follow_ups`. Every policy is scoped to the `authenticated`
  role and compares the row owner with `auth.uid()`.
- `user_id` defaults to `auth.uid()` in Postgres, so the browser never sends an
  ownership value, and the RLS `WITH CHECK` clause re-verifies it on write.
- Child tables additionally verify that the referenced customer belongs to the
  caller, so a row can never be attached to another account's customer.
- The browser bundle carries only the Supabase URL and anon key.
- AI recommendations will require explicit user confirmation before any CRM
  record is created or changed.

---

## Repository layout

```
src/
  auth/         AuthProvider, useAuth, ProtectedRoute
  components/
    customer/   workspace header, lifecycle bar, KPI cards, rails
    customers/  list table, filters, create form
    shell/      top bar, side navigation, app shell, brand mark
    states/     loading / empty / error components
    ui/         button, card, badge, field, modal, icon
  data/         Supabase queries
  lib/          client, types, lifecycle model, formatters
  pages/        login, customers, customer workspace, not found
  styles/       tokens, global, layout, components
supabase/
  migrations/   0001_init.sql
```

Project artifacts: [GOAL.md](GOAL.md) · [FEATURESPEC.md](FEATURESPEC.md) ·
[DESIGN-GUIDELINES.md](DESIGN-GUIDELINES.md) · [PLAN.md](PLAN.md).
