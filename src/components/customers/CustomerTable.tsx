import { Link } from 'react-router-dom'
import type { Customer } from '../../lib/types'
import { stageLabel, stageTone } from '../../lib/lifecycle'
import { formatDate } from '../../lib/format'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { SkeletonRows } from '../states/SkeletonRows'

const COLUMNS = [
  'Customer',
  'Company',
  'Lifecycle stage',
  'Last interaction',
  'Channels',
  'Open follow-ups',
  'Added',
] as const

/**
 * Metric columns that depend on channel_events / follow_ups. Those tables exist
 * but hold no data during the Day 1 slice, so the cells state that plainly
 * instead of showing a zero that could be mistaken for a measurement.
 */
function NotAvailable() {
  return <span className="oc-na">Not available</span>
}

export function CustomerTable({
  customers,
  loading = false,
}: {
  customers: Customer[]
  loading?: boolean
}) {
  return (
    <div className="oc-table-wrap">
      <table className="oc-table">
        <caption className="oc-visually-hidden">
          Customers owned by the signed-in OneContext account
        </caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th scope="col" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows rows={5} columns={COLUMNS.length} />
          ) : (
            customers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <div className="oc-table__primary">
                    <Avatar name={customer.name} src={customer.avatar_url} />
                    <div>
                      <Link className="oc-table__name" to={`/customers/${customer.id}`}>
                        {customer.name}
                      </Link>
                      <div className="oc-table__sub">
                        {customer.job_title ?? customer.email ?? 'No job title recorded'}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{customer.company ?? <NotAvailable />}</td>
                <td>
                  <Badge
                    tone={stageTone(customer.lifecycle_stage)}
                    srPrefix="Lifecycle stage"
                  >
                    {stageLabel(customer.lifecycle_stage)}
                  </Badge>
                </td>
                <td>
                  <NotAvailable />
                </td>
                <td>
                  <NotAvailable />
                </td>
                <td>
                  <NotAvailable />
                </td>
                <td>{formatDate(customer.created_at) ?? <NotAvailable />}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
