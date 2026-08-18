import type { ChannelEvent, Customer, FollowUp } from '../../lib/types'
import { channelMeta } from '../../lib/channels'
import { deriveFollowUpMetrics, deriveMetrics } from '../../lib/metrics'
import { daysSince, pluralize } from '../../lib/format'
import { Icon } from '../ui/Icon'

interface Kpi {
  label: string
  /** null means no stored data supports this metric - never render it as zero. */
  value: number | string | null
  hint: string
  tone?: 'default' | 'primary' | 'attention'
}

/**
 * Deterministic metrics only.
 *
 * A measured zero and an absent measurement are different things and are shown
 * differently: "Total interactions 0" is a fact once channel_events has been
 * queried, whereas "Days since last contact" has no meaning until at least one
 * event exists.
 *
 * `historyLoaded` guards that distinction. Until the queries return, an empty
 * array is not evidence of zero interactions, so everything derived from history
 * reports Not available rather than briefly flashing a 0 that looks measured.
 */
export function KpiCards({
  customer,
  events,
  followUps,
  historyLoaded,
}: {
  customer: Customer
  events: ChannelEvent[]
  followUps: FollowUp[]
  historyLoaded: boolean
}) {
  const metrics = deriveMetrics(events)
  const followUpMetrics = deriveFollowUpMetrics(followUps)
  const daysInFunnel = daysSince(customer.created_at)
  const daysAtStage = daysSince(customer.stage_changed_at)

  const activeChannelNames = metrics.activeChannels
    .map((channel) => channelMeta(channel).label)
    .join(', ')

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
      value: historyLoaded ? metrics.totalInteractions : null,
      hint: !historyLoaded
        ? 'History not loaded'
        : metrics.totalInteractions === 0
          ? 'No interactions logged yet'
          : `Across ${metrics.activeChannels.length} ${pluralize(
              metrics.activeChannels.length,
              'channel',
            )}`,
    },
    {
      label: 'Active channels',
      value: historyLoaded ? metrics.activeChannels.length : null,
      hint: !historyLoaded
        ? 'History not loaded'
        : activeChannelNames.length > 0
          ? activeChannelNames
          : 'No channel has events yet',
    },
    {
      label: 'Days since last contact',
      value: historyLoaded ? metrics.daysSinceLastContact : null,
      hint: !historyLoaded
        ? 'History not loaded'
        : metrics.daysSinceLastContact === null
          ? 'No contact recorded yet'
          : 'Since the most recent interaction',
    },
    {
      label: 'Open follow-ups',
      value: historyLoaded ? followUpMetrics.open : null,
      hint: !historyLoaded
        ? 'History not loaded'
        : followUpMetrics.overdue > 0
          ? `${followUpMetrics.overdue} past due`
          : followUpMetrics.open === 0
            ? 'Nothing outstanding'
            : 'Awaiting action',
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
            </p>
          )}
          <p className="oc-kpi__hint">{kpi.hint}</p>
        </article>
      ))}
    </div>
  )
}
