import { useState } from 'react'
import type { FormEvent } from 'react'
import { createChannelEvent } from '../../data/events'
import { CHANNELS, DIRECTIONS, WEB_EVENT_TYPES, contentKey } from '../../lib/channels'
import { describeError } from '../../lib/supabase'
import type { Channel, ChannelEvent, Direction } from '../../lib/types'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

interface AddEventDialogProps {
  customerId: string
  customerName: string
  onClose: () => void
  onCreated: (event: ChannelEvent) => void
}

/** Channels implemented so far. Phone arrives with its paired agent note. */
const ENABLED: readonly Channel[] = ['web', 'whatsapp', 'email']

/** Per-channel form shape, following the field lists in FEATURESPEC. */
const SHAPE: Record<
  Channel,
  { subject: boolean; type: boolean; direction: boolean; bodyLabel: string; bodyHint: string }
> = {
  web: {
    subject: true,
    type: true,
    // A web request is always initiated by the customer.
    direction: false,
    bodyLabel: 'Message',
    bodyHint: 'What the customer actually wrote.',
  },
  whatsapp: {
    subject: false,
    type: false,
    direction: true,
    bodyLabel: 'Message',
    bodyHint: 'Simulated WhatsApp message. No message is sent to the customer.',
  },
  email: {
    subject: true,
    type: false,
    direction: true,
    bodyLabel: 'Body',
    bodyHint: 'Paste the email body. Logging it here does not send anything.',
  },
  phone: {
    subject: true,
    type: false,
    direction: true,
    bodyLabel: 'Notes',
    bodyHint: '',
  },
}

/** Local datetime string for <input type="datetime-local">. */
function nowLocalInput(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type FieldErrors = Partial<Record<'subject' | 'body' | 'occurredAt', string>>

const DEFAULT_TYPE = WEB_EVENT_TYPES[0].value

/**
 * Logs one interaction on any implemented channel. Every channel writes through
 * the same createChannelEvent path, so ownership is decided by Postgres and RLS
 * rather than by which form was used.
 */
export function AddEventDialog({
  customerId,
  customerName,
  onClose,
  onCreated,
}: AddEventDialogProps) {
  const [channel, setChannel] = useState<Channel>('web')
  const [type, setType] = useState<string>(DEFAULT_TYPE)
  const [direction, setDirection] = useState<Direction>('inbound')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [occurredAt, setOccurredAt] = useState(nowLocalInput())
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const shape = SHAPE[channel]

  function selectChannel(next: Channel) {
    setChannel(next)
    setFieldErrors({})
    setSubmitError(null)
    // Web has no direction choice; leaving a stale "outbound" would be wrong.
    if (next === 'web') setDirection('inbound')
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (shape.subject && subject.trim().length === 0) {
      errors.subject = 'Enter a short subject.'
    }

    if (body.trim().length === 0) {
      errors.body = `Enter the ${shape.bodyLabel.toLowerCase()}.`
    }

    const when = new Date(occurredAt)
    if (Number.isNaN(when.getTime())) {
      errors.occurredAt = 'Enter a valid date and time.'
    } else if (when.getTime() > Date.now() + 60_000) {
      errors.occurredAt = 'This is a history log, so the time cannot be in the future.'
    }

    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)

    try {
      const created = await createChannelEvent({
        customer_id: customerId,
        channel,
        // FEATURESPEC gives `type` to the web channel only; the others are
        // distinguished by direction, so no taxonomy is invented for them.
        type: shape.type ? type : null,
        direction: shape.direction ? direction : 'inbound',
        subject: shape.subject ? subject.trim() : null,
        content: { [contentKey(channel)]: body.trim() },
        occurred_at: new Date(occurredAt).toISOString(),
      })

      onCreated(created)
    } catch (caught) {
      setSubmitError(describeError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Log an interaction"
      subtitle={`Recorded against ${customerName} as a stored event, not a draft.`}
      onClose={onClose}
      busy={submitting}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="add-event-form"
            loading={submitting}
            iconLeft={<Icon name="plus" />}
          >
            {submitting ? 'Saving…' : 'Save event'}
          </Button>
        </>
      }
    >
      <div className="oc-chan-tabs" role="tablist" aria-label="Channel">
        {CHANNELS.map((option) => {
          const enabled = ENABLED.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={option.value === channel}
              disabled={!enabled || submitting}
              className={option.value === channel ? 'oc-chan-tab is-active' : 'oc-chan-tab'}
              title={enabled ? undefined : 'Available in the next slice'}
              onClick={() => selectChannel(option.value)}
            >
              <Icon name={option.icon} size={15} />
              {option.label}
            </button>
          )
        })}
      </div>

      <form id="add-event-form" onSubmit={handleSubmit} noValidate>
        {submitError ? (
          <div className="oc-banner oc-banner--critical oc-mb-4" role="alert">
            <Icon name="alert" size={18} />
            <div>
              <p className="oc-banner__title">Event was not saved</p>
              <p>{submitError}</p>
            </div>
          </div>
        ) : null}

        <div className="oc-form-grid">
          {shape.type ? (
            <Field id="event-type" label="Request type">
              <select
                id="event-type"
                className="oc-select"
                value={type}
                onChange={(changed) => setType(changed.target.value)}
                disabled={submitting}
              >
                {WEB_EVENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {shape.direction ? (
            <Field id="event-direction" label="Direction">
              <select
                id="event-direction"
                className="oc-select"
                value={direction}
                onChange={(changed) => setDirection(changed.target.value as Direction)}
                disabled={submitting}
              >
                {DIRECTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field
            id="event-occurred-at"
            label="Occurred at"
            hint="Defaults to now. Set it earlier to log a past interaction."
            error={fieldErrors.occurredAt}
          >
            <input
              id="event-occurred-at"
              type="datetime-local"
              className="oc-input"
              value={occurredAt}
              onChange={(changed) => setOccurredAt(changed.target.value)}
              aria-invalid={Boolean(fieldErrors.occurredAt)}
              aria-describedby={
                fieldErrors.occurredAt ? 'event-occurred-at-error' : 'event-occurred-at-hint'
              }
              disabled={submitting}
            />
          </Field>

          {shape.subject ? (
            <Field
              id="event-subject"
              label="Subject"
              required
              error={fieldErrors.subject}
              className="oc-form-grid__full"
            >
              <input
                id="event-subject"
                className="oc-input"
                value={subject}
                onChange={(changed) => setSubject(changed.target.value)}
                aria-invalid={Boolean(fieldErrors.subject)}
                aria-describedby={fieldErrors.subject ? 'event-subject-error' : undefined}
                autoComplete="off"
                disabled={submitting}
              />
            </Field>
          ) : null}

          <Field
            id="event-body"
            label={shape.bodyLabel}
            required
            hint={shape.bodyHint}
            error={fieldErrors.body}
            className="oc-form-grid__full"
          >
            <textarea
              id="event-body"
              className="oc-textarea"
              value={body}
              onChange={(changed) => setBody(changed.target.value)}
              aria-invalid={Boolean(fieldErrors.body)}
              aria-describedby={fieldErrors.body ? 'event-body-error' : 'event-body-hint'}
              rows={5}
              disabled={submitting}
            />
          </Field>
        </div>

        {channel === 'web' ? (
          <p className="oc-meta oc-mt-3">
            Web requests are recorded as <strong>inbound</strong>, since the customer initiates them.
          </p>
        ) : (
          <p className="oc-meta oc-mt-3">
            OneContext logs this interaction in your CRM history. It does not send anything to the
            customer.
          </p>
        )}
      </form>
    </Modal>
  )
}
