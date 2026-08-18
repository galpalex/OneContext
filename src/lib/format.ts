/** Presentation helpers. Every value here is derived from stored data. */

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)

  if (parts.length === 0) return '?'

  const first = parts[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : ''
  const letters = `${first.charAt(0)}${last.charAt(0)}`

  return letters.toUpperCase() || '?'
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function formatDateTime(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Whole days elapsed since `iso`, or null when the input is unusable. */
export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  const millis = now.getTime() - date.getTime()
  if (millis < 0) return 0

  return Math.floor(millis / 86_400_000)
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}

/** Splits a comma-separated tag field into a de-duplicated, trimmed list. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>()

  for (const candidate of raw.split(',')) {
    const tag = candidate.trim()
    if (tag.length > 0) seen.add(tag)
  }

  return [...seen]
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

/** Turns a stored jsonb key such as `what_customer_wanted` into a readable label. */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').trim()
  if (spaced.length === 0) return key
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
