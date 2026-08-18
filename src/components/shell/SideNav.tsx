import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

interface NavItem {
  label: string
  icon: IconName
  to?: string
  /** Items without a route are rendered disabled rather than as dead links. */
  note?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Customers', icon: 'users', to: '/customers' },
  // Cross-customer views are deferred work in PLAN.md, not an upcoming slice.
  // The workspace timeline is the unified view; Next steps holds the tasks.
  { label: 'Inbox / Events', icon: 'inbox', note: 'Later' },
  { label: 'Follow-ups', icon: 'tasks', note: 'Later' },
  { label: 'Analytics', icon: 'chart', note: 'Later' },
  { label: 'Settings', icon: 'settings', note: 'Later' },
]

export function SideNav() {
  return (
    <nav className="oc-nav" aria-label="OneContext sections">
      <div>
        <p className="oc-label oc-nav__group-label">Workspace</p>
        <ul className="oc-nav__list">
          {NAV_ITEMS.map((item) =>
            item.to ? (
              <li key={item.label}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'oc-nav__item is-active' : 'oc-nav__item'
                  }
                >
                  <Icon name={item.icon} size={17} />
                  {item.label}
                </NavLink>
              </li>
            ) : (
              <li key={item.label}>
                <span className="oc-nav__item-disabled" aria-disabled="true">
                  <Icon name={item.icon} size={17} />
                  {item.label}
                  <span className="oc-nav__soon">{item.note}</span>
                </span>
              </li>
            ),
          )}
        </ul>
      </div>

      <p className="oc-nav__footer">
        Interactions and follow-ups live inside each customer's workspace.
      </p>
    </nav>
  )
}
