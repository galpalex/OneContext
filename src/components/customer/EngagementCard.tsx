import type { ChannelEvent } from '../../lib/types'
import { CHANNELS } from '../../lib/channels'
import { dailyActivity, deriveMetrics } from '../../lib/metrics'
import { formatDateTime, pluralize } from '../../lib/format'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Icon } from '../ui/Icon'

const TREND_DAYS = 14

/**
 * Engagement counts and a trailing activity trend, both derived from stored
 * events. With nothing stored the card says so instead of drawing an empty chart
 * that implies a measurement of zero activity.
 */
export function EngagementCard({ events }: { events: ChannelEvent[] }) {
  const metrics = deriveMetrics(events)
  const buckets = dailyActivity(events, TREND_DAYS)
  const peak = buckets.reduce((highest, bucket) => Math.max(highest, bucket.count), 0)

  return (
    <Card labelledBy="engagement-title">
      <CardHeader
        title="Engagement"
        titleId="engagement-title"
        icon={<Icon name="chart" size={16} />}
      />
      <CardBody>
        {metrics.totalInteractions === 0 ? (
          <p className="oc-na">
            <Icon name="info" size={14} />
            Not available - engagement counts are derived from channel events, and none are stored
            for this customer yet.
          </p>
        ) : (
          <div className="oc-stack">
            <div className="oc-engagement__grid">
              {CHANNELS.map((channel) => {
                const count = metrics.countsByChannel[channel.value]
                return (
                  <div className="oc-engagement__stat" key={channel.value}>
                    <span className={`oc-engagement__icon oc-chan--${channel.modifier}`}>
                      <Icon name={channel.icon} size={14} />
                    </span>
                    <div>
                      <p className="oc-engagement__count">{count}</p>
                      <p className="oc-engagement__label">{channel.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <dl className="oc-dl">
              <div className="oc-dl__row">
                <dt className="oc-dl__term">Last contact</dt>
                <dd className="oc-dl__value">
                  {formatDateTime(metrics.lastContactAt) ?? (
                    <span className="oc-na">Not available</span>
                  )}
                </dd>
              </div>
            </dl>

            <div>
              <p className="oc-label">Activity, last {TREND_DAYS} days</p>
              <ul className="oc-trend" aria-label={`Interactions per day over ${TREND_DAYS} days`}>
                {buckets.map((bucket) => (
                  <li className="oc-trend__col" key={bucket.key}>
                    <span
                      className={bucket.count > 0 ? 'oc-trend__bar is-active' : 'oc-trend__bar'}
                      style={{
                        height: peak === 0 ? '2px' : `${Math.max(2, (bucket.count / peak) * 44)}px`,
                      }}
                    />
                    <span className="oc-visually-hidden">
                      {bucket.label}: {bucket.count} {pluralize(bucket.count, 'interaction')}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="oc-trend__axis">
                <span>{buckets[0]?.label}</span>
                <span>{buckets[buckets.length - 1]?.label}</span>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
