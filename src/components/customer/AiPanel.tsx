import { useCallback, useEffect, useRef, useState } from 'react'
import type { Confidence, Insight } from '../../../api/_shared/insight'
import { generateInsight, latestInsight } from '../../data/insights'
import { channelMeta } from '../../lib/channels'
import { formatDateTime } from '../../lib/format'
import { describeError, isSupabaseConfigured } from '../../lib/supabase'
import type { ChannelEvent } from '../../lib/types'
import { Badge } from '../ui/Badge'
import type { BadgeTone } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { SkeletonBlock } from '../states/SkeletonRows'

interface AiPanelProps {
  customerId: string
  /** Events already loaded for the timeline, used to resolve source references. */
  events: ChannelEvent[]
  /**
   * Lets the workspace header start a generation. The id changes on each press, so
   * pressing the same button twice re-runs rather than being ignored as unchanged.
   */
  request: number | null
  onCreateFollowUp: (title: string) => void
}

const CONFIDENCE_TONE: Record<Confidence, BadgeTone> = {
  low: 'neutral',
  medium: 'attention',
  high: 'positive',
}

type Status = 'idle' | 'restoring' | 'generating' | 'ready' | 'error'

/**
 * The OneContext AI rail.
 *
 * Everything shown here is produced by the serverless function, which validates
 * the model response before returning it. Two rules from the spec are visible in
 * the markup rather than assumed: the answer is labelled as a suggestion to review,
 * and the recommendation cannot become a task without the user pressing a button.
 */
export function AiPanel({ customerId, events, request, onCreateFollowUp }: AiPanelProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [insight, setInsight] = useState<Insight | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [persisted, setPersisted] = useState(true)
  const [droppedIds, setDroppedIds] = useState<string[]>([])
  const [confidenceCapped, setConfidenceCapped] = useState(false)

  /*
   * A restored insight is held behind a line rather than rendered.
   *
   * Displayed straight away it is indistinguishable from one just generated - same
   * layout, same confidence badge - so an insight predating newer interactions reads
   * as current. Collapsed, the panel states its date and lets the user decide, and a
   * freshly generated insight is never collapsed.
   */
  const [restoredCollapsed, setRestoredCollapsed] = useState(false)

  /*
   * Restoring the last stored insight is a background convenience, so it must
   * never overwrite something the user caused. Once a prompt is pressed this is
   * false and a late-arriving restore is discarded: without it, an in-flight
   * restore resolving after a generation silently replaced the result on screen.
   */
  const restoreRelevant = useRef(true)

  // Show the last stored insight so reopening the workspace is not a blank panel.
  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true
    restoreRelevant.current = true
    setStatus('restoring')

    latestInsight(customerId)
      .then((stored) => {
        if (!active || !restoreRelevant.current) return
        if (stored) {
          setInsight(stored.insight)
          setGeneratedAt(stored.created_at)
          setRestoredCollapsed(true)
          setStatus('ready')
        } else {
          setStatus('idle')
        }
      })
      .catch(() => {
        // A failed restore is not worth an error state; the panel still works.
        if (active && restoreRelevant.current) setStatus('idle')
      })

    return () => {
      active = false
    }
  }, [customerId])

  const run = useCallback(
    async () => {
      // The user has taken over; any pending restore is now stale.
      restoreRelevant.current = false
      setStatus('generating')
      setError(null)
      setDroppedIds([])
      setConfidenceCapped(false)
      setRestoredCollapsed(false)

      try {
        const result = await generateInsight(customerId)
        setInsight(result.insight)
        setGeneratedAt(result.created_at)
        setPersisted(result.persisted)
        setDroppedIds(result.dropped_source_ids ?? [])
        setConfidenceCapped(Boolean(result.confidence_capped))
        setStatus('ready')
      } catch (caught) {
        setError(describeError(caught))
        setStatus('error')
      }
    },
    [customerId],
  )

  // Respond to the header's Generate insight button.
  useEffect(() => {
    if (request && request > 0) void run()
  }, [request, run])

  const generating = status === 'generating'
  const sources = insight
    ? insight.source_event_ids
        .map((id) => events.find((event) => event.id === id))
        .filter((event): event is ChannelEvent => Boolean(event))
    : []

  return (
    <Card className="oc-ai" labelledBy="oc-ai-title">
      <header className="oc-ai__header">
        <span className="oc-ai__mark" aria-hidden="true">
          <Icon name="sparkle" size={17} />
        </span>
        <div>
          <h2 className="oc-ai__title" id="oc-ai-title">
            OneContext AI
          </h2>
          <p className="oc-ai__context">Based on customer history</p>
        </div>
      </header>

      <CardBody padding="tight">
        <div className="oc-stack">
          <Button
            variant="primary"
            block
            loading={generating}
            disabled={!isSupabaseConfigured}
            onClick={() => void run()}
            iconLeft={<Icon name="sparkle" size={14} />}
          >
            {generating ? 'Reading history…' : 'Generate insight'}
          </Button>
          <p className="oc-meta">
            Reads this customer's stored events and notes, then returns a summary, the topics
            raised, any risks, and one recommended action.
          </p>

          {status === 'restoring' ? (
            <p className="oc-meta" role="status">
              Checking for a previous insight…
            </p>
          ) : null}

          {generating ? (
            <div role="status" aria-live="polite" className="oc-stack--tight">
              <p className="oc-meta">
                Reading this customer's stored history… the first request of a session can take
                around 15 seconds.
              </p>
              <SkeletonBlock lines={4} />
            </div>
          ) : null}

          {status === 'error' && error ? (
            <div className="oc-banner oc-banner--critical" role="alert">
              <Icon name="alert" size={16} />
              <div className="oc-stack--tight">
                <p className="oc-banner__title">Insight not generated</p>
                <p>{error}</p>
                <p>Your CRM data was not changed.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void run()}
                  iconLeft={<Icon name="refresh" size={13} />}
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : null}

          {insight && restoredCollapsed && !generating ? (
            <div className="oc-insight__stored">
              <p className="oc-meta">
                An insight from {formatDateTime(generatedAt) ?? 'an earlier session'} is stored.
                It may predate newer interactions.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRestoredCollapsed(false)}
                iconLeft={<Icon name="sparkle" size={13} />}
              >
                Show it
              </Button>
            </div>
          ) : null}

          {insight && !restoredCollapsed && !generating ? (
            <div className="oc-insight">
              <div className="oc-row">
                <Badge tone={CONFIDENCE_TONE[insight.confidence]} srPrefix="Confidence">
                  {insight.confidence} confidence
                </Badge>
                {generatedAt ? (
                  <span className="oc-meta">{formatDateTime(generatedAt)}</span>
                ) : null}
              </div>

              {confidenceCapped ? (
                <p className="oc-insight__capped">
                  <Icon name="info" size={13} />
                  Confidence was limited by how little history is stored for this customer.
                </p>
              ) : null}

              <section className="oc-insight__section">
                <h3 className="oc-label">Summary</h3>
                <p className="oc-insight__text">{insight.summary}</p>
              </section>

              {insight.topics.length > 0 ? (
                <section className="oc-insight__section">
                  <h3 className="oc-label">Topics</h3>
                  <div className="oc-tags">
                    {insight.topics.map((topic) => (
                      <Badge key={topic} tone="primary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="oc-insight__section">
                <h3 className="oc-label">Risks</h3>
                {insight.risks.length > 0 ? (
                  <ul className="oc-insight__list">
                    {insight.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="oc-na">None identified in the stored history.</p>
                )}
              </section>

              <section className="oc-insight__section oc-insight__action">
                <h3 className="oc-label">Recommended next action</h3>
                <p className="oc-insight__text">{insight.next_action}</p>
                <Button
                  variant="primary"
                  size="sm"
                  block
                  onClick={() => onCreateFollowUp(insight.next_action)}
                  iconLeft={<Icon name="tasks" size={14} />}
                >
                  Create follow-up
                </Button>
                <p className="oc-insight__confirm">
                  Opens a form you confirm. Nothing is saved to the CRM until you do.
                </p>
              </section>

              <section className="oc-insight__section">
                <h3 className="oc-label">Based on</h3>
                {sources.length > 0 ? (
                  <ul className="oc-insight__sources">
                    {sources.map((event) => {
                      const meta = channelMeta(event.channel)
                      return (
                        <li key={event.id}>
                          <a className="oc-insight__source" href={`#event-${event.id}`}>
                            <span className={`oc-insight__source-dot oc-chan--${meta.modifier}`}>
                              <Icon name={meta.icon} size={11} />
                            </span>
                            <span className="oc-insight__source-label">
                              {meta.label}
                              {event.subject ? ` · ${event.subject}` : ''}
                            </span>
                            <span className="oc-insight__source-date">
                              {formatDateTime(event.occurred_at)}
                            </span>
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="oc-na">
                    No specific events were cited, so treat this as general guidance.
                  </p>
                )}
              </section>

              {!persisted ? (
                <div className="oc-banner oc-banner--attention">
                  <Icon name="alert" size={15} />
                  <p>This insight was generated but could not be saved, so it will not persist.</p>
                </div>
              ) : null}

              {droppedIds.length > 0 ? (
                <div className="oc-banner oc-banner--attention">
                  <Icon name="alert" size={15} />
                  <p>
                    {droppedIds.length} cited reference did not match a stored event and was
                    discarded.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardBody>

      <p className="oc-ai__disclaimer">
        <Icon name="alert" size={14} />
        AI suggestion - review before applying. OneContext AI never changes CRM data without your
        confirmation.
      </p>
    </Card>
  )
}
