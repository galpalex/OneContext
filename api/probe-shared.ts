import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateInsight } from '../src/lib/insight'

/**
 * TEMPORARY: isolates whether a relative import reaching outside api/ resolves at
 * runtime. package.json sets "type": "module", so an extensionless specifier must
 * be resolved by the bundler - if it is left as-is, Node's ESM loader cannot find it.
 */
export default function handler(_request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(200).json({ crossDirImport: typeof validateInsight })
}
