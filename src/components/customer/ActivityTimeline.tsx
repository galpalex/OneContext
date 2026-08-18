import { useId, useState } from 'react'
import type { ChannelEvent } from '../../lib/types'
import { PRIMARY_CONTENT_KEYS, channelMeta, eventTypeLabel } from '../../lib/channels'
import { formatDateTime, humanizeKey } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Icon } from '../ui/Icon'

/** Messages longer than this are collapsed until the user asks for the rest. */
const COLLAPSE_AT = 240

/**
 * The main body text and the key it came from. Channels name it differently -
 * email stores a `body`, conversational channels a `message` - so the timeline
 * resolves whichever is present instead of assuming one name.
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
    if (typeof value === 'string' && value.trim().length > 0) rows.push([key, value])
    else if (typeof value === 'number') rows.push([key, String(value)])
  }

  return rows
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

/**
 * Chronological feed of stored interactions, newest first. Every entry is a real
 * channel_events row; nothing here is synthesised.
 */
export function ActivityTimeline({ events }: { events: ChannelEvent[] }) {
  return (
    <ol className="oc-timeline">
      {events.map((event, index) => {
        const meta = channelMeta(event.channel)
        const type = eventTypeLabel(event.type)
        const occurred = formatDateTime(event.occurred_at)

        return (
          <li className="oc-timeline__item" key={event.id}>
            <div className="oc-timeline__rail" aria-hidden="true">
              <span className={`oc-timeline__dot oc-chan--${meta.modifier}`}>
                <Icon name={meta.icon} size={15} />
              </span>
              {index < events.length - 1 ? <span className="oc-timeline__line" /> : null}
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
            </div>
          </li>
        )
      })}
    </ol>
  )
}
