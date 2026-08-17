import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Non-null when local configuration is missing. The app renders an explanatory
 * banner instead of crashing on import, so a fresh clone is diagnosable.
 */
export const supabaseConfigError: string | null =
  !url || !anonKey
    ? 'Supabase is not configured. Copy .env.example to .env.local, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'
    : null

export const isSupabaseConfigured = supabaseConfigError === null

/**
 * Browser client. It carries only the publishable (anon) key, so every request
 * is constrained by Row Level Security. Service-role keys and GEMINI_API_KEY
 * must never appear in this bundle.
 */
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'anon-key-missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

/** Turns an unknown throwable into a message safe to show in the UI. */
export function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'Something went wrong. Please try again.'
}
