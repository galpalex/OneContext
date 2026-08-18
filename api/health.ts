import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * TEMPORARY diagnostic. Imports nothing at runtime - the @vercel/node import is
 * types only and is erased - so if this responds while /api/insight returns
 * FUNCTION_INVOCATION_FAILED, the failure is in insight.ts's imports rather than
 * in the platform, the build or the tsconfig.
 *
 * Reports only whether configuration is present, never any value. Delete once the
 * function is working.
 */
export default function handler(_request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(200).json({
    ok: true,
    node: process.version,
    env: {
      supabaseUrl: Boolean(process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL']),
      supabaseAnonKey: Boolean(
        process.env['SUPABASE_ANON_KEY'] ?? process.env['VITE_SUPABASE_ANON_KEY'],
      ),
      geminiKey: Boolean(process.env['GEMINI_API_KEY']),
    },
  })
}
