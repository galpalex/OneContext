import type { SVGProps } from 'react'

export type IconName =
  | 'alert'
  | 'arrowLeft'
  | 'bell'
  | 'building'
  | 'calendar'
  | 'chart'
  | 'chat'
  | 'check'
  | 'chevronDown'
  | 'globe'
  | 'inbox'
  | 'info'
  | 'lock'
  | 'mail'
  | 'phone'
  | 'plus'
  | 'refresh'
  | 'search'
  | 'settings'
  | 'signOut'
  | 'sparkle'
  | 'tasks'
  | 'users'
  | 'x'

const PATHS: Record<IconName, string> = {
  alert: 'M12 9v4m0 3.5v.01M10.3 3.9 2.6 17.2A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z',
  arrowLeft: 'M19 12H5m0 0 6-6m-6 6 6 6',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0',
  building:
    'M4 21V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15M15 11h3a2 2 0 0 1 2 2v8M3 21h18M8 8h3M8 12h3M8 16h3',
  calendar: 'M8 3v4m8-4v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  chart: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
  chat: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.1A8.4 8.4 0 0 1 4 12.5 8.4 8.4 0 0 1 12.5 4H13a8.4 8.4 0 0 1 8 7.5Z',
  check: 'M20 6 9 17l-5-5',
  chevronDown: 'm6 9 6 6 6-6',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z',
  inbox:
    'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13a2 2 0 0 1 1.8 1.1l3 6V18a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-5.9l3-6A2 2 0 0 1 5.5 5Z',
  info: 'M12 16v-5m0-3.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',
  mail: 'm3 7 8.2 5.5a1.5 1.5 0 0 0 1.6 0L21 7M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  phone:
    'M15.5 21A13.5 13.5 0 0 1 3 8.5V6a2 2 0 0 1 2-2h2.2a1 1 0 0 1 1 .8l.8 3.2a1 1 0 0 1-.5 1.1l-1.4.8a10 10 0 0 0 5 5l.8-1.4a1 1 0 0 1 1.1-.5l3.2.8a1 1 0 0 1 .8 1V19a2 2 0 0 1-2 2h-.5Z',
  plus: 'M12 5v14M5 12h14',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
  search: 'm21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.3 7L4.2 7a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  signOut: 'M15 17l5-5-5-5m5 5H9M12 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm7 10 .9 2.1L22 16l-2.1.9L19 19l-.9-2.1L16 16l2.1-.9L19 13Z',
  tasks: 'm3 7 2 2 4-4M3 17l2 2 4-4M13 7h8M13 17h8',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  x: 'M18 6 6 18M6 6l12 12',
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  name: IconName
  size?: number
}

/**
 * Decorative by default (aria-hidden). Any icon-only control must supply its own
 * accessible name via aria-label on the surrounding button.
 */
export function Icon({ name, size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
