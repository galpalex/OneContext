import { Link } from 'react-router-dom'
import { EmptyState } from '../components/states/EmptyState'
import { Icon } from '../components/ui/Icon'

export function NotFoundPage() {
  return (
    <div className="oc-fullpage">
      <EmptyState
        icon="search"
        title="Page not found"
        body="That address is not part of OneContext."
        actions={
          <Link className="oc-btn oc-btn--primary" to="/customers">
            <Icon name="arrowLeft" size={15} />
            <span>Go to customers</span>
          </Link>
        }
      />
    </div>
  )
}
