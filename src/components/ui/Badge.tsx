import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'primary' | 'positive' | 'attention' | 'critical'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  icon?: ReactNode
  /**
   * Prefix read out by screen readers, so status is never conveyed by colour
   * alone (e.g. "Lifecycle stage: Proposal").
   */
  srPrefix?: string
}

export function Badge({ children, tone = 'neutral', icon, srPrefix }: BadgeProps) {
  return (
    <span className={`oc-badge oc-badge--${tone}`}>
      {icon}
      {srPrefix ? <span className="oc-visually-hidden">{srPrefix}: </span> : null}
      {children}
    </span>
  )
}
