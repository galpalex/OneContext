import { useState } from 'react'
import type { FormEvent } from 'react'
import { createCustomer } from '../../data/customers'
import { DEFAULT_STAGE, LIFECYCLE_STAGES } from '../../lib/lifecycle'
import { isValidEmail, parseTags } from '../../lib/format'
import { describeError } from '../../lib/supabase'
import type { Customer, LifecycleStage } from '../../lib/types'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

interface CreateCustomerFormProps {
  onClose: () => void
  onCreated: (customer: Customer) => void
}

interface FormState {
  name: string
  company: string
  email: string
  phone: string
  jobTitle: string
  customerNeed: string
  tags: string
  lifecycleStage: LifecycleStage
}

const EMPTY_FORM: FormState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  jobTitle: '',
  customerNeed: '',
  tags: '',
  lifecycleStage: DEFAULT_STAGE,
}

type FieldErrors = Partial<Record<'name' | 'email', string>>

/** Trimmed value, or null so the column stays NULL rather than an empty string. */
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function CreateCustomerForm({ onClose, onCreated }: CreateCustomerFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (form.name.trim().length === 0) {
      errors.name = 'Enter the customer name.'
    }

    if (form.email.trim().length > 0 && !isValidEmail(form.email)) {
      errors.email = 'Enter a valid email address, or leave the field empty.'
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
      // No user_id is sent: Postgres assigns auth.uid() and RLS re-checks it.
      const customer = await createCustomer({
        name: form.name.trim(),
        company: orNull(form.company),
        email: orNull(form.email),
        phone: orNull(form.phone),
        job_title: orNull(form.jobTitle),
        lifecycle_stage: form.lifecycleStage,
        customer_need: orNull(form.customerNeed),
        tags: parseTags(form.tags),
      })

      onCreated(customer)
    } catch (error) {
      setSubmitError(describeError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Create customer"
      subtitle="Only the name is required. Everything else can be filled in later from the workspace."
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
            form="create-customer-form"
            loading={submitting}
            iconLeft={<Icon name="plus" />}
          >
            {submitting ? 'Creating…' : 'Create customer'}
          </Button>
        </>
      }
    >
      <form id="create-customer-form" onSubmit={handleSubmit} noValidate>
        {submitError ? (
          <div className="oc-banner oc-banner--critical" role="alert" style={{ marginBottom: 'var(--oc-space-4)' }}>
            <Icon name="alert" size={18} />
            <div>
              <p className="oc-banner__title">Customer was not created</p>
              <p>{submitError}</p>
            </div>
          </div>
        ) : null}

        <div className="oc-form-grid">
          <Field id="customer-name" label="Full name" required error={fieldErrors.name}>
            <input
              id="customer-name"
              className="oc-input"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'customer-name-error' : undefined}
              autoComplete="off"
              disabled={submitting}
            />
          </Field>

          <Field id="customer-company" label="Company / account">
            <input
              id="customer-company"
              className="oc-input"
              value={form.company}
              onChange={(event) => update('company', event.target.value)}
              autoComplete="off"
              disabled={submitting}
            />
          </Field>

          <Field id="customer-email" label="Email" error={fieldErrors.email}>
            <input
              id="customer-email"
              type="email"
              className="oc-input"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'customer-email-error' : undefined}
              autoComplete="off"
              disabled={submitting}
            />
          </Field>

          <Field id="customer-phone" label="Phone">
            <input
              id="customer-phone"
              type="tel"
              className="oc-input"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              autoComplete="off"
              disabled={submitting}
            />
          </Field>

          <Field id="customer-job-title" label="Job title">
            <input
              id="customer-job-title"
              className="oc-input"
              value={form.jobTitle}
              onChange={(event) => update('jobTitle', event.target.value)}
              autoComplete="off"
              disabled={submitting}
            />
          </Field>

          <Field id="customer-stage" label="Lifecycle stage">
            <select
              id="customer-stage"
              className="oc-select"
              value={form.lifecycleStage}
              onChange={(event) => update('lifecycleStage', event.target.value as LifecycleStage)}
              disabled={submitting}
            >
              {LIFECYCLE_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="customer-tags"
            label="Tags"
            hint="Comma separated, for example: Hot lead, Webinar"
            className="oc-form-grid__full"
          >
            <input
              id="customer-tags"
              className="oc-input"
              value={form.tags}
              onChange={(event) => update('tags', event.target.value)}
              aria-describedby="customer-tags-hint"
              autoComplete="off"
              disabled={submitting}
            />
          </Field>

          <Field
            id="customer-need"
            label="Customer need"
            hint="What is this customer trying to achieve?"
            className="oc-form-grid__full"
          >
            <textarea
              id="customer-need"
              className="oc-textarea"
              value={form.customerNeed}
              onChange={(event) => update('customerNeed', event.target.value)}
              aria-describedby="customer-need-hint"
              disabled={submitting}
            />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
