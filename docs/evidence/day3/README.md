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

## Thin history and the confirmation gate

| File | What it proves |
| --- | --- |
| `noa summary.png` | Noa Shapira has exactly one stored interaction. The AI describes only that enquiry, cites exactly one source, and identifies a real risk inferred from what is *absent* - "the lead is currently uncontacted". Nothing is invented. Her avatar renders from `avatar_url`, and `Open follow-ups` shows a measured 0 with "Nothing outstanding" |
| `follow up ai noa.png` | The confirmation gate. Pressing Create follow-up opens a form titled "Confirm this task against Noa Shapira", pre-filled with the recommendation and editable. Next steps behind the dialog still reads "No follow-ups yet" - the AI has written nothing. Saving is the user's act |
| `do next maya.png` | The same panel against the richest account |

Two things these screenshots corrected:

**A prediction of mine was wrong.** I expected `low` confidence on a one-event
history; the model returned `high`. That is defensible - the single message is
unambiguous, and the summary makes no claim beyond it - but it means the system
prompt's "too thin to judge" instruction governs *emptiness*, not *thinness*. The
guard that actually matters held: one event supplied, one event cited, nothing
fabricated.

**A real bug, visible in `noa summary.png`.** The summary says the enquiry arrived
on "17 August 2026" while the source chip beside it reads "Aug 18, 2026, 01:44 AM".
The event is stored `2026-08-17T22:44Z`; the model read UTC, the UI rendered
UTC+3, and the two disagreed on screen. Any event between local midnight and 03:00
would do the same. Fixed: the client now sends its IANA timezone and the function
formats every timestamp into it before prompting, with a UTC fallback for an
unusable value. Two tests pin it.

## The confirmation path, closed

| File | What it proves |
| --- | --- |
| `ai follow up noa.png` | The recommendation became a stored task and is labelled **From OneContext AI**. That badge renders only for `source = 'ai_recommendation'`, so the row can only have been written through the confirmation form - the AI never reaches the database itself. `Open follow-ups` moved to 1 with "Awaiting action", and Complete and Dismiss are available |

The same screenshot confirms two later fixes:

- **Confidence is now `low`** for Noa's single interaction, where it previously read
  `high`. Notably there is no "confidence was limited" note, which is correct: the
  tightened prompt returned `low` unprompted, so the deterministic ceiling never had
  to fire. The cap remains as a backstop rather than the mechanism.
- **The dates agree.** The summary says "18 Aug 2026 at 01:44" and Last contact says
  "Aug 18, 2026, 01:44 AM". Before the timezone fix these read 17 and 18.

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
