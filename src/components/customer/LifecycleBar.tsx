import type { LifecycleStage } from '../../lib/types'
import { FORWARD_STAGES, stageIndex, stageLabel } from '../../lib/lifecycle'
import { Card } from '../ui/Card'
import { formatDate } from '../../lib/format'

type StepState = 'done' | 'current' | 'future' | 'lost'

const STATE_LABEL: Record<StepState, string> = {
  done: 'Completed',
  current: 'Current stage',
  future: 'Not started',
  lost: 'Current stage - closed lost',
}

/**
 * Read-only lifecycle progression. Status is carried by a text marker and an
 * accessible label as well as colour, so it never depends on colour alone.
 * Editing the stage is deliberately out of the Day 1 slice.
 */
export function LifecycleBar({
  stage,
  stageChangedAt,
}: {
  stage: LifecycleStage
  stageChangedAt: string
}) {
  const isTerminal = stage === 'closed_won' || stage === 'closed_lost'
  const currentIndex = stageIndex(stage)
  const changedOn = formatDate(stageChangedAt)

  function forwardState(index: number): StepState {
    if (isTerminal) return 'done'
    if (index < currentIndex) return 'done'
    if (index === currentIndex) return 'current'
    return 'future'
  }

  const terminalState: StepState =
    stage === 'closed_won' ? 'current' : stage === 'closed_lost' ? 'lost' : 'future'

  const steps: Array<{ key: string; label: string; state: StepState }> = [
    ...FORWARD_STAGES.map((forwardStage, index) => ({
      key: forwardStage.value,
      label: forwardStage.label,
      state: forwardState(index),
    })),
    {
      key: 'terminal',
      label: stage === 'closed_lost' ? 'Closed lost' : 'Closed won',
      state: terminalState,
    },
  ]

  return (
    <Card>
      <ol className="oc-lifecycle" aria-label="Customer lifecycle stage">
        {steps.map((step) => (
          <li
            key={step.key}
            className={[
              'oc-lifecycle__step',
              step.state === 'done' ? 'is-done' : '',
              step.state === 'current' ? 'is-current' : '',
              step.state === 'lost' ? 'is-lost' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={step.state === 'current' || step.state === 'lost' ? 'step' : undefined}
          >
            {step.state === 'done' ? (
              <span className="oc-lifecycle__marker" aria-hidden="true">
                ✓
              </span>
            ) : null}
            <span>{step.label}</span>
            <span className="oc-visually-hidden">({STATE_LABEL[step.state]})</span>
          </li>
        ))}
      </ol>
      <p className="oc-lifecycle__caption">
        Current stage: <strong>{stageLabel(stage)}</strong>
        {changedOn ? ` · set on ${changedOn}` : null} · stage editing arrives with the workspace
        actions in a later iteration.
      </p>
    </Card>
  )
}
