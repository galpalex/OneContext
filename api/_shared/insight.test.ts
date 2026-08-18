import { describe, expect, it } from 'vitest'
import { validateInsight } from './insight'

const SUPPLIED = ['evt-1', 'evt-2', 'evt-3']

function valid(overrides: Record<string, unknown> = {}) {
  return {
    summary: 'The customer is comparing pricing tiers.',
    topics: ['pricing'],
    risks: ['No follow-up scheduled.'],
    next_action: 'Send the pricing overview.',
    confidence: 'medium',
    source_event_ids: ['evt-1'],
    ...overrides,
  }
}

describe('validateInsight', () => {
  it('accepts a well-formed response', () => {
    const result = validateInsight(valid(), SUPPLIED)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.insight.confidence).toBe('medium')
      expect(result.insight.source_event_ids).toEqual(['evt-1'])
      expect(result.droppedSourceIds).toEqual([])
    }
  })

  it.each([
    ['a string', '"not an object"'],
    ['null', null],
    ['an array', [1, 2]],
    ['a number', 7],
  ])('rejects %s', (_label, input) => {
    expect(validateInsight(input, SUPPLIED).ok).toBe(false)
  })

  it.each([
    ['summary', { summary: '   ' }],
    ['summary of the wrong type', { summary: 42 }],
    ['next_action', { next_action: '' }],
    ['topics', { topics: 'pricing' }],
    ['risks', { risks: null }],
  ])('rejects a response missing usable %s', (_label, overrides) => {
    expect(validateInsight(valid(overrides), SUPPLIED).ok).toBe(false)
  })

  it.each(['certain', 'MEDIUM', '', 5, null])('rejects confidence %s', (confidence) => {
    expect(validateInsight(valid({ confidence }), SUPPLIED).ok).toBe(false)
  })

  it('rejects a missing source_event_ids list', () => {
    const result = validateInsight(valid({ source_event_ids: 'evt-1' }), SUPPLIED)
    expect(result.ok).toBe(false)
  })

  it('keeps cited ids that were supplied and reports the rest', () => {
    // A model can return a well-formed id for an event that does not exist. The
    // schema cannot catch that, so a source reference pointing nowhere must not
    // reach the timeline.
    const result = validateInsight(
      valid({ source_event_ids: ['evt-2', 'evt-does-not-exist', 'evt-3'] }),
      SUPPLIED,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.insight.source_event_ids).toEqual(['evt-2', 'evt-3'])
      expect(result.droppedSourceIds).toEqual(['evt-does-not-exist'])
    }
  })

  it('accepts an empty citation list, which is right when there is no history', () => {
    const result = validateInsight(valid({ source_event_ids: [] }), [])

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.insight.source_event_ids).toEqual([])
  })

  it('drops every cited id when none were supplied', () => {
    const result = validateInsight(valid({ source_event_ids: ['ghost'] }), [])

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.insight.source_event_ids).toEqual([])
      expect(result.droppedSourceIds).toEqual(['ghost'])
    }
  })

  it('de-duplicates ids, topics and risks', () => {
    const result = validateInsight(
      valid({
        source_event_ids: ['evt-1', 'evt-1'],
        topics: ['pricing', 'pricing', ' pricing '],
        risks: ['Same risk', 'Same risk'],
      }),
      SUPPLIED,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.insight.source_event_ids).toEqual(['evt-1'])
      expect(result.insight.topics).toEqual(['pricing'])
      expect(result.insight.risks).toEqual(['Same risk'])
    }
  })

  it('caps a runaway summary and list rather than storing it whole', () => {
    const result = validateInsight(
      valid({
        summary: 'x'.repeat(5000),
        topics: Array.from({ length: 40 }, (_, index) => `topic-${index}`),
      }),
      SUPPLIED,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.insight.summary.length).toBeLessThanOrEqual(1201)
      expect(result.insight.topics).toHaveLength(8)
    }
  })

  it('ignores non-string entries inside otherwise valid lists', () => {
    const result = validateInsight(
      valid({ topics: ['pricing', 5, null, 'integration'], source_event_ids: ['evt-1', 9] }),
      SUPPLIED,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.insight.topics).toEqual(['pricing', 'integration'])
      expect(result.insight.source_event_ids).toEqual(['evt-1'])
    }
  })
})
