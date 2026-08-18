import type { FollowUp, FollowUpStatus } from '../../lib/types'
import { deriveFollowUpMetrics } from '../../lib/metrics'
import { formatDateTime, pluralize } from '../../lib/format'
import { Badge } from '../ui/Badge'
import type { BadgeTone } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState } from '../states/EmptyState'
import { ErrorState } from '../states/ErrorState'
import { SkeletonBlock } from '../states/SkeletonRows'
import { Icon } from '../ui/Icon'

const STATUS_TONE: Record<FollowUpStatus, BadgeTone> = {
  pending: 'attention',
  completed: 'positive',
  dismissed: 'neutral',
}

const STATUS_LABEL: Record<FollowUpStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  dismissed: 'Dismissed',
}

interface NextStepsCardProps {
  followUps: FollowUp[]
  /** Interactions an agent flagged as needing a next step. */
  flaggedNotes: number
  state: 'loading' | 'ready' | 'error'
  error: string | null
  ownerEmail: string
  pendingId: string | null
  onRetry: () => void
  onCreate: () => void
  onSetStatus: (id: string, status: FollowUpStatus) => void
}

/**
 * The action area: what still needs doing for this customer.
 *
 * Day 2 shows follow-ups a human created. The OneContext AI recommendation slot
 * sits here too, stated as not yet connected rather than left invisible, because
 * on Day 3 the recommendation appears in this card and its Create follow-up
 * button writes through exactly the same path a human uses.
 */
export function NextStepsCard({
  followUps,
  flaggedNotes,
  state,
  error,
  ownerEmail,
  pendingId,
  onRetry,
  onCreate,
  onSetStatus,
}: NextStepsCardProps) {
  const metrics = deriveFollowUpMetrics(followUps)
  const open = followUps.filter((followUp) => followUp.status === 'pending')
  const closed = followUps.filter((followUp) => followUp.status !== 'pending')

  return (
    <Card labelledBy="next-steps-title">
      <CardHeader
        title="Next steps"
        titleId="next-steps-title"
        icon={<Icon name="tasks" size={16} />}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={onCreate}
            iconLeft={<Icon name="plus" size={14} />}
          >
            Add follow-up
          </Button>
        }
      />

      {state === 'loading' ? (
        <CardBody>
          <p className="oc-visually-hidden" role="status">
            Loading follow-ups…
          </p>
          <SkeletonBlock lines={3} />
        </CardBody>
      ) : state === 'error' ? (
        <CardBody>
          <ErrorState
            title="Follow-ups could not be loaded"
            message={error ?? 'Unknown error.'}
            onRetry={onRetry}
            inline
          />
        </CardBody>
      ) : followUps.length === 0 ? (
        <CardBody>
          <EmptyState
            icon="tasks"
            title="No follow-ups yet"
            body={
              flaggedNotes > 0
                ? `${flaggedNotes} ${pluralize(flaggedNotes, 'interaction')} in the timeline ${
                    flaggedNotes === 1 ? 'is' : 'are'
                  } flagged as needing a next step. Turning one into a task is a deliberate action, so nothing has been created for you.`
                : 'Record what needs to happen next for this customer. Follow-ups are the only thing here that counts as committed work.'
            }
            actions={
              <Button variant="primary" onClick={onCreate} iconLeft={<Icon name="plus" />}>
                Add follow-up
              </Button>
            }
            inline
          />
        </CardBody>
      ) : (
        <CardBody padding="flush">
          {metrics.overdue > 0 ? (
            <div className="oc-banner oc-banner--attention oc-next-steps__notice" role="status">
              <Icon name="alert" size={16} />
              <p>
                {metrics.overdue} open {pluralize(metrics.overdue, 'follow-up')} past its due date.
              </p>
            </div>
          ) : null}

          <ul className="oc-next-steps">
            {[...open, ...closed].map((followUp) => {
              const due = formatDateTime(followUp.due_at)
              const busy = pendingId === followUp.id
              const isOpen = followUp.status === 'pending'
              const overdue =
                isOpen && followUp.due_at ? new Date(followUp.due_at).getTime() < Date.now() : false

              return (
                <li className="oc-next-step" key={followUp.id}>
                  <div className="oc-next-step__main">
                    <p className="oc-next-step__title">{followUp.title}</p>
                    <div className="oc-row">
                      <Badge tone={STATUS_TONE[followUp.status]} srPrefix="Status">
                        {STATUS_LABEL[followUp.status]}
                      </Badge>
                      {followUp.source === 'ai_recommendation' ? (
                        <Badge tone="primary" icon={<Icon name="sparkle" size={12} />}>
                          From OneContext AI
                        </Badge>
                      ) : null}
                      {due ? (
                        <span className={overdue ? 'oc-next-step__due is-overdue' : 'oc-next-step__due'}>
                          <Icon name="calendar" size={13} />
                          {overdue ? 'Overdue' : 'Due'} {due}
                        </span>
                      ) : (
                        <span className="oc-na">No due date</span>
                      )}
                      <span className="oc-next-step__owner">{ownerEmail}</span>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="oc-next-step__actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busy}
                        onClick={() => onSetStatus(followUp.id, 'completed')}
                        iconLeft={<Icon name="check" size={14} />}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onSetStatus(followUp.id, 'dismissed')}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <div className="oc-next-steps__ai">
            <Icon name="sparkle" size={15} />
            <p>
              OneContext AI will propose a next action here from this customer's stored history. You
              confirm it before anything is created.
            </p>
          </div>
        </CardBody>
      )}
    </Card>
  )
}
