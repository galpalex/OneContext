import { LIFECYCLE_STAGES } from '../../lib/lifecycle'
import { Icon } from '../ui/Icon'

interface CustomerFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  stage: string
  onStageChange: (value: string) => void
  shown: number
  total: number
}

export function CustomerFilters({
  search,
  onSearchChange,
  stage,
  onStageChange,
  shown,
  total,
}: CustomerFiltersProps) {
  return (
    <div className="oc-filters">
      <div className="oc-search">
        <span className="oc-search__icon">
          <Icon name="search" size={15} />
        </span>
        <label className="oc-visually-hidden" htmlFor="customer-search">
          Search customers by name, email or phone
        </label>
        <input
          id="customer-search"
          type="search"
          className="oc-input"
          placeholder="Search name, email or phone"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div>
        <label className="oc-visually-hidden" htmlFor="customer-stage-filter">
          Filter by lifecycle stage
        </label>
        <select
          id="customer-stage-filter"
          className="oc-select oc-filters__select"
          value={stage}
          onChange={(event) => onStageChange(event.target.value)}
        >
          <option value="all">All lifecycle stages</option>
          {LIFECYCLE_STAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p className="oc-filters__count" aria-live="polite">
        {shown === total ? `${total} customers` : `${shown} of ${total} customers`}
      </p>
    </div>
  )
}
