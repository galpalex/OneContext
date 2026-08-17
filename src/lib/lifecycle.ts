import type { LifecycleStage } from './types'

export interface LifecycleStageMeta {
  value: LifecycleStage
  label: string
  /** Terminal stages sit outside the forward progression. */
  terminal: boolean
}

export const LIFECYCLE_STAGES: readonly LifecycleStageMeta[] = [
  { value: 'new_lead', label: 'New lead', terminal: false },
  { value: 'qualification', label: 'Qualification', terminal: false },
  { value: 'presentation', label: 'Presentation', terminal: false },
  { value: 'proposal', label: 'Proposal', terminal: false },
  { value: 'contracting', label: 'Contracting', terminal: false },
  { value: 'closed_won', label: 'Closed won', terminal: true },
  { value: 'closed_lost', label: 'Closed lost', terminal: true },
] as const

/** Stages shown as the progression track, in order. */
export const FORWARD_STAGES: readonly LifecycleStageMeta[] = LIFECYCLE_STAGES.filter(
  (stage) => !stage.terminal,
)

export const DEFAULT_STAGE: LifecycleStage = 'new_lead'

export function stageLabel(value: string): string {
  return LIFECYCLE_STAGES.find((stage) => stage.value === value)?.label ?? 'Unknown stage'
}

export function isLifecycleStage(value: unknown): value is LifecycleStage {
  return LIFECYCLE_STAGES.some((stage) => stage.value === value)
}

/** Position in the forward track; -1 when the stage is terminal. */
export function stageIndex(value: LifecycleStage): number {
  return FORWARD_STAGES.findIndex((stage) => stage.value === value)
}

/** Semantic badge tone for a stage, used for list rows and headers. */
export function stageTone(value: LifecycleStage): 'neutral' | 'primary' | 'positive' | 'critical' {
  if (value === 'closed_won') return 'positive'
  if (value === 'closed_lost') return 'neutral'
  if (value === 'new_lead') return 'neutral'
  return 'primary'
}
