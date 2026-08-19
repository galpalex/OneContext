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

/**
 * Below 640px the stylesheet turns each row into a card, which means the column
 * headers are gone and `display: block` has dropped the implicit table roles.
 * `data-label` supplies the missing heading per cell and the explicit roles keep
 * the table readable to assistive technology at every width.
 */
export function CustomerTable({
  customers,
  loading = false,
}: {
  customers: Customer[]
  loading?: boolean
}) {
  return (
    <div className="oc-table-wrap">
      <table className="oc-table" role="table">
        <caption className="oc-visually-hidden">
          Customers owned by the signed-in OneContext account
        </caption>
        <thead role="rowgroup">
          <tr role="row">
            {COLUMNS.map((column) => (
              <th role="columnheader" scope="col" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {loading ? (
            <SkeletonRows rows={5} columns={COLUMNS.length} />
          ) : (
            customers.map((customer) => (
              <tr role="row" key={customer.id}>
                <td role="cell" className="oc-table__cell--primary">
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
                <td role="cell" data-label="Company">
                  {customer.company ?? <NotAvailable />}
                </td>
                <td role="cell" data-label="Lifecycle stage">
                  <Badge
                    tone={stageTone(customer.lifecycle_stage)}
                    srPrefix="Lifecycle stage"
                  >
                    {stageLabel(customer.lifecycle_stage)}
                  </Badge>
                </td>
                <td role="cell" data-label="Last interaction">
                  <NotAvailable />
                </td>
                <td role="cell" data-label="Channels">
                  <NotAvailable />
                </td>
                <td role="cell" data-label="Open follow-ups">
                  <NotAvailable />
                </td>
                <td role="cell" data-label="Added">
                  {formatDate(customer.created_at) ?? <NotAvailable />}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
