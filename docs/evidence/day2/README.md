# Day 2 evidence — slice 1 (Web channel)

Screenshots backing the Day 2 gate in [PLAN.md](../../../PLAN.md), captured
2026-08-18. Slice 1 covers the Web channel only; WhatsApp, Email and Phone follow
in later slices.

| File | What it proves |
| --- | --- |
| `add event.png` | The add-event dialog with all four channel tabs. Web is active; WhatsApp, Email and Phone are dashed and disabled rather than pretending to work |
| `event logged.png` | Success state — green "Event logged" banner naming the subject, `Add event` now live in the header, `Total interactions` 1 and `Active channels` 1 |
| `event logged bottom.png` | Timeline entry with channel dot, `WEB` label, request type, Inbound badge, timestamp, subject and message |
| `add event future validation.png` | `08/20/2026` rejected with "This is a history log, so the time cannot be in the future" — a future-dated interaction cannot enter the history |
| `2 events, earlier is at top.png` | Two events sorting newest-first: Aug 18 above a backdated Aug 11. `Total interactions` 2, `Active channels` 1 (Web), `Days since last contact` 0, engagement `Web 2 / WhatsApp 0 / Email 0 / Phone 0`, two bars in the 14-day trend, and the long message collapsed behind `Show full message` |

## The metric rule, working in both directions

`2 events, earlier is at top.png` is the clearest single piece of evidence that
metrics are derived rather than invented:

- `Total interactions` and `Active channels` show **measured** values that moved
  from 1 to 2 as events were added.
- `Open follow-ups` still reads **Not available**, because nothing queries
  `follow_ups` yet — an absent measurement, not a zero.
- `Days since last contact` shows `0` only because an event exists; with no
  events it reads Not available.

## Verification without screenshots

- `npm run build` — passed: `tsc --noEmit` clean, 109 modules, 851 ms.
- `deriveMetrics`, `dailyActivity` and `eventTypeLabel` exercised against the real
  modules through the dev server: empty input yields `0 / [] / null / null`; three
  events across two channels yield total 3, counts `web:2 email:1` and the correct
  max `occurred_at`; the 14-day window keeps every event (sum 3); an unknown type
  value `some_new_type` renders as "Some new type" rather than disappearing.
- `grep` over `src/data/` confirms `user_id` never appears in an insert payload —
  ownership comes from `default auth.uid()` and is re-checked by RLS.

## Still open for Day 2

- WhatsApp, Email and Phone forms.
- Timeline merging `agent_notes` alongside `channel_events`.
- Next steps area and follow-up creation.
- Timeline error state and narrow-screen behaviour, neither observed yet.
