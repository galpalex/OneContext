import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

interface EmptyStateProps {
  icon?: IconName
  title: string
  body: ReactNode
  actions?: ReactNode
  inline?: boolean
}

export function EmptyState({ icon = 'users', title, body, actions, inline = false }: EmptyStateProps) {
  return (
    <div className={['oc-state', inline ? 'oc-state--inline' : ''].filter(Boolean).join(' ')}>
      <span className="oc-state__icon">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="oc-state__title">{title}</h3>
      <p className="oc-state__body">{body}</p>
      {actions ? <div className="oc-state__actions">{actions}</div> : null}
    </div>
  )
}
