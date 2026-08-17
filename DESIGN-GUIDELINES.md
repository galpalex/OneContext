# Design Guidelines: OneContext

> **OneContext — every customer interaction, one clear next step.**

## Reference

Use the supplied CRM screenshot as a visual and information-architecture reference. It demonstrates a dense professional customer workspace with:

- a customer identity panel;
- account and contact context;
- visible tags;
- lifecycle stage navigation;
- KPI cards;
- tabs for overview and history;
- engagement metrics;
- next-best offers or next steps;
- a contextual AI assistant panel.

The OneContext implementation must be original. Do not copy Creatio.ai branding, logo, exact text, exact icons or proprietary assets.

## Design goal

Create a OneContext interface that makes a customer-facing team feel informed and ready to act within seconds:

> Context on the left. Evidence in the center. Action on the right.

## Layout

### Desktop

Use a three-zone OneContext workspace:

- **Left context rail: 280–320px**
  - avatar/initials;
  - customer name;
  - company and job title;
  - contact methods;
  - tags;
  - account context;
  - communication preferences.

- **Center workspace: flexible width**
  - page header;
  - lifecycle stage bar;
  - KPI cards;
  - tabs;
  - engagement section;
  - activity timeline;
  - next steps.

- **Right OneContext AI rail: 320–380px**
  - contextual assistant;
  - suggested questions;
  - structured answer;
  - create follow-up action.

On smaller screens, the left and right rails collapse into drawers or sections below the main content.

## Visual language

- Primary color: professional blue for OneContext main actions and active navigation.
- Positive state: green for completed/healthy/on-track information.
- Attention state: orange for open follow-ups, warnings or pending work.
- Critical state: red reserved for errors or urgent risks.
- Neutral state: gray for inactive future stages and secondary metadata.
- Background: light neutral gray or off-white.
- Cards: white surfaces, subtle border, restrained shadow, 12–16px radius.
- Typography: clear sans-serif hierarchy; large numbers for KPIs; compact labels for metadata.
- Avoid excessive gradients, decorative illustrations and oversized marketing copy inside the OneContext application.

## Component guidance

### Header

- Back navigation at far left.
- Customer name is the dominant title.
- Company appears as supporting context.
- Tags are compact pills with readable contrast.
- Primary action is one blue button: `Save` or `Add event`.
- Secondary actions use text buttons or an overflow menu.

### Lifecycle bar

- A horizontal sequence of stages.
- Completed/current stages use blue or green emphasis.
- Future stages use neutral gray.
- Stage names must remain readable at common widths.
- Do not use color alone: include labels and accessible contrast.

### KPI cards

Each card contains:

- short label;
- large value;
- optional trend or explanation;
- semantic color only when useful.

Recommended MVP cards:

- Active channels;
- Total interactions;
- Days since last contact;
- Open follow-ups.

Never display invented numbers. Use empty states when a metric has no data.

### Timeline

- Vertical chronological feed.
- Channel-specific icon and color.
- Date/time is secondary but visible.
- Event title or summary is primary.
- Long content is collapsed by default.
- Phone notes display `What the customer wanted` and `Outcome` as separate fields.

### OneContext AI assistant

The OneContext AI panel should look like an operational tool, not a generic chat toy.

- Header: `OneContext AI`.
- Context line: `Based on customer history`.
- Suggested prompts as compact buttons.
- Answer sections:
  - Summary;
  - Topics;
  - Risks;
  - Recommended next action.
- Source references link back to timeline events.
- Primary action: `Create follow-up`.
- Include a small note: `AI suggestion — review before applying`.

## Interaction states

All major OneContext components must support:

- loading;
- empty;
- error;
- success;
- disabled/submitting.

Examples:

- Login button shows progress during OAuth initiation.
- Customer list has skeleton rows while loading.
- Timeline displays an explanatory empty state.
- OneContext AI panel shows progress while generating.
- Failed AI generation provides a retry button and does not remove previous data.

## Accessibility

- Use semantic headings and landmarks.
- Every icon-only button has an accessible label.
- Maintain keyboard focus visibility.
- Do not rely on color alone to communicate status.
- Form controls have visible labels and validation messages.
- Ensure sufficient color contrast.
- Support responsive layout without horizontal scrolling.

## Design review checklist

- [ ] OneContext customer identity is immediately clear.
- [ ] User can find the next action without searching.
- [ ] Timeline evidence is easier to scan than raw chat logs.
- [ ] OneContext AI recommendation is visually distinct from verified facts.
- [ ] The interface supports empty/error/loading states.
- [ ] The design is original and does not copy Creatio branding.
- [ ] The layout works on desktop and narrow screens.