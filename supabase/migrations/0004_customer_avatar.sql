-- ============================================================================
-- OneContext - customer avatar
-- Run in the Supabase SQL Editor after 0003_phone_internal_note.sql.
--
-- Optional image for a customer. The UI falls back to initials when it is null or
-- when the image fails to load, so this is additive: existing customers keep
-- working exactly as before.
--
-- Stores a path or URL rather than image bytes. The demo data points at files
-- committed under public/demo-avatars/, so they are served by the app itself with
-- no external requests and nothing to rate-limit during a walkthrough.
-- ============================================================================

alter table public.customers
  add column if not exists avatar_url text;
