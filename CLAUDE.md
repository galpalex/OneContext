\# OneContext — Project Instructions



Read the project artifacts before creating or modifying application code:



@GOAL.md

@FEATURESPEC.md

@DESIGN-GUIDELINES.md

@PLAN.md

@CLAUDE-CODE-HANDOFF.md



\## Identity



OneContext is an AI-powered omnichannel CRM.



Tagline:

> Every customer interaction, one clear next step.



\## Required stack



\- React + Vite + TypeScript

\- react-router-dom

\- Supabase: Postgres, Auth, RLS

\- Vercel deployment

\- Google Gemini only through a secure Vercel serverless function



\## Critical rules



\- Do not use Next.js.

\- Do not expose Gemini keys or Supabase service-role credentials to the browser.

\- Do not trust client-supplied user\_id in server-side code.

\- Enforce data isolation with Supabase RLS and auth.uid() = user\_id.

\- AI recommendations never create or modify CRM data without explicit user confirmation.

\- The CRM image reference is for layout and information architecture only.

\- Never copy Creatio branding, logo, exact text, icons, assets, or UI verbatim.

\- Implement the smallest vertical slice first.

\- Follow the scope and stop rules in GOAL.md.

\- Run npm run build after meaningful implementation work.

\- Do not mark a task complete without verification evidence.



\## Workflow



1\. Observe repository and read project artifacts.

2\. Propose an implementation plan before broad changes.

3\. List exact files to change before editing.

4\. Implement one small verified task at a time.

5\. Verify with build, tests, manual checks, or screenshots.

6\. Report changed files, verification, evidence, and next task.

