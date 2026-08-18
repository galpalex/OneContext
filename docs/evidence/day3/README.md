# Day 3 evidence

Screenshots backing the Day 3 gate in [PLAN.md](../../../PLAN.md), captured
2026-08-19 against the deployed app at https://one-context.vercel.app.

## OneContext AI

| File | What it proves |
| --- | --- |
| `ai suggestion.png` | A full insight from real stored history. The summary cites the 5% discount granted against the 10% requested, the loan, and the internal churn note - all stored records, nothing invented. Topics, two risks, a recommended next action, `high confidence` with a timestamp, and **six** source references listing real events with their channel and date. The Create follow-up button carries the line "Nothing is saved to the CRM until you do", and the panel footer states the review-before-applying rule |
| `ai risks.png` | The same customer asked "What are the current risks?" |
| `do next ai.png` | The same customer asked "What should I do next?" - a tighter summary, one risk rather than two, and only the two phone calls cited rather than all six events. The focus hint changes what the model attends to while the contract stays identical |

The recommendation in `ai suggestion.png` is worth reading closely: "Escalate the
account to the account manager to address the churn risk" is derived from an agent
note reading "sounded ready to churn, loop in the AM". The model is reading
`agent_notes`, not just `channel_events`, and turning a shorthand internal note
into an action.

## A deployment failure worth recording

| File | What it shows |
| --- | --- |
| `error avatars.png` | `Customers could not be loaded - column customers.avatar_url does not exist` |

Cause: code querying `avatar_url` was pushed to `main`, which deploys
automatically, before migration `0004_customer_avatar.sql` had been run. Schema has
to land before code that depends on it.

Two things changed as a result. The migration was run, and
`src/data/customers.ts` now treats `avatar_url` as genuinely optional: a query
hitting `42703 undefined_column` for that column retries without it and falls back
to initials. An optional column can no longer take out the entire customers list,
and code and migrations can now deploy in either order.
