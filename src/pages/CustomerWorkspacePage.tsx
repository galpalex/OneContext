import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCustomer } from '../data/customers'
import { listChannelEvents } from '../data/events'
import { listAgentNotes } from '../data/notes'
import { listFollowUps, setFollowUpStatus } from '../data/followUps'
import { describeError, isSupabaseConfigured, supabaseConfigError } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import type {
  AgentNote,
  ChannelEvent,
  Customer,
  FollowUp,
  FollowUpSource,
  FollowUpStatus,
} from '../lib/types'
import { buildTimeline } from '../lib/timeline'
import { countFlaggedNotes } from '../lib/metrics'
import { CustomerHeader } from '../components/customer/CustomerHeader'
import { LifecycleBar } from '../components/customer/LifecycleBar'
import { KpiCards } from '../components/customer/KpiCards'
import { ContextRail } from '../components/customer/ContextRail'
import { AiPanel } from '../components/customer/AiPanel'
import { ActivityTimeline } from '../components/customer/ActivityTimeline'
import { AddEventDialog } from '../components/customer/AddEventDialog'
import { EngagementCard } from '../components/customer/EngagementCard'
import { NextStepsCard } from '../components/customer/NextStepsCard'
import { CreateFollowUpForm } from '../components/customer/CreateFollowUpForm'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/states/EmptyState'
import { ErrorState } from '../components/states/ErrorState'
import { SkeletonBlock } from '../components/states/SkeletonRows'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'

type LoadState = 'loading' | 'ready' | 'missing' | 'error'
type EventsState = 'loading' | 'ready' | 'error'

const TABS = ['Overview', 'Activity', 'Customer needs', 'History', 'Notes'] as const

export function CustomerWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)

  const [events, setEvents] = useState<ChannelEvent[]>([])
  const [notes, setNotes] = useState<AgentNote[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [eventsState, setEventsState] = useState<EventsState>('loading')
  const [eventsError, setEventsError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [followUpFormOpen, setFollowUpFormOpen] = useState(false)
  const [followUpDraft, setFollowUpDraft] = useState<{ title: string; source: FollowUpSource }>({
    title: '',
    source: 'manual',
  })
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null)
  const [insightRequest, setInsightRequest] = useState<{ id: number; focus: 'summary' } | null>(
    null,
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadCustomer = useCallback(async () => {
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

  /**
   * History loads separately from the customer: a failed query should show a
   * retry inside the timeline card, not blank out the whole workspace. Events and
   * notes are fetched together so the merged timeline never renders half of it.
   */
  const loadHistory = useCallback(async () => {
    if (!id || !isSupabaseConfigured) return

    setEventsState('loading')
    setEventsError(null)

    try {
      const [loadedEvents, loadedNotes, loadedFollowUps] = await Promise.all([
        listChannelEvents(id),
        listAgentNotes(id),
        listFollowUps(id),
      ])
      setEvents(loadedEvents)
      setNotes(loadedNotes)
      setFollowUps(loadedFollowUps)
      setEventsState('ready')
    } catch (caught) {
      setEventsError(describeError(caught))
      setEventsState('error')
    }
  }, [id])

  useEffect(() => {
    void loadCustomer()
  }, [loadCustomer])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const timeline = buildTimeline(events, notes)

  /**
   * Completing or dismissing a follow-up updates the stored row and replaces it in
   * place, so the metric and the list move together without refetching the whole
   * history.
   */
  async function changeFollowUpStatus(followUpId: string, status: FollowUpStatus) {
    setStatusPendingId(followUpId)

    try {
      const updated = await setFollowUpStatus(followUpId, status)
      setFollowUps((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (caught) {
      setEventsError(describeError(caught))
      setEventsState('error')
    } finally {
      setStatusPendingId(null)
    }
  }

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
            onRetry={isSupabaseConfigured ? () => void loadCustomer() : undefined}
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
        <CustomerHeader
          customer={customer}
          onAddEvent={() => setDialogOpen(true)}
          onGenerateInsight={() => {
            setInsightRequest((current) => ({ id: (current?.id ?? 0) + 1, focus: 'summary' }))
            // The rail sits below the content on narrow screens, so bring it into view.
            document.getElementById('onecontext-ai')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }}
        />
      </div>

      {successMessage ? (
        <div className="oc-workspace__full">
          <div className="oc-banner oc-banner--positive" role="status">
            <Icon name="check" size={18} />
            <div>
              <p className="oc-banner__title">Event logged</p>
              <p>{successMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="oc-workspace__full">
        <LifecycleBar stage={customer.lifecycle_stage} stageChangedAt={customer.stage_changed_at} />
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
            <KpiCards
              customer={customer}
              events={events}
              followUps={followUps}
              historyLoaded={eventsState === 'ready'}
            />
          </CardBody>
        </Card>

        <NextStepsCard
          followUps={followUps}
          flaggedNotes={countFlaggedNotes(notes)}
          state={eventsState}
          error={eventsError}
          ownerEmail={user?.email ?? 'Signed-in user'}
          pendingId={statusPendingId}
          onRetry={() => void loadHistory()}
          onCreate={() => {
            setFollowUpDraft({ title: '', source: 'manual' })
            setFollowUpFormOpen(true)
          }}
          onSetStatus={(followUpId, status) => void changeFollowUpStatus(followUpId, status)}
        />

        <EngagementCard events={events} />

        <Card labelledBy="activity-title">
          <CardHeader
            title="Activity timeline"
            titleId="activity-title"
            icon={<Icon name="inbox" size={16} />}
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDialogOpen(true)}
                iconLeft={<Icon name="plus" size={14} />}
              >
                Add event
              </Button>
            }
          />

          {eventsState === 'loading' ? (
            <CardBody>
              <p className="oc-visually-hidden" role="status">
                Loading interactions…
              </p>
              <SkeletonBlock lines={4} />
            </CardBody>
          ) : eventsState === 'error' ? (
            <CardBody>
              <ErrorState
                title="Interactions could not be loaded"
                message={eventsError ?? 'Unknown error.'}
                onRetry={() => void loadHistory()}
                inline
              />
            </CardBody>
          ) : timeline.length === 0 ? (
            <CardBody>
              <EmptyState
                icon="inbox"
                title="No interactions recorded yet"
                body="Log the first interaction, and it will appear here as the start of one chronological history across web, WhatsApp, email and phone."
                actions={
                  <Button
                    variant="primary"
                    onClick={() => setDialogOpen(true)}
                    iconLeft={<Icon name="plus" />}
                  >
                    Add event
                  </Button>
                }
                inline
              />
            </CardBody>
          ) : (
            <CardBody padding="flush">
              <ActivityTimeline items={timeline} />
            </CardBody>
          )}
        </Card>
      </div>

      <div className="oc-workspace__ai" id="onecontext-ai">
        <AiPanel
          customerId={customer.id}
          events={events}
          request={insightRequest}
          onCreateFollowUp={(title) => {
            // The recommendation only pre-fills a form; the user still confirms.
            setFollowUpDraft({ title, source: 'ai_recommendation' })
            setFollowUpFormOpen(true)
          }}
        />
      </div>

      {followUpFormOpen && customer ? (
        <CreateFollowUpForm
          customerId={customer.id}
          customerName={customer.name}
          initialTitle={followUpDraft.title}
          source={followUpDraft.source}
          onClose={() => setFollowUpFormOpen(false)}
          onCreated={(created) => {
            setFollowUpFormOpen(false)
            setFollowUps((current) => [created, ...current])
            setSuccessMessage(`Follow-up "${created.title}" was added to Next steps.`)
          }}
        />
      ) : null}

      {dialogOpen ? (
        <AddEventDialog
          customerId={customer.id}
          customerName={customer.name}
          onClose={() => setDialogOpen(false)}
          onCreated={(created) => {
            setDialogOpen(false)
            setSuccessMessage(
              created.channel === 'phone'
                ? `Phone call and its agent note were added to ${customer.name}'s timeline.`
                : `${created.subject ?? 'Interaction'} was added to ${customer.name}'s timeline.`,
            )
            // Re-read from the server so the timeline and metrics reflect stored
            // truth - a phone call writes two rows, and only the server knows both.
            void loadHistory()
          }}
        />
      ) : null}
    </div>
  )
}
