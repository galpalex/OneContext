import { useState } from 'react'
import { initials } from '../../lib/format'

interface AvatarProps {
  name: string
  /** Optional image. Falls back to initials when absent or unloadable. */
  src?: string | null
  size?: 'md' | 'xl'
}

/**
 * Customer avatar.
 *
 * The initials fallback is not only for missing images: if a stored URL 404s the
 * onError handler drops back to initials, so a broken link degrades to the old
 * behaviour instead of leaving an empty box mid-demo.
 */
export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const className = size === 'xl' ? 'oc-avatar oc-avatar--xl' : 'oc-avatar'

  if (!src || failed) {
    return (
      <span className={className} aria-hidden="true">
        {initials(name)}
      </span>
    )
  }

  return (
    <span className={`${className} oc-avatar--image`}>
      <img src={src} alt="" onError={() => setFailed(true)} loading="lazy" />
    </span>
  )
}
