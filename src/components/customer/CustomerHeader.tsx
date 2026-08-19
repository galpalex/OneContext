import { Link } from 'react-router-dom'
import type { Customer } from '../../lib/types'
import { stageLabel, stageTone } from '../../lib/lifecycle'
import { formatDate } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

interface CustomerHeaderProps {
  customer: Customer
  onAddEvent: () => void
  onGenerateInsight: () => void
}

/**
 * Workspace header. Both actions are live: Add event opens the channel dialog, and
 * Generate insight starts a summary in the OneContext AI rail and scrolls to it,
 * which matters on narrow screens where the rail sits below the content.
 */
export function CustomerHeader({
  customer,
  onAddEvent,
  onGenerateInsight,
}: CustomerHeaderProps) {
  const created = formatDate(customer.created_at)

  return (
    <Card>
      <div className="oc-customer-header">
        <div className="oc-customer-header__top">
          <Link className="oc-btn oc-btn--ghost oc-btn--sm" to="/customers">
            <Icon name="arrowLeft" size={15} />
            <span>Customers</span>
          </Link>

          <div className="oc-customer-header__title">
            <h1 className="oc-customer-header__name">{customer.name}</h1>
            {customer.company ? (
              <span className="oc-customer-header__company">{customer.company}</span>
            ) : null}
          </div>

          <div className="oc-customer-header__actions">
            <Button
              variant="secondary"
              onClick={onGenerateInsight}
              iconLeft={<Icon name="sparkle" size={15} />}
            >
              Generate insight
            </Button>
            <Button variant="primary" onClick={onAddEvent} iconLeft={<Icon name="plus" />}>
              Add event
            </Button>
          </div>
        </div>

        <div className="oc-customer-header__meta">
          <Badge tone={stageTone(customer.lifecycle_stage)} srPrefix="Lifecycle stage">
            {stageLabel(customer.lifecycle_stage)}
          </Badge>

          {customer.tags.length > 0 ? (
            <div className="oc-tags">
              {customer.tags.map((tag) => (
                <Badge key={tag} tone="primary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="oc-na">No tags yet</span>
          )}

          <span className="oc-meta" style={{ marginLeft: 'auto' }}>
            {created ? `Added ${created}` : 'Creation date not available'}
          </span>
        </div>
      </div>
    </Card>
  )
}
