# Day 1 evidence

Screenshots backing the Day 1 verification gate in [PLAN.md](../../../PLAN.md).
Captured 2026-08-17 at ~1910px width.

| File | What it proves |
| --- | --- |
| `1 land on customers and the top bar shows your email.png` | Google sign-in succeeded (account email in the top bar); customers list renders; the four columns that depend on channel events read **Not available**, not `0` |
| `green customer created.png` | Create-customer success state — green confirmation banner, new row present, count updated to 2 customers |
| `customer overview.png` | Customer workspace: three zones, header, lifecycle bar with **New lead** current, `Days in funnel` / `Days at current stage` computed from stored data while the other four KPIs read **Not available**, OneContext AI rail with its disclaimer |
| `rls validation customer not found.png` | Opening another account's customer UUID renders "Customer not found" — RLS blocks cross-account reads |
| `validation customer name.png` | Required-field validation blocks submission with an empty name |
| `email validation.png` | Email format validation rejects `ccc` with an inline message |

Not captured: the customers **empty state**, because the first account already
had a customer by the time screenshots were taken. Reproduce it on a fresh Google
account, or by deleting all rows for the current user.

## Verification already captured without screenshots

Recorded against the live Supabase project on 2026-08-17:

- `npm run build` - passed: `tsc --noEmit` clean, 103 modules, 757 ms.
- Bundle secret scan over `dist/` - no matches for `service_role`, `GEMINI`, `AIza`, `sk-`.
- `/auth/v1/settings` - `external.google = true`.
- All five tables exist with every column from FEATURESPEC, including `stage_changed_at`.
- Anonymous `SELECT` on all five tables - `200 []`: tables exist, no rows visible.
- Anonymous `INSERT` into `customers` - `401 / 42501: new row violates row-level
  security policy`, proving the RLS policies are enforcing and not merely declared.
- Unauthenticated `/customers` in the browser - redirected to `/login`.
