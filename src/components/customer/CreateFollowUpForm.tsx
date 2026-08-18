import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFollowUp } from '../../data/followUps'
import { describeError } from '../../lib/supabase'
import type { FollowUp } from '../../lib/types'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

interface CreateFollowUpFormProps {
  customerId: string
  customerName: string
  /** Pre-filled title, e.g. from an accepted AI recommendation. */
  initialTitle?: string
  onClose: () => void
  onCreated: (followUp: FollowUp) => void
}

type FieldErrors = Partial<Record<'title' | 'dueAt', string>>

export function CreateFollowUpForm({
  customerId,
  customerName,
  initialTitle = '',
  onClose,
  onCreated,
}: CreateFollowUpFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [dueAt, setDueAt] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (title.trim().length === 0) {
      errors.title = 'Describe the action someone needs to take.'
    }

    // A due date is optional, but a nonsense one is not.
    if (dueAt.length > 0 && Number.isNaN(new Date(dueAt).getTime())) {
      errors.dueAt = 'Enter a valid date and time, or leave it empty.'
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
      const created = await createFollowUp({
        customer_id: customerId,
        title: title.trim(),
        // Day 2 creates manual follow-ups only; Day 3 adds 'ai_recommendation'
        // after an explicit confirmation.
        source: 'manual',
        due_at: dueAt.length > 0 ? new Date(dueAt).toISOString() : null,
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
      title="Create follow-up"
      subtitle={`A task against ${customerName}. Unlike an interaction, this records what still needs doing.`}
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
            form="create-follow-up-form"
            loading={submitting}
            iconLeft={<Icon name="tasks" />}
          >
            {submitting ? 'Creating…' : 'Create follow-up'}
          </Button>
        </>
      }
    >
      <form id="create-follow-up-form" onSubmit={handleSubmit} noValidate>
        {submitError ? (
          <div className="oc-banner oc-banner--critical oc-mb-4" role="alert">
            <Icon name="alert" size={18} />
            <div>
              <p className="oc-banner__title">Follow-up was not created</p>
              <p>{submitError}</p>
            </div>
          </div>
        ) : null}

        <div className="oc-form-grid">
          <Field
            id="follow-up-title"
            label="Next action"
            required
            hint="Phrase it as the action itself, for example: Send the integration overview."
            error={fieldErrors.title}
            className="oc-form-grid__full"
          >
            <input
              id="follow-up-title"
              className="oc-input"
              value={title}
              onChange={(changed) => setTitle(changed.target.value)}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={
                fieldErrors.title ? 'follow-up-title-error' : 'follow-up-title-hint'
              }
              autoComplete="off"
              disabled={submitting}
            />
          </Field>

          <Field
            id="follow-up-due"
            label="Due"
            hint="Optional. Leave empty if there is no deadline."
            error={fieldErrors.dueAt}
          >
            <input
              id="follow-up-due"
              type="datetime-local"
              className="oc-input"
              value={dueAt}
              onChange={(changed) => setDueAt(changed.target.value)}
              aria-invalid={Boolean(fieldErrors.dueAt)}
              aria-describedby={fieldErrors.dueAt ? 'follow-up-due-error' : 'follow-up-due-hint'}
              disabled={submitting}
            />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
