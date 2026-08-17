# OneContext — Claude Code Handoff

> **OneContext — every customer interaction, one clear next step.**

## Read first

Read these files in order before creating or editing application code:

1. `GOAL.md` — stable source of truth: outcome, scope, success criteria and stop rules.
2. `FEATURESPEC.md` — product behavior, data model, routes, AI contract and security constraints.
3. `DESIGN-GUIDELINES.md` — original UX direction and component requirements.
4. `PLAN.md` — implementation order, verification and evidence gates.

If files conflict, follow this order of authority:

`GOAL.md` → `FEATURESPEC.md` → `DESIGN-GUIDELINES.md` → `PLAN.md`.

## Product

OneContext is a lightweight AI-powered omnichannel CRM for small customer-facing teams.

It unifies customer interactions from four MVP channels:

- Web;
- WhatsApp simulation;
- Email logging;
- Phone customer-service notes.

The primary workflow is:

Google login → customer list → customer workspace → four-channel events → unified timeline → OneContext AI insight → user-confirmed follow-up.

## Required stack

- Frontend: React + Vite + TypeScript.
- Routing: react-router-dom.
- Database/Auth: Supabase Postgres + Supabase Auth + RLS.
- Hosting: Vercel.
- AI: Google Gemini through a Vercel serverless function.

## Non-negotiable constraints

- Do not use Next.js.
- Do not expose `GEMINI_API_KEY`, Supabase service role keys, or other server secrets to the browser.
- Do not trust a client-supplied `user_id` in server code.
- Enforce data isolation using RLS and `auth.uid() = user_id` policies.
- Any AI-generated recommendation requires explicit user confirmation before it creates a follow-up or changes stored CRM data.
- Do not copy Creatio branding, logo, screenshots, exact UI text, icons or proprietary assets. The supplied image is only a layout and information-architecture reference.
- Do not build real WhatsApp, email ingestion, phone, billing, roles, team workspaces or enterprise features in the MVP.
- Do not invent metrics when there is no stored data.

## Day 1 implementation request

Start with Day 1 only. Do not proactively build Day 2 or Day 3 features.

1. Inspect the repository and report what exists.
2. Read all four project artifacts listed above.
3. Propose a concise Day 1 implementation plan.
4. List exact files you will create or modify before writing code.
5. Implement:
   - React + Vite + TypeScript app foundation;
   - Supabase client module;
   - Google OAuth login through Supabase;
   - protected application shell;
   - customers list with loading, empty, error and success states;
   - create customer form;
   - OneContext customer workspace shell with customer header, lifecycle bar and layout rails;
   - base design tokens following `DESIGN-GUIDELINES.md`.
6. Keep every data operation RLS-compatible.
7. Run `npm run build`.
8. Report the changed files, verification results, blockers and the evidence needed for Day 1.

## Required final report format for each task

Use this format after completing a task:

```text
Status: PASS | REPAIR | BLOCKED

What changed:
- ...

Files changed:
- ...

Verification:
- command/result
- manual check/result

Evidence:
- screenshot path or description

Next smallest task:
- ...

Blockers / decisions needed:
- ...
```

## Definition of done

The project is done only when every criterion in `GOAL.md` has evidence:

- public Vercel URL;
- Google login;
- secure user-specific data;
- customers;
- four channels;
- unified timeline;
- OneContext AI structured insight;
- confirmed follow-up;
- screenshots and walkthrough.
