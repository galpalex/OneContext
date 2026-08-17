import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { initials } from '../../lib/format'
import { BrandMark } from './BrandMark'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/Button'

export function TopBar() {
  const { user, signOut, signOutPending } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement | null>(null)

  const email = user?.email ?? 'Signed in user'
  const displayName =
    typeof user?.user_metadata?.['full_name'] === 'string'
      ? (user.user_metadata['full_name'] as string)
      : email

  // Dismiss the profile menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return

    function onPointerDown(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="oc-topbar">
      <Link to="/customers" className="oc-brand">
        <BrandMark />
        <span>OneContext</span>
      </Link>
      <span className="oc-brand__tagline">Every customer interaction, one clear next step.</span>

      <div className="oc-topbar__spacer" />

      <div className="oc-topbar__right">
        <span className="oc-workspace-chip">
          <Icon name="users" size={14} />
          <span className="oc-visually-hidden">Current workspace:</span>
          <span className="oc-workspace-chip__value">{email}</span>
        </span>

        {/* Placeholder: notifications are not part of the MVP scope. */}
        <IconButton label="Notifications (not available in this version)" disabled>
          <Icon name="bell" size={18} />
        </IconButton>

        <div className="oc-profile" ref={profileRef}>
          <button
            type="button"
            className="oc-profile__trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="oc-avatar" aria-hidden="true">
              {initials(displayName)}
            </span>
            <span className="oc-visually-hidden">Account menu for {email}</span>
            <Icon name="chevronDown" size={14} />
          </button>

          {menuOpen ? (
            <div className="oc-profile__menu" role="menu">
              <div className="oc-profile__identity">
                <p className="oc-profile__email">{email}</p>
                <p className="oc-meta">Signed in with Google</p>
              </div>
              <button
                type="button"
                role="menuitem"
                className="oc-profile__item"
                onClick={() => {
                  setMenuOpen(false)
                  void signOut()
                }}
                disabled={signOutPending}
              >
                {signOutPending ? (
                  <span className="oc-spinner" aria-hidden="true" />
                ) : (
                  <Icon name="signOut" />
                )}
                {signOutPending ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
