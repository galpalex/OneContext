import { useCallback, useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { IconButton } from './Button'
import { Icon } from './Icon'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** While true, Escape and backdrop clicks are ignored (submit in flight). */
  busy?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ title, subtitle, onClose, children, footer, busy = false }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const subtitleId = useId()

  const requestClose = useCallback(() => {
    if (!busy) onClose()
  }, [busy, onClose])

  // Move focus in on open, restore it on close, and keep Tab inside the dialog.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current

    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? dialog)?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        requestClose()
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusable.length === 0) return

      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]
      if (!firstEl || !lastEl) return

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault()
        lastEl.focus()
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [requestClose])

  return (
    <div
      className="oc-modal__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <div
        className="oc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="oc-modal__header">
          <div>
            <h2 className="oc-modal__title" id={titleId}>
              {title}
            </h2>
            {subtitle ? (
              <p className="oc-modal__subtitle" id={subtitleId}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <IconButton label="Close dialog" onClick={requestClose} disabled={busy}>
            <Icon name="x" size={18} />
          </IconButton>
        </header>

        <div className="oc-modal__body">{children}</div>

        {footer ? <footer className="oc-modal__footer">{footer}</footer> : null}
      </div>
    </div>
  )
}
