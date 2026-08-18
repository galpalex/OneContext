import type { Channel } from './types'
import type { IconName } from '../components/ui/Icon'

export interface ChannelMeta {
  value: Channel
  label: string
  icon: IconName
  /** Suffix for the .oc-chan--* modifier class carrying this channel's accent. */
  modifier: string
}

export const CHANNELS: readonly ChannelMeta[] = [
  { value: 'web', label: 'Web', icon: 'globe', modifier: 'web' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'chat', modifier: 'whatsapp' },
  { value: 'email', label: 'Email', icon: 'mail', modifier: 'email' },
  { value: 'phone', label: 'Phone', icon: 'phone', modifier: 'phone' },
] as const

const FALLBACK: ChannelMeta = { value: 'web', label: 'Web', icon: 'globe', modifier: 'web' }

export function channelMeta(value: Channel): ChannelMeta {
  return CHANNELS.find((channel) => channel.value === value) ?? FALLBACK
}

export function isChannel(value: unknown): value is Channel {
  return CHANNELS.some((channel) => channel.value === value)
}

/** Request types a web interaction can carry. Stored in channel_events.type. */
export const WEB_EVENT_TYPES = [
  { value: 'contact_form', label: 'Contact form' },
  { value: 'demo_request', label: 'Demo request' },
  { value: 'pricing_enquiry', label: 'Pricing enquiry' },
  { value: 'support_request', label: 'Support request' },
] as const

/**
 * Human label for a stored type value. Falls back to de-slugifying unknown
 * values rather than hiding them, so nothing recorded becomes invisible.
 */
export function eventTypeLabel(type: string | null): string | null {
  if (!type) return null

  const known = WEB_EVENT_TYPES.find((option) => option.value === type)
  if (known) return known.label

  const spaced = type.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * jsonb key holding the main body text for each channel.
 * Email carries a `body`, the conversational channels carry a `message`; the
 * timeline reads whichever is present rather than forcing one name on all.
 */
export function contentKey(channel: Channel): 'message' | 'body' {
  return channel === 'email' ? 'body' : 'message'
}

/** Content keys the timeline may treat as the primary text, in priority order. */
export const PRIMARY_CONTENT_KEYS = ['message', 'body'] as const

export const DIRECTIONS = [
  { value: 'inbound', label: 'Inbound - from the customer' },
  { value: 'outbound', label: 'Outbound - from your team' },
] as const

/** Workflow state for a phone call's agent note. */
export const NOTE_STATUSES = [
  { value: 'pending', label: 'Pending - needs work' },
  { value: 'resolved', label: 'Resolved - nothing outstanding' },
  { value: 'escalated', label: 'Escalated - handed on' },
] as const

/** Call direction, phrased for a phone conversation rather than a message. */
export const CALL_DIRECTIONS = [
  { value: 'inbound', label: 'Inbound - the customer called' },
  { value: 'outbound', label: 'Outbound - we called the customer' },
] as const
