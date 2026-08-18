import type { Customer } from '../../lib/types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

interface ContactMethod {
  icon: IconName
  label: string
  href: string | null
}

function DetailRow({ term, value }: { term: string; value: string | null }) {
  return (
    <div className="oc-dl__row">
      <dt className="oc-dl__term">{term}</dt>
      <dd className="oc-dl__value">
        {value ?? <span className="oc-na">Not available</span>}
      </dd>
    </div>
  )
}

/** Left rail: who this customer is and how to reach them. */
export function ContextRail({ customer, ownerEmail }: { customer: Customer; ownerEmail: string }) {
  const contactMethods: ContactMethod[] = [
    { icon: 'phone', label: 'Call', href: customer.phone ? `tel:${customer.phone}` : null },
    {
      icon: 'chat',
      label: 'WhatsApp',
      // Channel simulation arrives on Day 2; no external link is fabricated here.
      href: null,
    },
    { icon: 'mail', label: 'Email', href: customer.email ? `mailto:${customer.email}` : null },
    { icon: 'globe', label: 'Web', href: null },
  ]

  return (
    <>
      <Card>
        <div className="oc-identity">
          <Avatar name={customer.name} src={customer.avatar_url} size="xl" />
          <p className="oc-identity__name">{customer.name}</p>
          <p className="oc-identity__sub">
            {customer.job_title ?? 'Job title not recorded'}
            {customer.company ? ` · ${customer.company}` : ''}
          </p>

          <ul className="oc-contact-methods">
            {contactMethods.map((method) =>
              method.href ? (
                <li key={method.label}>
                  <a className="oc-contact-method" href={method.href} aria-label={`${method.label} ${customer.name}`}>
                    <Icon name={method.icon} size={15} />
                  </a>
                </li>
              ) : (
                <li key={method.label}>
                  <span
                    className="oc-contact-method is-empty"
                    aria-label={`${method.label}: not available`}
                    title={`${method.label}: not available`}
                  >
                    <Icon name={method.icon} size={15} />
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>

        <CardBody padding="tight">
          <dl className="oc-dl">
            <DetailRow term="Account / company" value={customer.company} />
            <DetailRow term="Email" value={customer.email} />
            <DetailRow term="Phone" value={customer.phone} />
            <DetailRow term="Customer need" value={customer.customer_need} />
            <DetailRow term="Communication preferences" value={null} />
            <div className="oc-dl__row">
              <dt className="oc-dl__term">Assigned owner</dt>
              <dd className="oc-dl__value">
                {ownerEmail} <span className="oc-meta">(placeholder - single-user MVP)</span>
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card labelledBy="context-tags-title">
        <CardHeader title="Tags" titleId="context-tags-title" />
        <CardBody padding="tight">
          {customer.tags.length > 0 ? (
            <div className="oc-tags">
              {customer.tags.map((tag) => (
                <Badge key={tag} tone="primary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="oc-na">No tags recorded for this customer.</p>
          )}
        </CardBody>
      </Card>
    </>
  )
}
