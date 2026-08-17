import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

interface ErrorStateProps {
  title?: string
  /** Message from the failed operation. Shown verbatim so problems are diagnosable. */
  message: string
  onRetry?: () => void
  retryPending?: boolean
  inline?: boolean
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryPending = false,
  inline = false,
}: ErrorStateProps) {
  return (
    <div
      className={['oc-state', inline ? 'oc-state--inline' : ''].filter(Boolean).join(' ')}
      role="alert"
    >
      <span className="oc-state__icon oc-state__icon--error">
        <Icon name="alert" size={22} />
      </span>
      <h3 className="oc-state__title">{title}</h3>
      <p className="oc-state__body">{message}</p>
      {onRetry ? (
        <div className="oc-state__actions">
          <Button
            variant="secondary"
            onClick={onRetry}
            loading={retryPending}
            iconLeft={<Icon name="refresh" />}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}
