import { useState } from 'react'
import type { FormEvent } from 'react'
import { createChannelEvent } from '../../data/events'
import { CHANNELS, WEB_EVENT_TYPES } from '../../lib/channels'
import { describeError } from '../../lib/supabase'
import type { ChannelEvent } from '../../lib/types'
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

/** Local datetime string for <input type="datetime-local">. */
function nowLocalInput(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type FieldErrors = Partial<Record<'subject' | 'message' | 'occurredAt', string>>

const DEFAULT_TYPE = WEB_EVENT_TYPES[0].value

/**
 * Logs one interaction. Web is implemented in this slice; the remaining channels
 * occupy their tabs but are disabled rather than pretending to work.
 */
export function AddEventDialog({
  customerId,
  customerName,
  onClose,
  onCreated,
}: AddEventDialogProps) {
  const [type, setType] = useState<string>(DEFAULT_TYPE)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [occurredAt, setOccurredAt] = useState(nowLocalInput())
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (subject.trim().length === 0) errors.subject = 'Enter a short subject for this request.'
    if (message.trim().length === 0) errors.message = 'Enter what the customer sent.'

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
        channel: 'web',
        type,
        // A web request is always initiated by the customer.
        direction: 'inbound',
        subject: subject.trim(),
        content: { message: message.trim() },
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
        {CHANNELS.map((channel) => (
          <button
            key={channel.value}
            type="button"
            role="tab"
            aria-selected={channel.value === 'web'}
            disabled={channel.value !== 'web'}
            className={channel.value === 'web' ? 'oc-chan-tab is-active' : 'oc-chan-tab'}
            title={channel.value === 'web' ? undefined : 'Available in the next slice'}
          >
            <Icon name={channel.icon} size={15} />
            {channel.label}
          </button>
        ))}
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

          <Field
            id="event-occurred-at"
            label="Occurred at"
            hint="Defaults to now. Set it earlier to log a past request."
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

          <Field
            id="event-message"
            label="Message"
            required
            hint="What the customer actually wrote."
            error={fieldErrors.message}
            className="oc-form-grid__full"
          >
            <textarea
              id="event-message"
              className="oc-textarea"
              value={message}
              onChange={(changed) => setMessage(changed.target.value)}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={fieldErrors.message ? 'event-message-error' : 'event-message-hint'}
              rows={5}
              disabled={submitting}
            />
          </Field>
        </div>

        <p className="oc-meta oc-mt-3">
          Web requests are recorded as <strong>inbound</strong>, since the customer initiates them.
        </p>
      </form>
    </Modal>
  )
}
