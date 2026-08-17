import type { Customer } from '../../lib/types'
import { daysSince, pluralize } from '../../lib/format'
import { Icon } from '../ui/Icon'

interface Kpi {
  label: string
  /** null means: no stored data supports this metric yet. */
  value: number | string | null
  hint: string
  tone?: 'default' | 'primary' | 'attention'
}

/**
 * Deterministic metrics only.
 *
 * Days in funnel and Days at current stage are computed from customers.created_at
 * and customers.stage_changed_at, which exist today. Everything that would need
 * channel_events / follow_ups reports "Not available" until those rows exist -
 * a zero here would read as a measurement rather than an absence of data.
 */
export function KpiCards({ customer }: { customer: Customer }) {
  const daysInFunnel = daysSince(customer.created_at)
  const daysAtStage = daysSince(customer.stage_changed_at)

  const kpis: Kpi[] = [
    {
      label: 'Days in funnel',
      value: daysInFunnel,
      hint: daysInFunnel === null ? 'No creation date stored' : 'Since the customer was added',
      tone: 'primary',
    },
    {
      label: 'Days at current stage',
      value: daysAtStage,
      hint: daysAtStage === null ? 'No stage timestamp stored' : 'Since the last stage change',
      tone: 'primary',
    },
    {
      label: 'Total interactions',
      value: null,
      hint: 'Needs channel events',
    },
    {
      label: 'Active channels',
      value: null,
      hint: 'Needs channel events',
    },
    {
      label: 'Days since last contact',
      value: null,
      hint: 'Needs channel events',
    },
    {
      label: 'Open follow-ups',
      value: null,
      hint: 'Needs follow-ups',
      tone: 'attention',
    },
  ]

  return (
    <div className="oc-kpi-grid">
      {kpis.map((kpi) => (
        <article className="oc-kpi" key={kpi.label}>
          <h3 className="oc-kpi__label">{kpi.label}</h3>
          {kpi.value === null ? (
            <p className="oc-na">
              <Icon name="info" size={14} />
              Not available
            </p>
          ) : (
            <p
              className={[
                'oc-kpi__value',
                kpi.tone === 'primary' ? 'oc-kpi__value--primary' : '',
                kpi.tone === 'attention' ? 'oc-kpi__value--attention' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {kpi.value}
              {typeof kpi.value === 'number' ? (
                <span className="oc-visually-hidden"> {pluralize(kpi.value, 'day')}</span>
              ) : null}
            </p>
          )}
          <p className="oc-kpi__hint">{kpi.hint}</p>
        </article>
      ))}
    </div>
  )
}
