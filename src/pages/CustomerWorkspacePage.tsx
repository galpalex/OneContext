import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCustomer } from '../data/customers'
import { describeError, isSupabaseConfigured, supabaseConfigError } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import type { Customer } from '../lib/types'
import { CustomerHeader } from '../components/customer/CustomerHeader'
import { LifecycleBar } from '../components/customer/LifecycleBar'
import { KpiCards } from '../components/customer/KpiCards'
import { ContextRail } from '../components/customer/ContextRail'
import { AiRailPlaceholder } from '../components/customer/AiRailPlaceholder'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/states/EmptyState'
import { ErrorState } from '../components/states/ErrorState'
import { SkeletonBlock } from '../components/states/SkeletonRows'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'

type LoadState = 'loading' | 'ready' | 'missing' | 'error'

const TABS = ['Overview', 'Activity', 'Customer needs', 'History', 'Notes'] as const

export function CustomerWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError(supabaseConfigError)
      setState('error')
      return
    }

    if (!id) {
      setState('missing')
      return
    }

    setState('loading')
    setError(null)

    try {
      const record = await getCustomer(id)
      setCustomer(record)
      setState(record ? 'ready' : 'missing')
    } catch (caught) {
      setError(describeError(caught))
      setState('error')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (state === 'loading') {
    return (
      <div className="oc-workspace">
        <p className="oc-visually-hidden" role="status">
          Loading customer workspace…
        </p>
        <div className="oc-workspace__rail">
          <Card>
            <CardBody>
              <SkeletonBlock lines={6} />
            </CardBody>
          </Card>
        </div>
        <div className="oc-workspace__center">
          <Card>
            <CardBody>
              <SkeletonBlock lines={2} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <SkeletonBlock lines={4} />
            </CardBody>
          </Card>
        </div>
        <div className="oc-workspace__ai">
          <Card>
            <CardBody>
              <SkeletonBlock lines={3} />
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <Card>
        <CardBody>
          <ErrorState
            title="This customer could not be loaded"
            message={error ?? 'Unknown error.'}
            onRetry={isSupabaseConfigured ? () => void load() : undefined}
          />
        </CardBody>
      </Card>
    )
  }

  if (state === 'missing' || !customer) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon="lock"
            title="Customer not found"
            body="This customer does not exist, or it belongs to another OneContext account. Row Level Security makes records from other accounts invisible, so both cases look the same here."
            actions={
              <Link className="oc-btn oc-btn--primary" to="/customers">
                <Icon name="arrowLeft" size={15} />
                <span>Back to customers</span>
              </Link>
            }
          />
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="oc-workspace">
      <div className="oc-workspace__full">
        <CustomerHeader customer={customer} />
      </div>

      <div className="oc-workspace__full">
        <LifecycleBar
          stage={customer.lifecycle_stage}
          stageChangedAt={customer.stage_changed_at}
        />
      </div>

      <div className="oc-workspace__rail">
        <ContextRail customer={customer} ownerEmail={user?.email ?? 'Signed-in user'} />
      </div>

      <div className="oc-workspace__center">
        <Card>
          <div className="oc-tabs" role="tablist" aria-label="Customer workspace sections">
            {TABS.map((tab, index) => (
              <button
                key={tab}
                type="button"
                role="tab"
                className={index === 0 ? 'oc-tab is-active' : 'oc-tab'}
                aria-selected={index === 0}
                disabled={index !== 0}
                title={index === 0 ? undefined : 'Available in a later iteration'}
              >
                {tab}
              </button>
            ))}
          </div>
          <CardBody padding="tight">
            <KpiCards customer={customer} />
          </CardBody>
        </Card>

        <Card labelledBy="engagement-title">
          <CardHeader
            title="Engagement"
            titleId="engagement-title"
            icon={<Icon name="chart" size={16} />}
          />
          <CardBody>
            <p className="oc-na">
              <Icon name="info" size={14} />
              Not available - engagement counts are derived from channel events, and none are stored
              for this customer yet.
            </p>
          </CardBody>
        </Card>

        <Card labelledBy="activity-title">
          <CardHeader
            title="Activity timeline"
            titleId="activity-title"
            icon={<Icon name="inbox" size={16} />}
          />
          <CardBody>
            <EmptyState
              icon="inbox"
              title="No interactions recorded yet"
              body="Web requests, WhatsApp messages, emails and phone notes will appear here as one chronological history. Event capture is added in the next iteration."
              actions={
                <Button variant="secondary" disabled title="Available in a later iteration">
                  Add event
                </Button>
              }
              inline
            />
          </CardBody>
        </Card>
      </div>

      <div className="oc-workspace__ai">
        <AiRailPlaceholder />
      </div>
    </div>
  )
}
