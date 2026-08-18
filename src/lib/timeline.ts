import type { AgentNote, ChannelEvent } from './types'

/**
 * One entry in the unified history.
 *
 * `at` is the sort key: an event sorts by when the interaction happened
 * (`occurred_at`), a standalone note by when it was written (`created_at`).
 */
export type TimelineItem =
  | {
      kind: 'event'
      id: string
      at: string
      event: ChannelEvent
      /** The note produced by this interaction, when there is one. */
      note: AgentNote | null
    }
  | {
      kind: 'note'
      id: string
      at: string
      note: AgentNote
    }

/**
 * Merges channel events and agent notes into one deterministic feed, newest
 * first.
 *
 * Notes carrying a `channel_event_id` are attached to their event rather than
 * listed separately, so a phone call - which writes both rows - appears once,
 * with its status and follow-up flag on the interaction it belongs to. A note
 * whose event is missing from `events` is not dropped: it falls back to being a
 * standalone entry, because silently losing stored records would be worse than
 * showing one twice.
 *
 * Ties are broken by id so the order never depends on input order or on how the
 * database happened to return rows.
 */
export function buildTimeline(events: ChannelEvent[], notes: AgentNote[]): TimelineItem[] {
  const eventIds = new Set(events.map((event) => event.id))

  const attached = new Map<string, AgentNote>()
  const standalone: AgentNote[] = []

  for (const note of notes) {
    if (note.channel_event_id && eventIds.has(note.channel_event_id)) {
      // Keep the earliest note per event, so repeated notes stay deterministic.
      const existing = attached.get(note.channel_event_id)
      if (!existing || note.created_at < existing.created_at) {
        attached.set(note.channel_event_id, note)
      }
    } else {
      standalone.push(note)
    }
  }

  const items: TimelineItem[] = [
    ...events.map((event): TimelineItem => ({
      kind: 'event',
      id: event.id,
      at: event.occurred_at,
      event,
      note: attached.get(event.id) ?? null,
    })),
    ...standalone.map((note): TimelineItem => ({
      kind: 'note',
      id: note.id,
      at: note.created_at,
      note,
    })),
  ]

  return items.sort((left, right) => {
    if (left.at !== right.at) return left.at < right.at ? 1 : -1
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  })
}

/**
 * The attached note's text, or null when it adds nothing.
 *
 * A phone call with no internal note falls back to storing the outcome, so
 * rendering the note text unconditionally would repeat the same sentence twice on
 * one entry. Returning null in that case keeps the entry honest without needing a
 * nullable column.
 */
export function distinctNoteText(item: TimelineItem): string | null {
  if (item.kind !== 'event' || !item.note) return null

  const text = item.note.note.trim()
  if (text.length === 0) return null

  const outcome = item.event.content['outcome']
  if (typeof outcome === 'string' && outcome.trim() === text) return null

  return text
}
