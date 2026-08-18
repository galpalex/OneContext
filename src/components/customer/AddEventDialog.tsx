import { useState } from 'react'
import type { FormEvent } from 'react'
import { createChannelEvent } from '../../data/events'
import { logPhoneInteraction } from '../../data/notes'
import {
  CALL_DIRECTIONS,
  CHANNELS,
  DIRECTIONS,
  NOTE_STATUSES,
  WEB_EVENT_TYPES,
  contentKey,
} from '../../lib/channels'
import { describeError } from '../../lib/supabase'
import type { Channel, ChannelEvent, Direction, NoteStatus } from '../../lib/types'
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
  // Phone does not use this shape: it has its own fields below.
  phone: {
    subject: false,
    type: false,
    direction: true,
    bodyLabel: 'Outcome',
    bodyHint: '',
  },
}

/** Local datetime string for <input type="datetime-local">. */
function nowLocalInput(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface Draft {
  type: string
  direction: Direction
  subject: string
  body: string
  occurredAt: string
  /** Phone only: what the customer wanted, per FEATURESPEC's call summary. */
  wanted: string
  /** Phone only: team-facing note, distinct from the customer-facing outcome. */
  internalNote: string
  status: NoteStatus
  followUpRequired: boolean
}

type FieldErrors = Partial<Record<'subject' | 'body' | 'wanted' | 'occurredAt', string>>

const DEFAULT_TYPE = WEB_EVENT_TYPES[0].value

function emptyDraft(): Draft {
  return {
    type: DEFAULT_TYPE,
    direction: 'inbound',
    subject: '',
    body: '',
    occurredAt: nowLocalInput(),
    wanted: '',
    internalNote: '',
    status: 'pending',
    followUpRequired: false,
  }
}

/**
 * Logs one interaction on any channel.
 *
 * Each channel keeps its own draft, so switching tabs neither carries text from
 * one channel into another nor discards what was typed. Drafts live only while
 * the dialog is open - Cancel discards them.
 *
 * Phone is the one channel that writes two rows: a phone event plus a linked
 * agent note carrying status and the follow-up flag. Both are written by a single
 * Postgres function so they share a transaction.
 */
export function AddEventDialog({
  customerId,
  customerName,
  onClose,
  onCreated,
}: AddEventDialogProps) {
  const [channel, setChannel] = useState<Channel>('web')
  const [drafts, setDrafts] = useState<Record<Channel, Draft>>(() => ({
    web: emptyDraft(),
    whatsapp: emptyDraft(),
    email: emptyDraft(),
    phone: emptyDraft(),
  }))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const shape = SHAPE[channel]
  const draft = drafts[channel]
  const isPhone = channel === 'phone'

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDrafts((current) => ({ ...current, [channel]: { ...current[channel], [key]: value } }))
  }

  function selectChannel(next: Channel) {
    if (next === channel) return

    setChannel(next)
    // Validation messages are transient feedback, not part of the draft.
    setFieldErrors({})
    setSubmitError(null)
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (isPhone) {
      if (draft.wanted.trim().length === 0) {
        errors.wanted = 'Record what the customer wanted from this call.'
      }
      if (draft.body.trim().length === 0) {
        errors.body = 'Record the outcome of the call.'
      }
    } else {
      if (shape.subject && draft.subject.trim().length === 0) {
        errors.subject = 'Enter a short subject.'
      }
      if (draft.body.trim().length === 0) {
        errors.body = `Enter the ${shape.bodyLabel.toLowerCase()}.`
      }
    }

    const when = new Date(draft.occurredAt)
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
      const occurredAt = new Date(draft.occurredAt).toISOString()

      const created = isPhone
        ? await logPhoneInteraction({
            customer_id: customerId,
            direction: draft.direction,
            what_the_customer_wanted: draft.wanted.trim(),
            outcome: draft.body.trim(),
            internal_note: draft.internalNote.trim(),
            status: draft.status,
            follow_up_required: draft.followUpRequired,
            occurred_at: occurredAt,
          })
        : await createChannelEvent({
            customer_id: customerId,
            channel,
            // FEATURESPEC gives `type` to the web channel only; the others are
            // distinguished by direction, so no taxonomy is invented for them.
            type: shape.type ? draft.type : null,
            // Web has no direction control, so it can only ever be inbound.
            direction: shape.direction ? draft.direction : 'inbound',
            subject: shape.subject ? draft.subject.trim() : null,
            content: { [contentKey(channel)]: draft.body.trim() },
            occurred_at: occurredAt,
          })

      onCreated(created)
    } catch (caught) {
      setSubmitError(describeError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const directionOptions = isPhone ? CALL_DIRECTIONS : DIRECTIONS

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
          const other = drafts[option.value]
          const hasDraft =
            other.subject.trim().length > 0 ||
            other.body.trim().length > 0 ||
            other.wanted.trim().length > 0 ||
            other.internalNote.trim().length > 0

          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={option.value === channel}
              disabled={submitting}
              className={option.value === channel ? 'oc-chan-tab is-active' : 'oc-chan-tab'}
              onClick={() => selectChannel(option.value)}
            >
              <Icon name={option.icon} size={15} />
              {option.label}
              {/* Marks a tab holding unsaved input the user can return to. */}
              {hasDraft && option.value !== channel ? (
                <>
                  <span className="oc-chan-tab__dot" aria-hidden="true" />
                  <span className="oc-visually-hidden">(has unsaved input)</span>
                </>
              ) : null}
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
                value={draft.type}
                onChange={(changed) => update('type', changed.target.value)}
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
            <Field id="event-direction" label={isPhone ? 'Call direction' : 'Direction'}>
              <select
                id="event-direction"
                className="oc-select"
                value={draft.direction}
                onChange={(changed) => update('direction', changed.target.value as Direction)}
                disabled={submitting}
              >
                {directionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field
            id="event-occurred-at"
            label={isPhone ? 'Call time' : 'Occurred at'}
            hint="Defaults to now. Set it earlier to log a past interaction."
            error={fieldErrors.occurredAt}
          >
            <input
              id="event-occurred-at"
              type="datetime-local"
              className="oc-input"
              value={draft.occurredAt}
              onChange={(changed) => update('occurredAt', changed.target.value)}
              aria-invalid={Boolean(fieldErrors.occurredAt)}
              aria-describedby={
                fieldErrors.occurredAt ? 'event-occurred-at-error' : 'event-occurred-at-hint'
              }
              disabled={submitting}
            />
          </Field>

          {isPhone ? (
            <Field id="event-status" label="Status">
              <select
                id="event-status"
                className="oc-select"
                value={draft.status}
                onChange={(changed) => update('status', changed.target.value as NoteStatus)}
                disabled={submitting}
              >
                {NOTE_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {shape.subject && !isPhone ? (
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
                value={draft.subject}
                onChange={(changed) => update('subject', changed.target.value)}
                aria-invalid={Boolean(fieldErrors.subject)}
                aria-describedby={fieldErrors.subject ? 'event-subject-error' : undefined}
                autoComplete="off"
                disabled={submitting}
              />
            </Field>
          ) : null}

          {isPhone ? (
            <Field
              id="event-wanted"
              label="What the customer wanted"
              required
              hint="The reason for the call, in the customer's terms."
              error={fieldErrors.wanted}
              className="oc-form-grid__full"
            >
              <textarea
                id="event-wanted"
                className="oc-textarea"
                value={draft.wanted}
                onChange={(changed) => update('wanted', changed.target.value)}
                aria-invalid={Boolean(fieldErrors.wanted)}
                aria-describedby={fieldErrors.wanted ? 'event-wanted-error' : 'event-wanted-hint'}
                rows={3}
                disabled={submitting}
              />
            </Field>
          ) : null}

          <Field
            id="event-body"
            label={isPhone ? 'Outcome' : shape.bodyLabel}
            required
            hint={isPhone ? 'What was agreed or done by the end of the call.' : shape.bodyHint}
            error={fieldErrors.body}
            className="oc-form-grid__full"
          >
            <textarea
              id="event-body"
              className="oc-textarea"
              value={draft.body}
              onChange={(changed) => update('body', changed.target.value)}
              aria-invalid={Boolean(fieldErrors.body)}
              aria-describedby={fieldErrors.body ? 'event-body-error' : 'event-body-hint'}
              rows={isPhone ? 3 : 5}
              disabled={submitting}
            />
          </Field>

          {isPhone ? (
            <Field
              id="event-internal-note"
              label="Internal note"
              hint="Optional. What the team needs to know, as opposed to the outcome you would tell the customer. Left empty, the note falls back to the outcome."
              className="oc-form-grid__full"
            >
              <textarea
                id="event-internal-note"
                className="oc-textarea"
                value={draft.internalNote}
                onChange={(changed) => update('internalNote', changed.target.value)}
                aria-describedby="event-internal-note-hint"
                rows={2}
                disabled={submitting}
              />
            </Field>
          ) : null}

          {isPhone ? (
            <div className="oc-form-grid__full">
              <label className="oc-checkbox" htmlFor="event-follow-up">
                <input
                  id="event-follow-up"
                  type="checkbox"
                  checked={draft.followUpRequired}
                  onChange={(changed) => update('followUpRequired', changed.target.checked)}
                  disabled={submitting}
                />
                <span>
                  <span className="oc-checkbox__label">Follow-up required</span>
                  <span className="oc-field__hint">
                    Flags the note as needing a next step. Creating the follow-up task itself stays a
                    separate, deliberate action.
                  </span>
                </span>
              </label>
            </div>
          ) : null}
        </div>

        {isPhone ? (
          <p className="oc-meta oc-mt-3">
            Saving records a <strong>phone interaction</strong> and a linked{' '}
            <strong>agent note</strong> in one transaction.
          </p>
        ) : channel === 'web' ? (
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
