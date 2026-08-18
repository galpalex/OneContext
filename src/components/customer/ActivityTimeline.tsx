import { useId, useState } from 'react'
import type { AgentNote, ChannelEvent, NoteStatus } from '../../lib/types'
import type { TimelineItem } from '../../lib/timeline'
import { distinctNoteText } from '../../lib/timeline'
import { PRIMARY_CONTENT_KEYS, channelMeta, eventTypeLabel } from '../../lib/channels'
import { formatDateTime, humanizeKey } from '../../lib/format'
import { Badge } from '../ui/Badge'
import type { BadgeTone } from '../ui/Badge'
import { Icon } from '../ui/Icon'

/** Messages longer than this are collapsed until the user asks for the rest. */
const COLLAPSE_AT = 240

/**
 * Display order for known content keys.
 * Postgres jsonb does not preserve insertion order - it sorts keys by length -
 * so a phone call would otherwise show its outcome above what the customer
 * wanted. Anything unlisted keeps its natural order after these.
 */
const KEY_ORDER = ['what_the_customer_wanted', 'outcome'] as const

const STATUS_TONE: Record<NoteStatus, BadgeTone> = {
  pending: 'attention',
  resolved: 'positive',
  escalated: 'critical',
}

const STATUS_LABEL: Record<NoteStatus, string> = {
  pending: 'Pending',
  resolved: 'Resolved',
  escalated: 'Escalated',
}

function keyRank(key: string): number {
  const index = KEY_ORDER.indexOf(key as (typeof KEY_ORDER)[number])
  return index === -1 ? KEY_ORDER.length : index
}

/**
 * The main body text and the key it came from. Channels name it differently -
 * email stores a `body`, conversational channels a `message` - so the timeline
 * resolves whichever is present instead of assuming one name. A phone call has
 * neither, and renders as labelled fields instead.
 */
function primaryText(content: Record<string, unknown>): { key: string | null; text: string } {
  for (const key of PRIMARY_CONTENT_KEYS) {
    const value = content[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return { key, text: value.trim() }
    }
  }

  return { key: null, text: '' }
}

/** Remaining scalar content, shown as labelled fields below the body. */
function scalarExtras(
  content: Record<string, unknown>,
  skipKey: string | null,
): Array<[string, string]> {
  const rows: Array<[string, string]> = []

  for (const [key, value] of Object.entries(content)) {
    if (key === skipKey) continue
    if (typeof value === 'string' && value.trim().length > 0) rows.push([key, value.trim()])
    else if (typeof value === 'number') rows.push([key, String(value)])
  }

  return rows.sort(([left], [right]) => keyRank(left) - keyRank(right))
}

function StatusBadges({ note }: { note: AgentNote }) {
  return (
    <>
      <Badge tone={STATUS_TONE[note.status]} srPrefix="Status">
        {STATUS_LABEL[note.status]}
      </Badge>
      {note.follow_up_required ? (
        <Badge tone="attention" icon={<Icon name="tasks" size={12} />}>
          Follow-up required
        </Badge>
      ) : null}
    </>
  )
}

function EventContent({ event }: { event: ChannelEvent }) {
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()

  const primary = primaryText(event.content)
  const message = primary.text
  const extras = scalarExtras(event.content, primary.key)

  if (message.length === 0 && extras.length === 0) {
    return <p className="oc-na">No content recorded for this event</p>
  }

  const isLong = message.length > COLLAPSE_AT
  const shown = isLong && !expanded ? `${message.slice(0, COLLAPSE_AT).trimEnd()}…` : message

  return (
    <div className="oc-stack--tight">
      {message.length > 0 ? (
        <>
          <p className="oc-timeline__message" id={bodyId}>
            {shown}
          </p>
          {isLong ? (
            <button
              type="button"
              className="oc-timeline__toggle"
              aria-expanded={expanded}
              aria-controls={bodyId}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? 'Show less' : 'Show full message'}
            </button>
          ) : null}
        </>
      ) : null}

      {extras.length > 0 ? (
        <dl className="oc-timeline__extras">
          {extras.map(([key, value]) => (
            <div className="oc-dl__row" key={key}>
              <dt className="oc-dl__term">{humanizeKey(key)}</dt>
              <dd className="oc-dl__value">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

function EventItem({
  event,
  note,
  internalNote,
  connected,
}: {
  event: ChannelEvent
  note: AgentNote | null
  /** Attached note text, already filtered to what adds information. */
  internalNote: string | null
  connected: boolean
}) {
  const meta = channelMeta(event.channel)
  const type = eventTypeLabel(event.type)
  const occurred = formatDateTime(event.occurred_at)

  return (
    <li className="oc-timeline__item">
      <div className="oc-timeline__rail" aria-hidden="true">
        <span className={`oc-timeline__dot oc-chan--${meta.modifier}`}>
          <Icon name={meta.icon} size={15} />
        </span>
        {connected ? <span className="oc-timeline__line" /> : null}
      </div>

      <div className="oc-timeline__body">
        <div className="oc-timeline__head">
          <span className="oc-timeline__channel">
            <span className="oc-visually-hidden">Channel: </span>
            {meta.label}
          </span>
          {type ? <span className="oc-timeline__type">{type}</span> : null}
          {event.direction ? (
            <Badge
              tone={event.direction === 'inbound' ? 'primary' : 'neutral'}
              srPrefix="Direction"
            >
              {event.direction === 'inbound' ? 'Inbound' : 'Outbound'}
            </Badge>
          ) : null}
          {/* A linked note contributes its workflow state to this entry. */}
          {note ? <StatusBadges note={note} /> : null}
          {occurred ? (
            <time className="oc-timeline__time" dateTime={event.occurred_at}>
              {occurred}
            </time>
          ) : (
            <span className="oc-timeline__time oc-na">Time not available</span>
          )}
        </div>

        {event.subject ? <p className="oc-timeline__subject">{event.subject}</p> : null}

        <EventContent event={event} />

        {internalNote ? (
          <div className="oc-internal-note">
            <p className="oc-label">Internal note</p>
            <p className="oc-timeline__message">{internalNote}</p>
          </div>
        ) : null}
      </div>
    </li>
  )
}

function NoteItem({ note, connected }: { note: AgentNote; connected: boolean }) {
  const created = formatDateTime(note.created_at)

  return (
    <li className="oc-timeline__item">
      <div className="oc-timeline__rail" aria-hidden="true">
        <span className="oc-timeline__dot oc-timeline__dot--note">
          <Icon name="tasks" size={15} />
        </span>
        {connected ? <span className="oc-timeline__line" /> : null}
      </div>

      <div className="oc-timeline__body">
        <div className="oc-timeline__head">
          <span className="oc-timeline__channel">
            <span className="oc-visually-hidden">Entry type: </span>
            Agent note
          </span>
          <StatusBadges note={note} />
          {created ? (
            <time className="oc-timeline__time" dateTime={note.created_at}>
              {created}
            </time>
          ) : (
            <span className="oc-timeline__time oc-na">Time not available</span>
          )}
        </div>

        <p className="oc-timeline__message">{note.note}</p>
      </div>
    </li>
  )
}

/**
 * Chronological feed of stored interactions and notes, newest first. Every entry
 * is a real row from channel_events or agent_notes; nothing here is synthesised.
 */
export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="oc-timeline">
      {items.map((item, index) => {
        const connected = index < items.length - 1

        return item.kind === 'event' ? (
          <EventItem
            key={item.id}
            event={item.event}
            note={item.note}
            internalNote={distinctNoteText(item)}
            connected={connected}
          />
        ) : (
          <NoteItem key={item.id} note={item.note} connected={connected} />
        )
      })}
    </ol>
  )
}
