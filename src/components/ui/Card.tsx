import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Renders as <section> with an accessible label when a title id is supplied. */
  labelledBy?: string
}

export function Card({ children, className, labelledBy }: CardProps) {
  return (
    <section
      className={['oc-card', className ?? ''].filter(Boolean).join(' ')}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  )
}

interface CardHeaderProps {
  title: ReactNode
  titleId?: string
  icon?: ReactNode
  actions?: ReactNode
}

export function CardHeader({ title, titleId, icon, actions }: CardHeaderProps) {
  return (
    <header className="oc-card__header">
      <h2 className="oc-card__title" id={titleId}>
        {icon}
        {title}
      </h2>
      {actions ? <div className="oc-row">{actions}</div> : null}
    </header>
  )
}

interface CardBodyProps {
  children: ReactNode
  /** `tight` reduces padding, `flush` removes it (tables, lists). */
  padding?: 'default' | 'tight' | 'flush'
  className?: string
}

export function CardBody({ children, padding = 'default', className }: CardBodyProps) {
  const paddingClass =
    padding === 'tight' ? 'oc-card__body--tight' : padding === 'flush' ? 'oc-card__body--flush' : ''

  return (
    <div className={['oc-card__body', paddingClass, className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
