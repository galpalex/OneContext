import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/** TEMPORARY: isolates whether the Supabase import loads at runtime. */
export default function handler(_request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(200).json({ supabaseImport: typeof createClient })
}
