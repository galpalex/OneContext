import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface FieldProps {
  id: string
  label: string
  children: ReactNode
  required?: boolean
  hint?: string
  error?: string | null
  className?: string
}

/**
 * Visible label + hint + validation message wired to the control by id.
 * Controls should set aria-describedby={`${id}-hint ${id}-error`} as needed.
 */
export function Field({ id, label, children, required, hint, error, className }: FieldProps) {
  return (
    <div className={['oc-field', className ?? ''].filter(Boolean).join(' ')}>
      <label className="oc-field__label" htmlFor={id}>
        {label}
        {required ? (
          <>
            {' '}
            <span className="oc-field__required" aria-hidden="true">
              *
            </span>
            <span className="oc-visually-hidden">(required)</span>
          </>
        ) : null}
      </label>

      {children}

      {hint ? (
        <span className="oc-field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}

      {error ? (
        <span className="oc-field__error" id={`${id}-error`}>
          <Icon name="alert" size={13} />
          {error}
        </span>
      ) : null}
    </div>
  )
}
