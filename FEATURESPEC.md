# Feature Spec: OneContext

> **OneContext — every customer interaction, one clear next step.**

## Product model

**OneContext** is a lightweight AI-powered omnichannel CRM workspace inspired by modern CRM systems such as Creatio, HubSpot, Freshworks and Zendesk.

OneContext combines:

- contact and lead management;
- a 360-degree customer profile;
- cross-channel interaction history;
- customer-service notes;
- OneContext AI summarization and next-best-action recommendations;
- lightweight workflow follow-up.

## UX direction

The reference visual language is a modern CRM workspace:

- dense but readable information architecture;
- left-side customer identity and account context;
- central workspace with tabs and metrics;
- visible customer lifecycle stage;
- top-level actions such as Save, Next steps, Playbook, Feed and Attachments;
- right-side contextual **OneContext AI** panel;
- color-coded channel icons and status indicators;
- compact cards for KPIs and engagement;
- progressive disclosure: summary first, details below;
- professional blue primary actions, green positive states, orange attention states, neutral gray future states.

Do not copy Creatio branding, logo, exact text or proprietary visual assets. Use the supplied screenshot only as a UX and layout reference.

## Information architecture

### Authenticated shell

- Top bar:
  - OneContext wordmark/logo;
  - current workspace/user;
  - notification placeholder;
  - profile menu;
  - sign out.
- Left navigation:
  - Customers;
  - Inbox / Events;
  - Follow-ups;
  - Analytics (MVP placeholder or simple overview);
  - Settings (minimal).

### Customer list

Route: `/customers`

- Page title: Customers.
- Primary CTA: Create customer.
- Search by name/email/phone.
- Filter by tag, last channel, status.
- Table or cards containing:
  - customer name;
  - company/account;
  - lifecycle stage;
  - last interaction;
  - channel badges;
  - open follow-up indicator.

States:

- Loading: skeleton rows.
- Empty: explain OneContext value and offer Create customer.
- Error: retry action.
- Success: searchable customer list.

### OneContext customer workspace

Route: `/customers/:id`

#### Header

- Back to customers.
- Customer name and account.
- Avatar/initials.
- Tags such as `AI`, `Hot lead`, `Webinar`.
- Contact methods: phone, WhatsApp, email, web.
- Primary actions: Save, Add event, Generate insight.

#### Lifecycle stage bar

Stages:

- New lead;
- Qualification;
- Presentation;
- Proposal;
- Contracting;
- Closed won/lost.

The user can update the stage manually. The MVP does not infer or change it automatically.

#### Main tabs

- Overview;
- Activity;
- Customer needs;
- History;
- Notes.

MVP may implement Overview and Activity fully and render the others as intentional placeholders.

#### Overview cards

- Days in funnel.
- Days at current stage.
- Number of interactions.
- Open follow-ups.
- Last contact date.
- Active channels.

Metrics must be deterministic and calculated from stored events.

#### Customer context

- Account/company.
- Job title.
- Customer need.
- Communication preferences.
- Tags.
- Assigned owner placeholder.

#### Engagement section

- Event counts by channel.
- Last web visit / last contact if available.
- Email interaction count if available.
- Simple activity trend based on event timestamps.

Avoid fake precision. If data is unavailable, show `Not available` rather than invented numbers.

#### Activity timeline

A chronological feed combining:

- Web requests;
- WhatsApp messages;
- Emails;
- Phone notes;
- Agent notes;
- Follow-up actions.

Each event displays:

- channel icon;
- event type;
- direction when relevant;
- timestamp;
- subject or summary;
- expandable content;
- source label.

#### Next steps

A dedicated action area that shows:

- OneContext AI recommended next action;
- owner;
- due date if set;
- status: pending/resolved/escalated;
- button to convert recommendation into a follow-up task.

OneContext AI may recommend; the user confirms and creates the action.

#### Right-side OneContext AI assistant

Persistent contextual panel on desktop; collapsible on smaller screens.

Elements:

- assistant header: `OneContext AI`;
- context line: `Based on customer history`;
- suggested prompts:
  - `Summarize customer history`;
  - `What are the current risks?`;
  - `What should I do next?`;
- conversation/result area;
- answer card;
- action buttons such as `Create follow-up` and `Add note`.

The AI panel must make clear that the answer is based on stored OneContext CRM events.

## Four channels

### Web

Fields:

- customer;
- subject;
- message;
- type.

Creates `channel_events.channel = web`.

### WhatsApp

MVP simulation only.

Fields:

- customer;
- direction;
- message.

Each send creates a `channel_events` record with `channel = whatsapp`.

### Email

Fields:

- customer;
- direction;
- subject;
- body.

Creates `channel_events.channel = email`.

### Phone

Customer-service agent records the call.

Fields:

- customer;
- call summary: what the customer wanted;
- outcome;
- status;
- follow-up required.

Creates a phone `channel_event` and an `agent_note`.

## Data model

### customers

- `id uuid primary key`;
- `user_id uuid not null references auth.users(id)`;
- `name text not null`;
- `company text`;
- `email text`;
- `phone text`;
- `job_title text`;
- `lifecycle_stage text default 'new_lead'`;
- `customer_need text`;
- `tags jsonb default '[]'`;
- `created_at timestamptz default now()`.

### channel_events

- `id uuid primary key`;
- `customer_id uuid references customers(id)`;
- `user_id uuid not null references auth.users(id)`;
- `channel text check in (web, whatsapp, email, phone)`;
- `type text`;
- `direction text`;
- `subject text`;
- `content jsonb not null`;
- `occurred_at timestamptz default now()`;
- `created_at timestamptz default now()`.

### agent_notes

- `id uuid primary key`;
- `customer_id uuid references customers(id)`;
- `user_id uuid not null references auth.users(id)`;
- `note text not null`;
- `status text check in (pending, resolved, escalated)`;
- `follow_up_required boolean default false`;
- `created_at timestamptz default now()`.

### ai_insights

- `id uuid primary key`;
- `customer_id uuid references customers(id)`;
- `user_id uuid not null references auth.users(id)`;
- `summary text not null`;
- `topics jsonb not null`;
- `risks jsonb default '[]'`;
- `next_action text not null`;
- `confidence text`;
- `source_event_ids jsonb default '[]'`;
- `created_at timestamptz default now()`.

### follow_ups

- `id uuid primary key`;
- `customer_id uuid references customers(id)`;
- `user_id uuid not null references auth.users(id)`;
- `title text not null`;
- `source text check in (manual, ai_recommendation)`;
- `status text check in (pending, completed, dismissed)`;
- `due_at timestamptz`;
- `created_at timestamptz default now()`.

## OneContext AI contract

### Input

A server-side function receives a customer ID and retrieves only records owned by the authenticated user:

- customer context;
- recent channel events;
- phone notes;
- existing follow-ups.

### Output schema

```json
{
  "summary": "The customer is evaluating the product and cares most about pricing and integration effort.",
  "topics": ["pricing", "integration"],
  "risks": ["No follow-up has been scheduled after the phone call."],
  "next_action": "Send the integration overview and schedule a follow-up call.",
  "confidence": "medium",
  "source_event_ids": ["event-id-1", "event-id-2"]
}
```

Rules:

- OneContext AI must not invent events, contact details or outcomes.
- OneContext AI must distinguish observed facts from recommendations.
- `source_event_ids` must refer to supplied events.
- Response must be validated before rendering.
- If OneContext AI fails, preserve CRM data and show a retry state.
- Creating a follow-up requires explicit user confirmation.

## Security

- Enable RLS on every user-owned table.
- Policies use `auth.uid() = user_id`.
- Never expose Gemini API keys in Vite client code.
- The Vercel function verifies the Supabase user before reading data.
- Do not trust a client-supplied `user_id`.

## Acceptance criteria

- Google login works.
- Customer data is isolated by authenticated user.
- OneContext customer workspace resembles a professional CRM workspace without copying the reference product.
- All four channels create real database records.
- Timeline merges and sorts events correctly.
- Metrics are derived from real stored records.
- OneContext AI result is structured, source-aware and actionable.
- User can explicitly create a follow-up from an AI recommendation.
- Loading, empty, error and success states are implemented.
- Application builds and deploys on Vercel.